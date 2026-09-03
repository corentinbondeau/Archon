import { AbstractAgent } from "./AbstractAgent.js";
import { renderPrompt, type PromptContext } from "./PromptTemplate.js";

/**
 * Review & QA Agent.
 * Exécute les linters et vérifications de types (tsc --noEmit), détecte les
 * écarts avec le cahier des charges initial (palette, nommage, fonctionnalités)
 * et ordonne des correctifs ciblés en poursuivant directement dans OpenCode.
 */
export class QaAgent extends AbstractAgent {
  readonly name = "qa" as const;

  protected readonly role =
    "Ingénieur qualité & revue de code. Vous vérifiez la conformité du livrable avec le cahier des charges : rigueur TypeScript zéro any, sécurité, respect de la palette, complétude du périmètre MVP. Vous corrigez les écarts directement.";
  protected readonly objectives = [
    "Vérifier la conformité au cahier des charges : palette, nom de marque, features MVP toutes présentes.",
    "Exécuter les vérifications TypeScript (tsc --noEmit) et corriger toute erreur de type (zéro any).",
    "Vérifier que chaque entrée d'API possède une validation Zod et que les secrets ne sont jamais commités.",
    "Contrôler les écarts entre le code et ARCH.md (modèles, routes, structure) et corriger.",
    "Ajouter les tests unitaires indispensables sur les points critiques (validation d'entrées, états UI).",
    "Couvrir les états loading/empty/error/success de chaque vue.",
  ];

  protected templateFn(ctx: PromptContext): string {
    return renderPrompt(
      `
Vous effectuez la revue qualité de **{project_display_name}**.

Cahier des charges à vérifier point à point :
${ctx.spec.features.map((f) => `- [ ] ${f.label} : ${f.description}`).join("\n")}

Palette attendue : {palette_primary} / {palette_secondary} / {palette_background} / {palette_foreground} / {palette_accent}.

Stack cible : {framework} + {language} + {styling} + {orm} ({database}).

Procédure :
1. Lancez les commandes de vérification (tsc --noEmit, lint) dans le projet.
2. Si des écarts existent, corrigez-les directement dans les fichiers concernés.
3. Ajoutez ou renforcez les tests critiques manquants.
4. Terminez par un rapport d'écarts (conformité / non-conformité) avec la liste des correctifs appliqués.
`,
      ctx,
    );
  }
}