/**
 * Types partagés du domaine : définissent les contrats entre le cadrage
 * utilisateur, le contexte de run et la sortie de chaque agent.
 */

/** Couleur de la palette (chaque token est un code hexadécimal). */
export interface Palette {
  /** Couleur primaire / de marque. */
  primary: string;
  /** Couleur secondaire / d'accent secondaire. */
  secondary: string;
  /** Couleur de fond. */
  background: string;
  /** Couleur du texte. */
  foreground: string;
  /** Couleur d'accent / d'action. */
  accent: string;
}

/** Fonctionnalités cibles du MVP. */
export interface Feature {
  /** Identifiant court de la fonctionnalité (slug). */
  id: string;
  /** Intitulé métier de la fonctionnalité. */
  label: string;
  /** Description courte du comportement attendu. */
  description: string;
}

/** Persona utilisateur prioritaire. */
export interface Persona {
  /** Identifiant court du persona. */
  id: string;
  /** Label du persona (ex: "Manager d'équipe"). */
  label: string;
  /** Objectifs et besoins de ce persona. */
  needs: string[];
}

/** Description d'un parcours utilisateur principal. */
export interface UserJourney {
  /** Point d'entrée (ex: page d'accueil, page de connexion). */
  entry: string;
  /** Étapes intermédiaires vers l'action clé. */
  steps: string[];
  /** Action clé finale du parcours. */
  targetAction: string;
}

/** Stack technique imposée ou choisie par défaut. */
export interface TechnicalStack {
  /** Framework principal (React, Next.js, etc.). */
  framework: string;
  /** Langage (TypeScript par défaut). */
  language: string;
  /** Solution CSS / design system (Tailwind, CSS Modules, etc.). */
  styling: string;
  /** ORM / accès aux données (Prisma, Drizzle, etc.). */
  orm: string;
  /** Base de données (PostgreSQL, SQLite, Supabase, etc.). */
  database: string;
  /** Solution d'authentification et de gestion des rôles. */
  auth: string;
  /** Intégrations tierces optionnelles. */
  integrations: string[];
}

/** Cadrage projet complet issu du fichier de spécification utilisateur. */
export interface ProjectSpec {
  /** Identifiant technique du projet (slug URL-friendly). */
  name: string;
  /** Nom commercial de l'application. */
  displayName: string;
  /** Baseline / promesse principale. */
  baseline: string;
  /** Palette graphique. */
  palette: Palette;
  /** Type d'interface visée. */
  interfaceKind:
    | "mobile-first"
    | "dashboard-desktop"
    | "pwa"
    | "native"
    | "responsive";
  /** Personas prioritaires. */
  personas: Persona[];
  /** Fonctionnalités clés du MVP (3 à 5). */
  features: Feature[];
  /** Parcours utilisateur principal. */
  journey: UserJourney;
  /** Stack technique. */
  stack: TechnicalStack;
  /** Contraintes supplémentaires libres. */
  constraints: string[];
}

/** Historique des fichiers créés/modifiés par un agent. */
export interface FileChange {
  /** Chemin relatif dans le projet généré. */
  path: string;
  /** État de l'opération. */
  action: "create" | "modify" | "delete";
  /** Résumé de l'intention de la modification. */
  summary: string;
}

/** Log structuré d'une étape du pipeline. */
export interface StepLog {
  /** Instant de création. */
  at: string;
  /** Nom de l'agent concerné. */
  agent: string;
  /** Niveau de sévérité. */
  level: "info" | "warn" | "error";
  /** Message libre. */
  message: string;
}

/** Erreur structurée remontée pendant un run. */
export interface RunError {
  /** Agent responsable, si connu. */
  agent?: string | undefined;
  /** Message d'erreur humainement lisible. */
  message: string;
  /** Sortie brute de l'outil (stderr, etc.). */
  detail?: string | undefined;
  /** Code sortie du process, si applicable. */
  exitCode?: number | undefined;
}

/** Nom d'un agent du pipeline. */
export type AgentName =
  | "architect"
  | "backend"
  | "frontend"
  | "qa"
  | "devops";

/** Résultat produit par un agent à la fin de son exécution. */
export interface AgentOutput {
  /** Nom de l'agent. */
  agent: AgentName;
  /** Résumé humainement lisible de ce qui a été fait. */
  summary: string;
  /** Fichiers créés/modifiés lors de l'étape. */
  files: FileChange[];
  /** Logs d'étape. */
  logs: StepLog[];
  /** Liste des artefacts de contexte produits (chemins relatifs). */
  producedArtifacts: string[];
  /** Erreur éventuelle (l'agent a échoué malgré un retour). */
  error?: RunError;
}
