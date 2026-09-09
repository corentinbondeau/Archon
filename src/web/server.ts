import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { renderSpecPayload, type SpecApiResponse } from "./specHandler.js";
import {
  createPipelineRunner,
  type PipelineOptions,
  type PipelineProgress,
  type PipelineRunner,
} from "../core/runPipeline.js";
import type { SpecInput, ProjectSpec } from "../core/index.js";
import { buildProjectSpec } from "../core/index.js";
import {
  startDeviceFlow,
  pollDeviceFlow,
  fetchGitHubUser,
  fetchGitHubRepos,
  createGitHubRepo,
  type DeviceFlow,
  type GitHubUser,
} from "./githubAuth.js";

const MAX_BODY_BYTES = 256 * 1024;

export interface WebServerOptions {
  port: number;
  host?: string | undefined;
  /** Répertoire où sont persistées les specs et les runs (défaut : `.archon/web` dans le cwd). */
  workDir?: string | undefined;
  /** Options de pipeline passées au lancement automatique. */
  pipeline?: PipelineOptions | undefined;
  /** Lancer le pipeline automatiquement après soumission du formulaire (défaut : false). */
  autoLaunch?: boolean;
  /** Fabrique du lanceur de pipeline (injectable pour les tests). */
  runnerFactory?: () => PipelineRunner;
  /** Token GitHub préconfiguré (tests/usage headless : saute le device flow). */
  presetToken?: string | undefined;
  /** Nom d'utilisateur GitHub associé au token préconfiguré. */
  presetLogin?: string | undefined;
}

export interface WebServerHandle {
  server: Server;
  port: number;
  close(): Promise<void>;
}

const HTTP = {
  ok: 200,
  created: 201,
  badRequest: 400,
  tooLarge: 413,
  unprocessable: 422,
  notFound: 404,
  methodNotAllowed: 405,
  internal: 500,
};

interface RunEntry {
  progress: PipelineProgress;
  id: string;
}

interface DeviceFlowEntry {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  intervalSec: number;
}

interface GitHubState {
  activeDevice: DeviceFlowEntry | null;
  pending: {
    user?: GitHubUser | undefined;
    token?: string | undefined;
    createdAt: number;
  };
}

function json(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolveVal, reject) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => {
      raw += chunk;
      if (Buffer.byteLength(raw) > MAX_BODY_BYTES) {
        reject(new BodyTooLarge());
      }
    });
    req.on("end", () => resolveVal(raw));
    req.on("error", reject);
  });
}

class BodyTooLarge extends Error {}

/** Chemin du fichier HTML de l'interface (fiable en dev comme en dist). */
function htmlFilePath(): string {
  const here = fileURLToPath(import.meta.url);
  return join(dirname(here), "index.html");
}

function readJson<T = unknown>(body: string): T | null {
  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}

/**
 * Serveur web Archon : formulaire du cahier des charges en français, connexion
 * GitHub (device flow), choix du dépôt cible, puis lancement automatique du
 * pipeline multi-agents avec les tokens Copilot de l'utilisateur (+ commits
 * par étape). La progression est exposée via GET /api/run/:id.
 */
export async function startWebServer(
  options: WebServerOptions,
): Promise<WebServerHandle> {
  const handle = makeWebServer(options);
  await new Promise<void>((resolveVal, reject) => {
    handle.server.once("error", reject);
    handle.server.listen(options.port, options.host ?? "127.0.0.1", () =>
      resolveVal(),
    );
  });
  const address = handle.server.address();
  const port = typeof address === "object" && address ? address.port : options.port;
  return { ...handle, port };
}

/** Construit un serveur (exposé pour les tests avec un port 0). */
export function makeWebServer(
  options: WebServerOptions = { port: 0 },
): Omit<WebServerHandle, "port"> {
  const workDir = resolve(options.workDir ?? join(process.cwd(), ".archon", "web"));
  const runs = new Map<string, RunEntry>();
  const github: GitHubState = {
    activeDevice: null,
    pending:
      options.presetToken !== undefined
        ? {
            token: options.presetToken,
            user:
              options.presetLogin !== undefined
                ? { login: options.presetLogin, id: 0, name: null, avatarUrl: "" }
                : undefined,
            createdAt: Date.now(),
          }
        : { createdAt: 0 },
  };

  const runEntry = (id: string): RunEntry | undefined => runs.get(id);

  /** Résout le token GitHub actif.
   *  En device flow il arrivé via pending ; un token preset (tests/headless)
   *  alimente directement pending, sans device flow actif. */
  function requireToken(): string | null {
    return github.pending?.token ?? null;
  }

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    try {
      // Interface
      if (url.pathname === "/" || url.pathname === "/index.html") {
        const html = await readFile(htmlFilePath(), "utf8");
        res.writeHead(HTTP.ok, { "content-type": "text/html; charset=utf-8" });
        res.end(html);
        return;
      }
      if (url.pathname === "/api/health") {
        json(res, HTTP.ok, { status: "ok" });
        return;
      }

      // --- Authentification GitHub (device flow) ---
      if (url.pathname === "/api/github/device" && req.method === "POST") {
        const flow: DeviceFlow = await startDeviceFlow();
        github.activeDevice = {
          deviceCode: flow.deviceCode,
          userCode: flow.userCode,
          verificationUri: flow.verificationUri,
          intervalSec: flow.intervalSec,
        };
        github.pending = { createdAt: 0 };
        json(res, HTTP.created, {
          userCode: flow.userCode,
          verificationUri: flow.verificationUri,
          intervalSec: flow.intervalSec,
          expiresSec: flow.expiresSec,
        });
        return;
      }
      if (url.pathname === "/api/github/device" && req.method === "GET") {
        if (!github.activeDevice) {
          json(res, HTTP.notFound, { error: "Aucun device flow actif." });
          return;
        }
        const d = github.activeDevice;
        if (github.pending.token) {
          json(res, HTTP.ok, {
            status: "authorized",
            user: github.pending.user ?? null,
          });
          return;
        }
        const poll = await pollDeviceFlow(d.deviceCode);
        if (poll.status === "authorized") {
          const user = await fetchGitHubUser(poll.token).catch(() => undefined);
          github.pending = { user, token: poll.token, createdAt: Date.now() };
          json(res, HTTP.ok, { status: "authorized", user: user ?? null });
          return;
        }
        json(res, HTTP.ok, { status: poll.status });
        return;
      }

      // --- Dépôts GitHub ---
      if (url.pathname === "/api/github/repos" && req.method === "GET") {
        const token = requireToken();
        if (!token) {
          json(res, HTTP.unprocessable, {
            error: "Connectez-vous à GitHub avant de choisir un dépôt cible.",
          });
          return;
        }
        const repos = await fetchGitHubRepos(token);
        json(res, HTTP.ok, { repos });
        return;
      }
      if (url.pathname === "/api/github/repos" && req.method === "POST") {
        const token = requireToken();
        if (!token) {
          json(res, HTTP.unprocessable, {
            error: "Connectez-vous à GitHub avant de créer un dépôt.",
          });
          return;
        }
        const raw = await readBody(req);
        const body = readJson<{ name?: string; private?: boolean }>(raw);
        const name = (body?.name ?? "").trim();
        if (!name) {
          json(res, HTTP.badRequest, { error: "Nom de dépôt manquant." });
          return;
        }
        const repo = await createGitHubRepo(token, name, body?.private ?? false);
        json(res, HTTP.created, { repo });
        return;
      }

      // --- Soumission du formulaire (spécification + lancement) ---
      if (url.pathname === "/api/spec" && (req.method === "POST" || req.method === "OPTIONS")) {
        if (req.method === "OPTIONS") {
          res.writeHead(204);
          res.end();
          return;
        }
        const raw = await readBody(req);
        const input = readJson<SpecInput>(raw);
        if (!input) {
          json(res, HTTP.badRequest, { error: "JSON invalide." });
          return;
        }

        let payload: SpecApiResponse;
        try {
          payload = renderSpecPayload(input);
        } catch (err) {
          json(res, HTTP.unprocessable, {
            error: err instanceof Error ? err.message : String(err),
          });
          return;
        }
        if (!("yaml" in payload)) {
          json(res, HTTP.internal, { error: "Payload inattendu." });
          return;
        }

        const body = readJson<{ github?: string | null; repo?: string }>(raw);
        const token = github.pending?.token ?? null;
        const repo = body?.repo?.trim() || undefined;

        if (!token) {
          json(res, HTTP.unprocessable, {
            error: "Connectez-vous à GitHub puis choisissez un dépôt cible avant de générer.",
          });
          return;
        }
        if (!repo) {
          json(res, HTTP.unprocessable, {
            error: "Renseignez le dépôt GitHub cible pour générer l'application.",
          });
          return;
        }

        const spec: ProjectSpec = buildProjectSpec(input, "formulaire");
        const specPath = join(workDir, "specs", `${spec.name}.yaml`);
        await mkdir(join(workDir, "specs"), { recursive: true });
        await writeFile(specPath, payload.yaml, "utf8");

        if (!options.autoLaunch) {
          json(res, HTTP.created, { status: "spec-only" });
          return;
        }

        const id = randomUUID();
        const runner = (options.runnerFactory ?? createPipelineRunner)();
        const entry: RunEntry = { id, progress: runner.progress() };
        runs.set(id, entry);

        const pipelineCfg: PipelineOptions = {
          ...(options.pipeline ?? {}),
          env: { ...(options.pipeline?.env ?? {}), GITHUB_TOKEN: token },
          repo,
        };
        void runner.start(specPath, pipelineCfg).then((progress) => {
          const current = runEntry(id);
          if (current) current.progress = progress;
        });

        json(res, HTTP.created, {
          runId: id,
          status: "launching",
          repo,
        });
        return;
      }

      // --- Suivi de progression ---
      const runMatch = url.pathname.match(/^\/api\/run\/([^/]+)$/);
      if (runMatch) {
        const entry = runEntry(runMatch[1]);
        if (!entry) {
          json(res, HTTP.notFound, { error: "Run introuvable." });
          return;
        }
        json(res, HTTP.ok, entry.progress);
        return;
      }

      json(res, HTTP.notFound, { error: `Route introuvable : ${url.pathname}` });
    } catch (err) {
      json(res, HTTP.internal, {
        error: `Erreur interne : ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  return {
    server,
    async close(): Promise<void> {
      if (!server.listening) return;
      await new Promise<void>((resolveVal) => server.close(() => resolveVal()));
    },
  };
}

export { htmlFilePath, HTTP };