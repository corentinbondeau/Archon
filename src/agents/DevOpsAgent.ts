import { AbstractAgent } from "./AbstractAgent.js";
import { renderPrompt, type PromptContext } from "./PromptTemplate.js";
import { detectPlatform, platformLabel } from "../deploy/index.js";

/**
 * DevOps & Release Agent.
 * Vérifie la compilation et le build de production (npm run build), fournit
 * le `.env.example` complet et documenté, rédige le `README.md` et aligne le
 * livrable sur la cible de déploiement détectée (Vercel ou Docker), dont les
 * fichiers de configuration sont écrits de façon déterministe par Archon.
 * C'est l'étape finale du pipeline.
 */
export class DevOpsAgent extends AbstractAgent {
  readonly name = "devops" as const;

  protected readonly role =
    "Ingénieur DevOps / release. Vous garantissez qu'un build de production compile, documentez la configuration d'environnement, rédigez la documentation de démarrage et validez l'état de déploiement de l'application.";
  protected readonly objectives = [
    "Exécuter le build de production (npm run build) et corriger toute erreur bloquante.",
    "Créer un .env.example complet, documenté, sans aucune valeur réelle.",
    "Vérifier la présence des scripts de démarrage (dev/build/start) dans le package.json.",
    "Rédiger le README.md : présentation, prérequis, installation, lancement, variables d'environnement et déploiement.",
    "Valider la cohérence des fichiers de déploiement (plateforme détectée) et documenter la procédure de mise en production dans le README.",
    "Confirmer l'état release-ready ou lister explicitement les points bloquants restants.",
  ];

  protected templateFn(ctx: PromptContext): string {
    const target = detectPlatform(ctx.spec);

    return renderPrompt(
      `
Vous préparez la livraison de **{project_display_name}** ("{baseline}").

Stack cible : {framework} + {language} + {styling} + {orm} ({database}).
Authentification : {auth}. Intégrations déclarées : ${ctx.spec.stack.integrations.join(", ") || "aucune"}.

Cible de déploiement détectée : **${platformLabel(target.platform)}**
Justification : ${target.reason}
Fichiers concernés : ${target.configFiles.join(", ")}.

Livrables de cette étape :
1. Build de production passant (npm run build) — corrigez si nécessaire.
2. Fichier \`.env.example\` listant chaque variable requise avec un commentaire d'usage.
3. \`README.md\` structuré : Quick start, installation pas-à-pas, scripts npm,
   variables d'environnement, et section déploiement spécifique à **${platformLabel(target.platform)}**.
4. Vérifiez que les fichiers de déploiement liés à la cible détectée sont cohérents
   (scripts npm, ports, variable PORT, format .env) et corrigez l'incohérence si besoin.
`,
      ctx,
    );
  }
}