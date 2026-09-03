import { AbstractAgent } from "./AbstractAgent.js";
import { renderPrompt, type PromptContext } from "./PromptTemplate.js";

/**
 * DevOps & Release Agent.
 * Vérifie la compilation et le build de production (npm run build), fournit
 * le `.env.example` complet et documenté, et rédige le `README.md` avec les
 * étapes d'installation et de lancement. C'est l'étape finale du pipeline.
 */
export class DevOpsAgent extends AbstractAgent {
  readonly name = "devops" as const;

  protected readonly role =
    "Ingénieur DevOps / release. Vous garantissez qu'un build de production compile, documentez la configuration d'environnement et rédigez la documentation de démarrage.";
  protected readonly objectives = [
    "Exécuter le build de production (npm run build) et corriger toute erreur bloquante.",
    "Créer un .env.example complet, documenté, sans aucune valeur réelle.",
    "Vérifier la présence des scripts de démarrage (dev/build/start) dans le package.json.",
    "Rédiger le README.md : présentation, prérequis, installation, lancement, variables d'environnement.",
    "Confirmer l'état release-ready ou lister explicitement les points bloquants restants.",
  ];

  protected templateFn(ctx: PromptContext): string {
    return renderPrompt(
      `
Vous préparez la livraison de **{project_display_name}** ("{baseline}").

Stack cible : {framework} + {language} + {styling} + {orm} ({database}).
Authentification : {auth}. Intégrations déclarées : ${ctx.spec.stack.integrations.join(", ") || "aucune"}.

Livrables de cette étape :
1. Build de production passant (npm run build) — corrigez si nécessaire.
2. Fichier \`.env.example\` listant chaque variable requise avec un commentaire d'usage.
3. \`README.md\` structuré : Quick start, installation pas-à-pas, scripts npm, variables d'environnement.
`,
      ctx,
    );
  }
}