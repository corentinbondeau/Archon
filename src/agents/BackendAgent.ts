import { join } from "node:path";
import { AbstractAgent } from "./AbstractAgent.js";
import { renderPrompt, type PromptContext } from "./PromptTemplate.js";
import type { ContextManager } from "../core/ContextManager.js";

/**
 * Database & API Agent.
 * Consomme ARCH.md (produit par l'architecte) et génère :
 *  - les schémas de données (migrations / Prisma / SQL),
 *  - les types TypeScript partagés,
 *  - les endpoints / Server Actions avec validation stricte (Zod),
 *  - la logique d'authentification et les connecteurs tiers déclarés.
 */
export class BackendAgent extends AbstractAgent {
  readonly name = "backend" as const;

  protected readonly role =
    "Ingénieur backend / données. Vous implémentez la couche persistance et API en vous conformant strictement au document ARCH.md fourni, avec validation stricte des entrées (Zod).";
  protected readonly objectives = [
    "Implémenter les modèles de données et la migration initiale conformément à ARCH.md.",
    "Créer les types TypeScript partagés (modèles, payloads) réutilisés par le frontend.",
    "Écrire les endpoints d'API (ou Server Actions) avec validation des entrées via Zod.",
    "Configurer l'authentification et la gestion des rôles selon la stack imposée.",
    "Brancher les intégrations tierces déclarées dans la spec (env via .env.example).",
    "Ne pas créer de composants UI : seul le contrat de données compte.",
  ];

  protected templateFn(ctx: PromptContext): string {
    return renderPrompt(
      `
Vous implémentez le backend de **{project_display_name}**.

Base {database} via {orm}, auth **{auth}**, langage **{language}**.

Fonctionnalités MVP à couvrir par les contrats d'API :
${ctx.spec.features.map((f) => `- **${f.label}** : ${f.description}`).join("\n")}

Exigences :
- Chaque entrée d'API est validée par un schéma Zod (refus silencieux des payloads invalides).
- Les types partagés vivent dans un répertoire dédié, importable par le frontend.
- Les secrets (API keys tierces) sont référencés dans .env.example avec un commentaire.
- Aucune route fantôme : seules les routes justifiées par {project_display_name}.
`,
      ctx,
    );
  }

  protected override async collectArtifacts(context: ContextManager): Promise<string[]> {
    // Les types partagés (contretype métier) sont le contrat pour le frontend.
    return [join(context.getProjectDir(), "src/lib/types.ts")];
  }
}