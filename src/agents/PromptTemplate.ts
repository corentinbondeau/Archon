import type { AgentName, ProjectSpec } from "../core/types.js";

/**
 * Template de prompt injectant les variables du projet (nom, palette,
 * stack, features) dans un prompt d'agent. Toute paire {clé} est résolue
 * depuis le contexte, garantissant zéro placeholder générique non résolu.
 */
export interface PromptContext {
  spec: ProjectSpec;
  agent: AgentName;
  /** Artefacts des étapes précédentes (chemins absolus) à partager. */
  priorArtifacts: { path: string; contents: string }[];
  /** Instructions humaines extraites de la spec (si markdown). */
  humanInstructions: string;
  /** Chemin absolu du répertoire projet cible. */
  projectDir: string;
}

const VARIABLE_RE = /\{([a-z][a-zA-Z0-9._]*)\}/g;

/**
 * Résout un template en remplaçant les variables documentées ci-dessous.
 * Les variables inconnues lèvent une erreur pour éviter tout placeholder
 * silencieux.
 */
export function renderPrompt(
  template: string,
  ctx: PromptContext,
  variables: Record<string, string> = {},
): string {
  const augmented: Record<string, string> = {
    project_name: ctx.spec.name,
    project_display_name: ctx.spec.displayName,
    baseline: ctx.spec.baseline,
    interface_kind: ctx.spec.interfaceKind,
    framework: ctx.spec.stack.framework,
    language: ctx.spec.stack.language,
    styling: ctx.spec.stack.styling,
    orm: ctx.spec.stack.orm,
    database: ctx.spec.stack.database,
    auth: ctx.spec.stack.auth,
    palette_primary: ctx.spec.palette.primary,
    palette_secondary: ctx.spec.palette.secondary,
    palette_background: ctx.spec.palette.background,
    palette_foreground: ctx.spec.palette.foreground,
    palette_accent: ctx.spec.palette.accent,
    agent: ctx.agent,
    project_dir: ctx.projectDir,
    ...variables,
  };

  return template.replace(VARIABLE_RE, (_match, key: string) => {
    if (key in augmented) return augmented[key];
    throw new Error(
      `Variable non résolue dans le prompt : {${key}}. Ajoutez-la au contexte du template.`,
    );
  });
}

/** Formate la liste des artefacts antérieurs pour l'injection dans un prompt. */
export function formatPriorArtifacts(artifacts: PromptContext["priorArtifacts"]): string {
  if (artifacts.length === 0) return "(aucun artefact antérieur — étape initiale)";
  return artifacts
    .map(
      (a, i) =>
        `${i + 1}. \`${a.path}\`\n   Contenu (extrait) :\n\`\`\`\n${
          a.contents.length > 2000 ? a.contents.slice(0, 2000) + "\n…(tronqué)" : a.contents
        }\n\`\`\``,
    )
    .join("\n\n");
}

/** Bloc commun de style à insérer dans chaque prompt d'agent. */
export function sharedStyleBlock(ctx: PromptContext): string {
  const { palette, stack } = ctx.spec;
  return `
## Design system (à appliquer sans déviation)
- Palette reconnue : primaire ${palette.primary}, secondaire ${palette.secondary}, fond ${palette.background}, texte ${palette.foreground}, accent ${palette.accent}.
- Stack : ${stack.framework} + ${stack.language} + ${stack.styling} + ${stack.orm} (${stack.database}), auth ${stack.auth}.
- Règles de qualité : zéro \`any\`, zéro composant générique, nommage 100% aligné sur le domaine "${ctx.spec.displayName}".
- Les textes d'interface reflètent le métier ; aucun lorem ipsum ni placeholder "TBD".
`.trim();
}
