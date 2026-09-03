import type { AgentName } from "./types.js";

/** Erreur de base de l'orchestrateur. */
export class ArchonError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
  }
}

/** Erreur de parsing/validation du cahier des charges. */
export class SpecParseError extends ArchonError {}

/** Erreur levée lorsqu'un agent échoue de manière récupérable. */
export class AgentHalt extends ArchonError {
  constructor(
    readonly agent: AgentName,
    message: string,
    readonly detail?: string | undefined,
    readonly exitCode?: number | undefined,
  ) {
    super(message);
  }
}

/** Erreur fatale du pipeline (position de reprise perdue, etc.). */
export class OrchestratorError extends ArchonError {
  constructor(
    message: string,
    readonly step?: AgentName | undefined,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}