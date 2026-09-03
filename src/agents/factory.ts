import type { BaseAgent } from "./BaseAgent.js";
import { ArchitectAgent } from "./ArchitectAgent.js";
import { BackendAgent } from "./BackendAgent.js";
import { FrontendAgent } from "./FrontendAgent.js";
import { QaAgent } from "./QaAgent.js";
import { DevOpsAgent } from "./DevOpsAgent.js";

/**
 * Usine du pipeline par défaut : instancie les cinq agents du flux et
 * retourne la liste à injecter dans l'orchestrateur.
 */
export function createDefaultAgents(): BaseAgent[] {
  return [
    new ArchitectAgent(),
    new BackendAgent(),
    new FrontendAgent(),
    new QaAgent(),
    new DevOpsAgent(),
  ];
}