import { spawn, type ChildProcess } from "node:child_process";
import { dirname, join, relative, isAbsolute } from "node:path";
import { mkdir } from "node:fs/promises";

/**
 * Options de pilotage d'un processus OpenCode headless.
 */
export interface RunnerOptions {
  /** Binaire opencode à invoquer (défaut: "opencode"). */
  binary?: string;
  /** Modèle au format provider/model (ex: anthropic/claude-sonnet-4-5). */
  model?: string | undefined;
  /** Agent OpenCode custom à utiliser (--agent). */
  opencodeAgent?: string | undefined;
  /** Autoriser automatiquement les permissions (--auto). */
  autoApprove?: boolean;
  /** Valeur de variante (reasoning effort, --variant). */
  variant?: string | undefined;
  /** Délai maximal d'exécution du process en ms (0 = illimité). */
  timeoutMs?: number;
  /** Jeu complet de variables d'environnement (inclut les secrets tiers). */
  env?: NodeJS.ProcessEnv;
}

/** Options d'une invocation unitaire d'OpenCode. */
export interface RunRequest {
  /** Répertoire de travail cible du projet généré (workdir du process). */
  cwd: string;
  /** Prompt système + tâche de l'agent. */
  prompt: string;
  /** ID de session OpenCode à continuer (--session). */
  session?: string | undefined;
  /** Titre de session lisible (--title). */
  title?: string | undefined;
}

/** Fichier modifié tel que rapporté par OpenCode. */
export interface OpenCodeFileChange {
  path: string;
  action: "create" | "modify" | "delete";
}

/**
 * Résultat d'une invocation OpenCode : texte du modèle, fichiers modifiés
 * et session exploitable pour la continuité.
 */
export interface RunResult {
  /** Texte final du modèle (résumé, notes). */
  text: string;
  /** ID de session OpenCode de l'exécution. */
  session: string;
  /** Fichiers créés/modifiés détectés pendant l'étape. */
  files: OpenCodeFileChange[];
  /** Code de sortie du processus OpenCode (null si tué par signal). */
  exitCode: number | null;
  /** Sortie brute stderr (utile en cas d'échec). */
  stderr: string;
}

/** Erreur raffinée de pilotage OpenCode. */
export class OpenCodeRunnerError extends Error {
  constructor(
    message: string,
    readonly exitCode?: number | undefined,
    readonly stderr?: string | undefined,
  ) {
    super(message);
    this.name = "OpenCodeRunnerError";
  }
}

/** Structure d'un événement NDJSON émis par `opencode run --format json`. */
interface OpenCodeEvent {
  type: string;
  sessionID?: string;
  part?: {
    type?: string;
    text?: string;
    path?: string;
    previousFile?: string;
  };
}

/**
 * Wrapper générique autour de la CLI OpenCode.
 *
 * Abstraction chargée d'invoquer `opencode run --format json`, d'injecter le
 * prompt de l'agent et de collecter la session, le texte du modèle et les
 * fichiers modifiés. Le pipeline multi-agents dépend uniquement de cette
 * interface, ce qui le rend testable avec un faux adaptateur.
 */
export class OpenCodeRunner {
  private readonly binary: string;
  private readonly model: string | undefined;
  private readonly opencodeAgent: string | undefined;
  private readonly autoApprove: boolean;
  private readonly variant: string | undefined;
  private readonly timeoutMs: number;
  private readonly env: NodeJS.ProcessEnv;

  constructor(options: RunnerOptions = {}) {
    this.binary = options.binary ?? "opencode";
    this.model = options.model;
    this.opencodeAgent = options.opencodeAgent;
    this.autoApprove = options.autoApprove ?? false;
    this.variant = options.variant;
    this.timeoutMs = options.timeoutMs ?? 0;
    this.env = { ...process.env, ...(options.env ?? {}) };
  }

  /**
   * Construit la ligne de commande déterministe d'une invocation headless.
   * Exposée publiquement pour les tests unitaires.
   */
  buildArgs(req: RunRequest, resume = false): string[] {
    const args = ["run", "--format", "json"];
    if (this.model) args.push("--model", this.model);
    if (this.opencodeAgent) args.push("--agent", this.opencodeAgent);
    if (this.autoApprove) args.push("--auto");
    if (this.variant) args.push("--variant", this.variant);
    if (req.title) args.push("--title", req.title);
    if (resume) args.push("--continue");
    else if (req.session) args.push("--session", req.session);
    if (req.prompt) args.push(req.prompt);
    return args;
  }

  /**
   * Exécute une invocation OpenCode headless et collecte le résultat.
   * @param req La demande d'exécution (travail + prompt + session).
   * @param opts.resume Continue la session OpenCode plutôt que d'en créer une.
   */
  async run(
    req: RunRequest,
    opts: { resume?: boolean } = {},
  ): Promise<RunResult> {
    const args = this.buildArgs(req, opts.resume ?? false);
    const cwd = req.cwd;

    // Le répertoire cible doit exister avant le spawn (workdir du process).
    try {
      await mkdir(dirname(cwd), { recursive: true });
    } catch {
      /* le cwd peut être un chemin relatif valide, on laisse passer */
    }

    const proc = spawn(this.binary, args, {
      cwd,
      env: this.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    // Garde-fou temporel : tue le process si le délai est dépassé.
    let timer: NodeJS.Timeout | undefined;
    if (this.timeoutMs > 0) {
      timer = setTimeout(() => proc.kill("SIGTERM"), this.timeoutMs);
      timer.unref?.();
    }

    return this.collect(proc, cwd, timer);
  }

  /** Consomme la sortie NDJSON du process et résout un `RunResult`. */
  private collect(
    proc: ChildProcess,
    cwd: string,
    timer?: NodeJS.Timeout,
  ): Promise<RunResult> {
    return new Promise((resolve, reject) => {
      let stderr = "";
      let session = "";
      const textParts: string[] = [];
      const files: OpenCodeFileChange[] = [];

      const stdout = proc.stdout;
      const stderrStream = proc.stderr;
      if (!stdout || !stderrStream) {
        reject(
          new OpenCodeRunnerError(
            "Flux stdin/stdout non disponibles (stdio inattendu).",
          ),
        );
        return;
      }

      const normalize = (p: string): string => {
        if (isAbsolute(p)) return p;
        // OpenCode rend les chemins relatifs au cwd cible du projet.
        return isAbsolute(cwd) ? join(cwd, p) : relative(".", join(cwd, p));
      };

      stdout.setEncoding("utf8");
      stdout.on("data", (chunk: string) => {
        for (const line of chunk.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          const evt = this.parseEvent(trimmed);
          if (!evt) continue;
          if (evt.sessionID) session = evt.sessionID;

          const part = evt.part;
          if (!part) continue;
          switch (part.type) {
            case "text":
              if (part.text) textParts.push(part.text);
              break;
            case "file":
              if (part.path) {
                files.push({
                  action: part.previousFile ? "modify" : "create",
                  path: normalize(part.path),
                });
              }
              break;
            case "patch":
              // Un patch appliqué = modification d'un ou plusieurs fichiers.
              if (part.path) {
                files.push({ action: "modify", path: normalize(part.path) });
              }
              break;
            default:
              break;
          }
        }
      });

      stderrStream.setEncoding("utf8");
      stderrStream.on("data", (chunk: string) => {
        stderr += chunk;
      });

      proc.on("error", (err) => {
        if (timer) clearTimeout(timer);
        if (err.message.includes("ENOENT")) {
          reject(
            new OpenCodeRunnerError(
              `Binaire OpenCode introuvable : "${this.binary}". Installez opencode puis réessayez.`,
            ),
          );
        } else {
          reject(
            new OpenCodeRunnerError(
              `Erreur de lancement d'OpenCode : ${err.message}`,
            ),
          );
        }
      });

      proc.on("close", (code) => {
        if (timer) clearTimeout(timer);
        resolve({
          text: textParts.join("\n").trim(),
          session,
          files,
          exitCode: code,
          stderr: stderr.trim(),
        });
      });
    });
  }

  /** Parse une ligne NDJSON de manière sûre : null si non parsable. */
  private parseEvent(line: string): OpenCodeEvent | null {
    try {
      return JSON.parse(line) as OpenCodeEvent;
    } catch {
      return null;
    }
  }
}