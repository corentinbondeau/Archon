import { resolve, join } from "node:path";
import {
  ContextManager,
  FileRunStore,
  loadProjectSpec,
  Orchestrator,
  ensureProjectDir,
} from "./index.js";
import { createDefaultAgents } from "../agents/index.js";
import { OpenCodeRunner } from "../adapters/index.js";
import type { AgentName, AgentOutput } from "./index.js";
import { commitStep, pushToRepo } from "./git.js";

/** Modèle Copilot utilisé par défaut quand l'utilisateur s'authentifie GitHub. */
export const DEFAULT_COPILOT_MODEL = "github-copilot/claude-sonnet-4.6";

/** Messages français de commit par étape du pipeline. */
export const STEP_COMMIT_MESSAGES: Record<AgentName, string> = {
  architect: "Architecture du projet : structure, configuration et design system",
  backend: "API, schémas de données et types partagés",
  frontend: "Interface utilisateur, composants et états d'écran",
  qa: "Vérification qualité et conformité au cahier des charges",
  devops: "Build de production, environnement et documentation",
  deploy: "Préparation du déploiement",
};

export interface StepCommit {
  agent: AgentName;
  message: string;
  sha: string;
}

export interface PipelineOptions {
  dir?: string | undefined;
  model?: string | undefined;
  opencodeAgent?: string | undefined;
  auto?: boolean;
  fresh?: boolean;
  retries?: number;
  deploy?: boolean;
  remote?: string | undefined;
  /** Variables d'environnement supplémentaires injectées aux process opencode (ex: GITHUB_TOKEN). */
  env?: NodeJS.ProcessEnv;
  /** Dépôt GitHub cible (owner/repo ou URL) pour les commits/push après chaque étape. */
  repo?: string | undefined;
}

export interface PipelineProgress {
  agent: AgentName | null;
  step: number | null;
  totalSteps: number;
  status: "idle" | "running" | "done" | "partial";
  outputs: AgentOutput[];
  errors: AgentOutput[];
  commits: StepCommit[];
  summary?: string;
}

/** Événements de cycle de vie remontés pendant l'exécution. */
export interface PipelineCallbacks {
  onStepStart?: (stepIndex: number, agent: AgentName) => void;
  onStepEnd?: (
    stepIndex: number,
    agent: AgentName,
    output: AgentOutput,
  ) => void;
  onRetry?: (agent: AgentName, attempt: number) => void;
  /** Commits réalisés après les étapes (un par agent réussi). */
  onCommits?: (commits: StepCommit[]) => void;
}

export interface PipelineRunResult {
  completed: boolean;
  projectDir: string;
  stats: {
    agentsRun: number;
    filesTouched: number;
    artifactsProduced: number;
    warnings: number;
    errors: number;
  };
  errors: AgentOutput[];
  commits: StepCommit[];
}

/** Contrat minimal d'un lanceur de pipeline avec état interrogeable. */
export interface PipelineRunner {
  start(
    specPath: string,
    options?: PipelineOptions,
  ): Promise<PipelineProgress>;
  progress(): PipelineProgress;
}

/**
 * Charge la spec (chemin md/yaml/json), prépare le répertoire projet et exécute
 * le pipeline OpenCode de bout en bout. Retourne un résultat sérialisable.
 */
export async function runPipelineFromSpec(
  specPath: string,
  options: PipelineOptions = {},
  callbacks: PipelineCallbacks = {},
): Promise<PipelineRunResult> {
  const { spec } = await loadProjectSpec(specPath);

  const projectDir = resolve(options.dir ?? join(process.cwd(), spec.name));
  await ensureProjectDir(projectDir);

  const store = new FileRunStore(join(projectDir, ".archon", "state.json"));
  const context = await ContextManager.create(
    spec,
    projectDir,
    store,
    "",
    !options.fresh,
  );

  // Modèle par défaut : un modèle Copilot quand un token GitHub est présent.
  const effectiveModel =
    options.model ??
    (options.env?.["GITHUB_TOKEN"] ? DEFAULT_COPILOT_MODEL : undefined);

  const runnerOptions: ConstructorParameters<typeof OpenCodeRunner>[0] = {};
  if (effectiveModel !== undefined) runnerOptions.model = effectiveModel;
  if (options.opencodeAgent !== undefined) runnerOptions.opencodeAgent = options.opencodeAgent;
  if (options.auto !== undefined) runnerOptions.autoApprove = options.auto;
  if (options.env !== undefined) runnerOptions.env = options.env;

  const runner = new OpenCodeRunner(runnerOptions);

  const agents = createDefaultAgents();

  const orchestrator = new Orchestrator(agents, context, {
    runner,
    maxAgentRetries: options.retries ?? 1,
    ...(options.deploy || options.remote
      ? {
          deploy: {
            enabled: !!options.deploy,
            ...(options.remote !== undefined ? { remoteUrl: options.remote } : {}),
          },
        }
      : {}),
    hooks: {
      onStepStart: (step, agent) => callbacks.onStepStart?.(step, agent),
      onStepEnd: (step, agent, output) => {
        callbacks.onStepEnd?.(step, agent, output);
      },
      onRetry: (agent) => {
        callbacks.onRetry?.(agent, 0);
        return true;
      },
    },
  });

  const result = await orchestrator.run();

  // Commits post-étape : un commit par agent réussi, si un token GitHub est fourni.
  const token = options.env?.["GITHUB_TOKEN"];
  const commits: StepCommit[] = [];
  if (token) {
    for (const out of result.outputs) {
      const message = STEP_COMMIT_MESSAGES[out.agent] ?? `Étape ${out.agent}`;
      try {
        const res = await commitStep(projectDir, message, token);
        if (!res.sha) continue;
        commits.push({ agent: out.agent, message, sha: res.sha });
        if (options.repo) {
          await pushToRepo(projectDir, options.repo, token).catch(() => undefined);
        }
      } catch {
        /* commit optionnel : n'arrête pas le pipeline */
      }
    }
    callbacks.onCommits?.(commits);
  }

  return {
    completed: result.completed,
    projectDir: result.projectDir,
    stats: {
      agentsRun: result.stats.agentsRun,
      filesTouched: result.stats.filesTouched,
      artifactsProduced: result.stats.artifactsProduced,
      warnings: result.stats.warnings,
      errors: result.stats.errors,
    },
    errors: result.errors,
    commits,
  };
}

/**
 * Enveloppe d'exécution du pipeline avec un état progressif partagé, adaptée à
 * un lancement en arrière-plan (le serveur web) où l'on veut interroger l'avancement.
 */
export function createPipelineRunner(): PipelineRunner {
  let progress: PipelineProgress = {
    agent: null,
    step: null,
    totalSteps: 6,
    status: "idle",
    outputs: [],
    errors: [],
    commits: [],
  };

  return {
    async start(specPath, options = {}) {
      progress.status = "running";
      progress.agent = null;
      progress.step = null;
      progress.outputs = [];
      progress.errors = [];
      progress.commits = [];
      delete progress.summary;
      try {
        const result = await runPipelineFromSpec(specPath, options, {
          onStepStart: (step, agent) => {
            progress.status = "running";
            progress.step = step;
            progress.agent = agent;
          },
          onStepEnd: (step, agent, output) => {
            progress.step = step;
            progress.agent = agent;
            if (output.error) progress.errors.push(output);
            else progress.outputs.push(output);
          },
          onCommits: (commits) => {
            progress.commits = commits;
          },
        });
        progress.status = result.completed ? "done" : "partial";
        progress.agent = null;
        progress.step = null;
        progress.commits = result.commits;
        progress.summary = result.completed
          ? `Livraison prête dans ${result.projectDir}.`
          : `Pipeline incomplet — ${result.errors.length} erreurs.`;
        return progress;
      } catch (err) {
        progress.status = "partial";
        progress.summary = err instanceof Error ? err.message : String(err);
        return progress;
      }
    },
    progress() {
      return progress;
    },
  };
}
