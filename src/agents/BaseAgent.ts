import type { AgentOutput, ProjectSpec } from "../core/types.js";
import type { ContextManager } from "../core/ContextManager.js";
import type { OpenCodeRunner } from "../adapters/OpenCodeRunner.js";

/**
 * Options d'exécution communes à tous les agents : ils reçoivent le contexte
 * partagé et l'adaptateur OpenCode pour générer/modifier des fichiers.
 */
export interface AgentInput {
  spec: ProjectSpec;
  context: ContextManager;
  runner: OpenCodeRunner;
  /** Instructions humaines extraites du fichier de spec (si markdown). */
  humanInstructions: string;
}

/**
 * Contrat commun des agents : `run` consomme le contexte et retourne un
 * `AgentOutput` exploitable par le pipeline.
 */
export interface BaseAgent {
  /** Nom canonique de l'agent, utilisé comme clé de pipeline. */
  readonly name: "architect" | "backend" | "frontend" | "qa" | "devops";

  /**
   * Exécute l'agent.
   * @param input Contexte partagé + adaptateur OpenCode.
   * @returns Résultat structuré (résumé, fichiers, artefacts, logs).
   */
  run(input: AgentInput): Promise<AgentOutput>;
}
