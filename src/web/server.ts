import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { renderSpecPayload, SPEC_STATUS } from "./specHandler.js";
import type { SpecInput } from "../core/index.js";

const MAX_BODY_BYTES = 256 * 1024;

export interface WebServerOptions {
  port: number;
  host?: string | undefined;
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

function json(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => {
      raw += chunk;
      if (Buffer.byteLength(raw) > MAX_BODY_BYTES) {
        reject(new BodyTooLarge());
      }
    });
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });
}

class BodyTooLarge extends Error {}

/** Chemin du fichier HTML de l'interface (fiable en dev comme en dist). */
function htmlFilePath(): string {
  const here = fileURLToPath(import.meta.url);
  return join(dirname(here), "index.html");
}

async function handleSpecRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method !== "POST") {
    json(res, HTTP.methodNotAllowed, { error: "Méthode non autorisée." });
    return;
  }

  let raw: string;
  try {
    raw = await readBody(req);
  } catch (err) {
    if (err instanceof BodyTooLarge) {
      json(res, HTTP.tooLarge, { error: "Formulaire trop volumineux." });
    } else {
      json(res, HTTP.badRequest, { error: "Corps de requête illisible." });
    }
    return;
  }

  let input: SpecInput;
  try {
    input = JSON.parse(raw) as SpecInput;
  } catch {
    json(res, HTTP.badRequest, { error: "JSON invalide." });
    return;
  }

  try {
    const payload = renderSpecPayload(input);
    json(res, HTTP.created, payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    json(res, HTTP.unprocessable, { error: message });
  }
}

/**
 * Démarre le serveur web Archon : formulaire du cahier des charges + endpoint
 * d'export de la spec YAML validée.
 */
export async function startWebServer(
  options: WebServerOptions,
): Promise<WebServerHandle> {
  const handle = makeWebServer();
  await new Promise<void>((resolve, reject) => {
    handle.server.once("error", reject);
    handle.server.listen(options.port, options.host ?? "127.0.0.1", () =>
      resolve(),
    );
  });

  const address = handle.server.address();
  const port = typeof address === "object" && address ? address.port : options.port;
  return { ...handle, port };
}

/** Construit un serveur (exposé pour les tests avec un port 0). */
export function makeWebServer(): Omit<WebServerHandle, "port"> {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    try {
      if (url.pathname === "/" || url.pathname === "/index.html") {
        const html = await readFile(htmlFilePath(), "utf8");
        res.writeHead(HTTP.ok, {
          "content-type": "text/html; charset=utf-8",
        });
        res.end(html);
        return;
      }
      if (url.pathname === "/api/spec") {
        await handleSpecRequest(req, res);
        return;
      }
      if (url.pathname === "/api/health") {
        json(res, HTTP.ok, { status: "ok" });
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
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

export { htmlFilePath, handleSpecRequest, HTTP, SPEC_STATUS };