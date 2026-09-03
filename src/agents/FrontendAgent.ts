import { AbstractAgent } from "./AbstractAgent.js";
import { renderPrompt, type PromptContext } from "./PromptTemplate.js";

/**
 * Frontend UI Agent.
 * Consomme ARCH.md et les types partagés du backend, puis implémente les
 * layouts, pages et composants en appliquant rigoureusement la palette et
 * les guidelines définies, avec les états UI (loading/empty/error/success)
 * et le branchement sur les contrats d'API.
 */
export class FrontendAgent extends AbstractAgent {
  readonly name = "frontend" as const;

  protected readonly role =
    "Ingénieur frontend / designer UI. Vous développez l'interface de l'application en respectant scrupuleusement le design system (tokens, palette) et en connectant les composants aux contrats d'API du backend.";
  protected readonly objectives = [
    "Implémenter les layouts, pages et composants selon l'arborescence ARCH.md.",
    "Appliquer la palette fournie (tokens CSS) sans déviation.",
    "Couvrir les quatre états d'interface : loading, empty, error, success.",
    "Brancher l'UI sur les endpoints / Server Actions déclarés par le backend.",
    "Respecter le parcours utilisateur principal décrit dans la spec.",
    "Aucun texte lorem ipsum : tout le contenu reflète le domaine de {project_display_name}.",
  ];

  protected templateFn(ctx: PromptContext): string {
    return renderPrompt(
      `
Vous construisez l'interface de **{project_display_name}** ("{baseline}").

Type d'interface : **{interface_kind}** — framework **{framework}**, styles **{styling}**.

Parcours utilisateur principal :
- Entrée : ${ctx.spec.journey.entry}
${ctx.spec.journey.steps.map((s) => `- Étape : ${s}`).join("\n")}
- Action clé : ${ctx.spec.journey.targetAction}

Palette à appliquer obligatoirement :
- Primaire {palette_primary} · secondaire {palette_secondary} · fond {palette_background}
- Texte {palette_foreground} · accent {palette_accent}

Personas ciblés : ${ctx.spec.personas.map((p) => `${p.label} (${p.needs.join(", ")})`).join(" · ")}

Consignes :
- Chaque composant couvre les états loading / empty / error / success.
- Le nommage des composants suit le domaine métier (ex: TelescopeInspector, ResiliencePanel, ...).
- Les appels réseaux s'appuient sur les types partagés et endpoints du backend, jamais sur des routes devinées.
`,
      ctx,
    );
  }
}