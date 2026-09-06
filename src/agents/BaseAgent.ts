import type { AgentOutput, ProjectSpec } from "../core/types.js";
import type { ContextManager } from "../core/ContextManager.js";
import type { OpenCodeRunner } from "../adapters/OpenCodeRunner.js";

/** Options de déploiement injectées à l'agent `deploy` du pipeline. */
export interface DeployOptions {
  /** true pour déclencher le déploiement réel après la préparation. */
  enabled: boolean;
  /** Dépôt git distant à créer et pousser (déclenche l'auto-deploy PaaS). */
  remoteUrl?: string;
}

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
  /** Options de déploiement, consommées par l'agent `deploy`. */
  deploy?: DeployOptions;
}

/**
 * Contrat commun des agents : `run` consomme le contexte et retourne un
 * `AgentOutput` exploitable par le pipeline.
 */
export interface BaseAgent {
  /** Nom canonique de l'agent, utilisé comme clé de pipeline. */
  readonly name:
    | "architect"
    | "backend"
    | "frontend"
    | "qa"
    | "devops"
    | "deploy";

  /**
   * Exécute l'agent.
   * @param input Contexte partagé + adaptateur OpenCode.
   * @returns Résultat structuré (résumé, fichiers, artefacts, logs).
   */
  run(input: AgentInput): Promise<AgentOutput>;
}
