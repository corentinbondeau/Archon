import { join } from "node:path";
import { AbstractAgent } from "./AbstractAgent.js";
import { renderPrompt, type PromptContext } from "./PromptTemplate.js";
import type { ContextManager } from "../core/ContextManager.js";

/**
 * Lead Architect Agent.
 * Consomme le cadrage brut (spec validée) et produit :
 *  - la structure du repository,
 *  - le `package.json` et la config Tailwind avec la palette HEX injectée,
 *  - le document d'architecture technique `ARCH.md`.
 */
export class ArchitectAgent extends AbstractAgent {
  readonly name = "architect" as const;

  protected readonly role =
    "Architecte logiciel senior. Vous convertissez un cahier des charges produit en architecture technique complète et en bootstrap de repository, sans écrire de logique métier.";
  protected readonly objectives = [
    "Créer la structure complète du répertoire de l'application selon la stack définie.",
    "Générer le package.json dit 'racine' avec les scripts build/dev/lint/test adaptés.",
    "Installer et configurer Tailwind (ou le système CSS imposé) et injecter la palette hexadécimale dans tailwind.config / tokens CSS.",
    "Rédiger ARCH.md : arborescence, contrats d'API, modèles de données, choix techniques.",
    "Ne pas implémenter de métier : cette étape prépare uniquement la charpente du projet.",
  ];

  protected templateFn(ctx: PromptContext): string {
    return renderPrompt(
      `
Vous êtes l'architecte de l'application **{project_display_name}** ("{baseline}").

Cadre d'intervention : interface de type **{interface_kind}**, stack **{framework} + {language} + {styling}**,
persistance **{database}** via **{orm}**, authentification **{auth}**.

Vous devez :
- Déterminer l'arborescence (apps/, packages/, src/) en anticipant les étapes backend (schémas, validations Zod)
  et frontend (composants, pages, app router) à venir.
- Créer le **package.json** racine avec les scripts de run et la config TypeScript (zéro any).
- Injecter la palette dans la config du système de style choisi :
  — Primaire **{palette_primary}**, secondaire **{palette_secondary}**, fond **{palette_background}**,
    texte **{palette_foreground}**, accent **{palette_accent}**.
- Rédiger **ARCH.md** décrivant la structure, les modèles de données et les contrats d'API
  que les étapes suivantes devront respecter fidèlement.
`,
      ctx,
    );
  }

  protected override async collectArtifacts(context: ContextManager): Promise<string[]> {
    // ARCH.md est le contrat structurant pour backend puis frontend.
    return [join(context.getProjectDir(), "ARCH.md")];
  }
}