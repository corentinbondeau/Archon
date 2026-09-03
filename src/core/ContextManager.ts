import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import type {
  AgentName,
  AgentOutput,
  FileChange,
  ProjectSpec,
  RunError,
  StepLog,
} from "./types.js";

/**
 * État sérialisé d'un run, persistant sur disque pour permettre la reprise
 * sur erreur et l'inspection différée des étapes.
 */
export interface RunState {
  /** Chemin absolu du répertoire cible où l'application est générée. */
  projectDir: string;
  /** Nom de la dernière étape terminée avec succès. */
  lastAgent: AgentName | null;
  /** Artefacts produits par chaque agent (chemins relatifs au projectDir). */
  artifacts: Partial<Record<AgentName, string[]>>;
  /** Fichiers cumulés créés/modifiés par l'ensemble des étapes. */
  files: FileChange[];
  /** Logs cumulés du run. */
  logs: StepLog[];
  /** Erreur fatale éventuelle (arrêt du pipeline). */
  fatalError?: RunError;
  /** Marqueur de run terminé avec succès. */
  completed: boolean;
}

/** Position courante du pipeline, à reprendre après un crash. */
export interface PipelinePosition {
  agent: AgentName;
  stepIndex: number;
}

/** Interface de stockage de l'état (abstraction pour tests / mémoire). */
export interface RunStore {
  read(): Promise<RunState | null>;
  write(state: RunState): Promise<void>;
}

/** Stockage sur disque : écrit un JSON dans le répertoire de travail. */
export class FileRunStore implements RunStore {
  constructor(private readonly stateFile: string) {}

  async read(): Promise<RunState | null> {
    try {
      const raw = await readFile(this.stateFile, "utf8");
      return JSON.parse(raw) as RunState;
    } catch {
      return null;
    }
  }

  async write(state: RunState): Promise<void> {
    await mkdir(dirname(this.stateFile), { recursive: true });
    await writeFile(this.stateFile, JSON.stringify(state, null, 2), "utf8");
  }
}

/** Store en mémoire, utile aux tests unitaires du pipeline. */
export class MemoryRunStore implements RunStore {
  private state: RunState | null = null;
  async read(): Promise<RunState | null> {
    return this.state;
  }
  async write(state: RunState): Promise<void> {
    this.state = state;
  }
}

/**
 * Gestionnaire de mémoire partagée : expose la spec, le répertoire de
 * travail, les artefacts produits, et persiste l'état entre les étapes.
 */
export class ContextManager {
  private readonly state: RunState;
  private readonly humanInstructions: string;

  constructor(
    private readonly spec: ProjectSpec,
    projectDir: string,
    private readonly store: RunStore,
    humanInstructions: string,
    external: Record<string, unknown> = {},
  ) {
    const initial = external.state as RunState | undefined;
    this.state = initial ?? {
      projectDir: resolve(projectDir),
      lastAgent: null,
      artifacts: {},
      files: [],
      logs: [],
      completed: false,
    };
    this.humanInstructions = humanInstructions;
  }

  /** Crée un ContextManager en chargeant un état persisté s'il existe. */
  static async create(
    spec: ProjectSpec,
    projectDir: string,
    store: RunStore,
    humanInstructions: string,
    mergeState = false,
  ): Promise<ContextManager> {
    let external: Record<string, unknown> = {};
    if (mergeState) {
      const existing = await store.read();
      if (existing) external = { state: existing };
    }
    return new ContextManager(
      spec,
      projectDir,
      store,
      humanInstructions,
      external,
    );
  }

  getSpec(): ProjectSpec {
    return this.spec;
  }

  getProjectDir(): string {
    return this.state.projectDir;
  }

  getHumanInstructions(): string {
    return this.humanInstructions;
  }

  isCompleted(): boolean {
    return this.state.completed;
  }

  getFatalError(): RunError | undefined {
    return this.state.fatalError;
  }

  /** Artefacts produits par un agent donné. */
  getArtifacts(agent: AgentName): string[] {
    return this.state.artifacts[agent] ?? [];
  }

  /** Tous les artefacts produits, tous agents confondus. */
  getAllArtifacts(): string[] {
    return Object.values(this.state.artifacts).flat();
  }

  /**
   * Entrées de contexte utiles à l'agent suivant : les artefacts des étapes
   * précédentes ramenés à un chemin absolu exploitable.
   */
  getContextFor(agent: AgentName): { path: string; contents: string }[] {
    const prior = ["architect", "backend"]
      .filter((a): a is AgentName => a !== agent)
      .map((a) => this.state.artifacts[a] ?? [])
      .flat();
    return prior.map((p) => ({
      path: p,
      contents: this.resolveArtefact(p),
    }));
  }

  /** Résout le contenu d'un artefact relatif au projectDir. */
  resolveArtefact(relativePath: string): string {
    return join(this.state.projectDir, relativePath);
  }

  /** Enregistre les artefacts produits par un agent. */
  recordArtifacts(agent: AgentName, artifacts: string[]): void {
    this.state.artifacts[agent] = artifacts.map((p) =>
      this.relativize(p),
    );
  }

  /** Fusionne les résultats d'un agent dans l'état partagé. */
  mergeOutput(output: AgentOutput): void {
    for (const f of output.files) {
      this.recordFile(f);
    }
    this.state.logs.push(...output.logs);
  }

  // ------------------------------------------------------------------
  // Logs & erreurs
  // ------------------------------------------------------------------

  log(agent: AgentName, level: StepLog["level"], message: string): void {
    this.state.logs.push({ at: new Date().toISOString(), agent, level, message });
  }

  setLastAgent(agent: AgentName | null): void {
    this.state.lastAgent = agent;
  }

  getLastAgent(): AgentName | null {
    return this.state.lastAgent;
  }

  recordFatalError(error: RunError): void {
    this.state.fatalError = error;
  }

  markCompleted(): void {
    this.state.completed = true;
  }

  /** Construit la position de reprise si le run a été interrompu. */
  getResumePosition(pipeline: AgentName[]): PipelinePosition | null {
    if (this.state.completed || !this.state.lastAgent) return null;
    const idx = pipeline.indexOf(this.state.lastAgent);
    if (idx < 0) return null;
    // Reprend à l'agent suivant celui qui s'est terminé.
    return { agent: pipeline[idx + 1] ?? pipeline[idx], stepIndex: idx + 1 };
  }

  // ------------------------------------------------------------------
  // Persistance
  // ------------------------------------------------------------------

  /** Sauvegarde l'état courant sur le stockage. */
  async persist(): Promise<void> {
    await this.store.write(this.cloneState());
  }

  /** Recharge l'état persisté en mémoire (reprise après crash). */
  async reload(): Promise<void> {
    const fresh = await this.store.read();
    if (!fresh) return;
    Object.assign(this.state, fresh);
  }

  /** Supprime l'état persisté (à la réussite d'un run complet). */
  async clear(): Promise<void> {
    const path = (this.store as { stateFile?: string }).stateFile;
    if (path) {
      try {
        await rm(path, { force: true });
      } catch {
        /* ignore */
      }
    }
    this.state.lastAgent = null;
    delete this.state.fatalError;
    this.state.completed = false;
  }

  private cloneState(): RunState {
    return structuredClone(this.state);
  }

  private relativize(p: string): string {
    const abs = resolve(p);
    const rel = relative(this.state.projectDir, abs);
    return rel.startsWith("..") ? abs : rel;
  }

  private recordFile(file: FileChange): void {
    const norm = { ...file, path: this.relativize(file.path) };
    const idx = this.state.files.findIndex((f) => f.path === norm.path);
    if (idx >= 0) this.state.files[idx] = norm;
    else this.state.files.push(norm);
  }
}
