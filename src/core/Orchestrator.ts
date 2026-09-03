import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { ContextManager } from "./ContextManager.js";
import { AgentHalt, OrchestratorError } from "./errors.js";
import type { AgentName, AgentOutput } from "./types.js";
import type { BaseAgent } from "../agents/BaseAgent.js";
import { OpenCodeRunner } from "../adapters/OpenCodeRunner.js";

/** Ordre canonique du pipeline multi-agents. */
export const DEFAULT_PIPELINE: AgentName[] = [
  "architect",
  "backend",
  "frontend",
  "qa",
  "devops",
];

/** Rapport agrégé d'un run complet du pipeline. */
export interface OrchestratorStats {
  agentsRun: number;
  filesTouched: number;
  artifactsProduced: number;
  warnings: number;
  errors: number;
}

export interface OrchestratorResult {
  completed: boolean;
  outputs: AgentOutput[];
  errors: AgentOutput[];
  stats: OrchestratorStats;
  projectDir: string;
}

export interface OrchestratorOptions {
  /** Ordre des agents ; défaut: architect → backend → frontend → qa → devops. */
  pipeline?: AgentName[];
  /** Nombre maximal de tentatives d'un agent avant arrêt. */
  maxAgentRetries?: number;
  /** Adaptateur OpenCode (injectable pour tests avec faux runner). */
  runner?: OpenCodeRunner;
  /** Hooks de cycle de vie (logs progressifs). */
  hooks?: {
    onStepStart?: (stepIndex: number, agent: AgentName) => void;
    onStepEnd?: (stepIndex: number, agent: AgentName, output: AgentOutput) => void;
    /** Retourne true pour relancer l'agent après un échec. */
    onRetry?: (agent: AgentName, attempt: number, error: NonNullable<AgentOutput["error"]>) => boolean;
  };
}

/**
 * Orchestrateur : machine à états séquentielle qui pilote les agents via
 * OpenCode, maintient le contexte partagé (ContextManager), persiste l'état
 * après chaque étape et permet la reprise sur erreur.
 *
 * Politique de reprise : chaque agent obtient un nombre fini de tentatives ;
 * au-delà, le pipeline s'arrête avec une erreur fatale persistée. Un état
 * `completed: false` avec `lastAgent` défini permet de reprendre au pas
 * suivant lors d'une relance.
 */
export class Orchestrator {
  readonly context: ContextManager;
  private readonly pipeline: AgentName[];
  private readonly maxAgentRetries: number;
  private readonly runner: OpenCodeRunner;
  private readonly hooks: NonNullable<OrchestratorOptions["hooks"]>;
  private readonly agents: ReadonlyMap<AgentName, BaseAgent>;
  private outputs: AgentOutput[] = [];
  private readonly failed: AgentOutput[] = [];

  constructor(
    agents: BaseAgent[],
    context: ContextManager,
    options: OrchestratorOptions = {},
  ) {
    this.pipeline = options.pipeline ?? DEFAULT_PIPELINE;
    this.maxAgentRetries = options.maxAgentRetries ?? 1;
    this.runner = options.runner ?? new OpenCodeRunner();
    this.hooks = options.hooks ?? {};
    this.context = context;

    const registry = new Map<AgentName, BaseAgent>();
    for (const agent of agents) registry.set(agent.name, agent);
    for (const name of this.pipeline) {
      if (!registry.has(name)) {
        throw new OrchestratorError(`Agent manquant pour l'étape : ${name}`);
      }
    }
    this.agents = registry;
  }

  /** Reprise depuis le dernier agent terminé, sinon exécution complète. */
  private resolveStart(pipeline: AgentName[]): { step: number; resuming: boolean } {
    // Si le run est marqué terminé, on repart de zéro (nouveau cycle).
    if (this.context.isCompleted()) return { step: 0, resuming: false };
    const last = this.context.getLastAgent();
    if (!last) return { step: 0, resuming: false };
    const lastIndex = pipeline.indexOf(last);
    if (lastIndex < 0) return { step: 0, resuming: false };
    return { step: lastIndex + 1, resuming: true };
  }

  /**
   * Exécute le pipeline complet. Reprend automatiquement à l'étape suivante
   * du dernier run interrompu (via l'état persisté), sauf si le run était
   * déjà marqué terminé (nouveau cycle).
   */
  async run(): Promise<OrchestratorResult> {
    // Chaque invocation est une fenêtre d'exécution autonome : on repart
    // d'un historique vierge tout en conservant l'état persisté partagé.
    this.outputs = [];
    this.failed.length = 0;
    const start = this.resolveStart(this.pipeline);

    if (start.resuming) {
      this.context.log(
        this.pipeline[start.step - 1],
        "warn",
        `Reprise du pipeline : l'étape ${this.pipeline[start.step - 1]} était terminée, reprise à ${this.pipeline[start.step] ?? "fin"}.`,
      );
    }

    let step = start.step;
    try {
      for (; step < this.pipeline.length; step++) {
        const name = this.pipeline[step];
        const output = await this.runAgent(name, step);
        this.outputs.push(output);
        if (output.error) {
          this.failed.push(output);
          this.context.recordFatalError({
            agent: output.error.agent,
            message: output.error.message,
            detail: output.error.detail,
            exitCode: output.error.exitCode,
          });
          this.context.log(
            output.agent,
            "error",
            `Pipeline arrêté : échec de l'agent ${output.agent}.`,
          );
          await this.context.persist();
          break;
        }
        this.context.setLastAgent(name);
        this.context.mergeOutput(output);
        await this.context.persist();
        this.hooks.onStepEnd?.(step, name, output);
      }
    } catch (err) {
      // Un agent peut interrompre explicitement le pipeline via AgentHalt.
      if (err instanceof AgentHalt) {
        this.context.recordFatalError({
          agent: err.agent,
          message: err.message,
          detail: err.detail,
          exitCode: err.exitCode,
        });
        this.context.setLastAgent(this.pipeline[step - 1] ?? null);
        await this.context.persist();
        throw err;
      }
      const fatal: AgentOutput["error"] = {
        agent: this.pipeline[step] ?? undefined,
        message: err instanceof Error ? err.message : String(err),
      };
      this.context.recordFatalError(fatal);
      this.context.setLastAgent(this.pipeline[step - 1] ?? null);
      await this.context.persist();
      throw new OrchestratorError(
        fatal.message,
        this.pipeline[step] ?? this.pipeline[step - 1],
      );
    }

    const completed = this.failed.length === 0 && step >= this.pipeline.length;
    if (completed) {
      this.context.markCompleted();
      this.context.log("devops", "info", "Run terminé : pipeline complet.");

      await this.context.persist();
    }

    return {
      completed,
      outputs: this.outputs,
      errors: this.failed,
      stats: this.computeStats(),
      projectDir: this.context.getProjectDir(),
    };
  }

  /** Exécute un agent du pipeline avec politique de tentatives. */
  private async runAgent(name: AgentName, step: number): Promise<AgentOutput> {
    const hooks = this.hooks;
    hooks.onStepStart?.(step, name);

    let lastOutput: AgentOutput | undefined;
    for (let attempt = 0; attempt <= this.maxAgentRetries; attempt++) {
      if (attempt > 0) {
        this.context.log(
          name,
          "warn",
          `Tentative ${attempt + 1}/${this.maxAgentRetries + 1} pour l'agent ${name}.`,
        );
      }

      const agent = this.agents.get(name)!;
      const output = await agent.run({
        spec: this.context.getSpec(),
        context: this.context,
        runner: this.runner,
        humanInstructions: this.context.getHumanInstructions(),
      });
      lastOutput = output;

      if (!output.error) return this.finalize(output);

      this.context.log(name, "error", output.error.message);

      // Plus aucune tentative possible : on remonte l'échec directement.
      if (attempt >= this.maxAgentRetries) return output;
      const retry = hooks.onRetry?.(name, attempt, output.error) ?? false;
      if (!retry) return output;
    }
    return lastOutput!;
  }

  /** Normalise les changements de fichiers d'un agent réussi. */
  private finalize(output: AgentOutput): AgentOutput {
    return {
      ...output,
      files: Array.isArray(output.files) ? output.files : [],
    };
  }

  /** Calcule les statistiques globales du run. */
  private computeStats(): OrchestratorStats {
    const outputs = this.outputs;
    const warnings = outputs.reduce(
      (acc, o) => acc + o.logs.filter((l) => l.level === "warn").length,
      0,
    );
    const errors = outputs.reduce(
      (acc, o) => acc + o.logs.filter((l) => l.level === "error").length,
      0,
    );
    const files = new Set(outputs.flatMap((o) => o.files.map((f) => f.path)));
    const artifacts = new Set(outputs.flatMap((o) => o.producedArtifacts));
    return {
      agentsRun: outputs.length,
      filesTouched: files.size,
      artifactsProduced: artifacts.size,
      warnings,
      errors,
    };
  }
}

/** Prépare un répertoire projet vide (avec le dossier d'état .archon). */
export async function ensureProjectDir(projectDir: string): Promise<void> {
  await mkdir(join(projectDir, ".archon"), { recursive: true });
}