import type { BaseAgent, AgentInput } from "./BaseAgent.js";
import type { AgentOutput, FileChange, StepLog } from "../core/types.js";
import { Deployer, detectPlatform, platformLabel } from "../deploy/index.js";

export interface DeployAgentOptions {
  /** Simulation du déploiement sans effet de bord (tests, aperçu). */
  dryRun?: boolean;
}

/**
 * Deployment Agent (étape finale du pipeline).
 *
 * Contrairement aux agents de génération, cet agent **n'invoque pas OpenCode** :
 * il applique une suite déterministe et rejouable qui transforme l'arbre
 * source en application déployée et livrable "clé en main" :
 *
 * 1. Détection automatique de la cible (Vercel si framework supporté, sinon Docker).
 * 2. Écriture des fichiers de déploiement (vercel.json / Dockerfile + CI/CD).
 * 3. Initialisation du dépôt git et commit initial.
 * 4. Déploiement réel (vercel deploy --prod ou docker build) si activé,
 *    et push vers la remote git si fournie.
 *
 * Les résultats sont alignés sur le contrat `AgentOutput` : résumé, fichiers,
 * logs et artefacts (chemins des fichiers de déploiement produits).
 */
export class DeployAgent implements BaseAgent {
  readonly name = "deploy" as const;
  private readonly dryRun: boolean;

  constructor(options: DeployAgentOptions = {}) {
    this.dryRun = options.dryRun ?? false;
  }

  async run(input: AgentInput): Promise<AgentOutput> {
    const logs: StepLog[] = [];
    const log = (level: StepLog["level"], message: string) =>
      logs.push({ at: new Date().toISOString(), agent: this.name, level, message });

    const context = input.context;
    const spec = context.getSpec();
    const projectDir = context.getProjectDir();
    const opts = input.deploy ?? { enabled: false };
    const profile = detectPlatform(spec);

    log("info", `Cible détectée : ${platformLabel(profile.platform)} — ${profile.reason}`);

    const deployer = new Deployer({ dryRun: this.dryRun });
    const result = await deployer.deploy({
      projectDir,
      spec,
      ...(opts.remoteUrl ? { remoteUrl: opts.remoteUrl } : {}),
      deploy: opts.enabled,
    });

    for (const line of result.logs) log("info", line);

    const files: FileChange[] = result.configFiles.map((p) => ({
      path: p,
      action: "create",
      summary: `deploy: ${p}`,
    }));

    if (result.error) {
      log("warn", result.error);
      log("warn", "Livraison locale prête (fichiers de déploiement + git), déploiement distant à activer.");
    }

    const deployedSummary =
      result.deployed && result.url
        ? `Application déployée : ${result.url}`
        : result.deployed
          ? `Déploiement ${platformLabel(result.platform)} terminé.`
          : `Déploiement ${platformLabel(result.platform)} préparé (fichiers de déploiement + git initialisés)${result.error ? ` — ${result.error}` : ""}.`;

    return {
      agent: this.name,
      summary: deployedSummary,
      files,
      logs,
      producedArtifacts: result.configFiles,
    };
  }
}