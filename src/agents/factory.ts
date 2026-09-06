import type { BaseAgent } from "./BaseAgent.js";
import { ArchitectAgent } from "./ArchitectAgent.js";
import { BackendAgent } from "./BackendAgent.js";
import { FrontendAgent } from "./FrontendAgent.js";
import { QaAgent } from "./QaAgent.js";
import { DevOpsAgent } from "./DevOpsAgent.js";
import { DeployAgent } from "./DeployAgent.js";

export interface DefaultAgentsOptions {
  /** Simule l'agent deploy sans effet de bord (tests, aperçu). */
  deployDryRun?: boolean;
}

/**
 * Usine du pipeline par défaut : instancie les agents du flux (génération +
 * livraison clé en main) et retourne la liste à injecter dans l'orchestrateur.
 */
export function createDefaultAgents(options: DefaultAgentsOptions = {}): BaseAgent[] {
  return [
    new ArchitectAgent(),
    new BackendAgent(),
    new FrontendAgent(),
    new QaAgent(),
    new DevOpsAgent(),
    options.deployDryRun ? new DeployAgent({ dryRun: true }) : new DeployAgent(),
  ];
}