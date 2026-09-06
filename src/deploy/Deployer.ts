import { spawn } from "node:child_process";
import {
  detectPlatform,
  platformLabel,
  type DeploymentProfile,
  type DeploymentPlatform,
} from "./platform.js";
import { writeDeployFiles } from "./files.js";

/** Souche de spec nécessaire à la détection de plateforme. */
export interface DeployableSpec {
  stack: { framework: string };
}

/**
 * Résultat du déploiement d'une application générée.
 */
export interface DeployResult {
  /** Plateforme de déploiement utilisée. */
  platform: DeploymentPlatform;
  /** Configuration de plateforme détectée. */
  profile: DeploymentProfile;
  /** true si le déploiement a été pleinement réalisé. */
  deployed: boolean;
  /** Fichiers de déploiement écrits (chemins relatifs). */
  configFiles: string[];
  /** URL publique de l'application si connue. */
  url?: string;
  /** Dépôt git créé localement. */
  gitInitialized: boolean;
  /** Commit créé (hash court). */
  commit?: string;
  /** Dépôt distant poussé (si URL fournie). */
  remotePushed?: boolean;
  /** Lignes de log produites par le processus. */
  logs: string[];
  /** Optionnel : raison d'un échec partiel. */
  error?: string;
}

export interface DeployerOptions {
  /** Simulation complète sans effet de bord (tests). */
  dryRun?: boolean;
}

/** Sortie d'une commande shell exécutée dans le répertoire projet. */
interface CommandResult {
  code: number;
  stdout: string;
  stderr: string;
}

function runCommand(
  cmd: string,
  args: string[],
  cwd: string,
  logs: string[],
): Promise<CommandResult> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const push = (chunk: string): void => {
      for (const line of chunk.split("\n")) {
        const t = line.trim();
        if (t && logs) logs.push(t);
      }
    };
    proc.stdout?.setEncoding("utf8");
    proc.stderr?.setEncoding("utf8");
    proc.stdout?.on("data", (c: string) => {
      stdout += c;
      push(c);
    });
    proc.stderr?.on("data", (c: string) => {
      stderr += c;
      push(c);
    });
    proc.on("error", (err) => {
      resolve({ code: -1, stdout, stderr: `${stderr}\n${err.message}` });
    });
    proc.on("close", (code) => {
      resolve({ code: code ?? -1, stdout, stderr });
    });
  });
}

/**
 * Déployeur "clé en main" : après la génération du code source, il écrit les
 * fichiers de déploiement (déterministes), initialise git, crée le commit
 * initial et déclenche le déploiement vers la cible détectée.
 *
 * Séquence :
 * 1. Écriture des fichiers de config (vercel.json ou Dockerfile + CI).
 * 2. `git init` (si nécessaire) + `git add -A`.
 * 3. Commit initial.
 * 4. Push vers le dépôt distant si fourni (déclenche l'auto-deploy PaaS).
 * 5. Déploiement direct : `vercel deploy --prod` (si VERCEL_TOKEN/CLI) ou
 *    `docker build` (validation d'image conteneur).
 */
export class Deployer {
  private readonly dryRun: boolean;

  constructor(options: DeployerOptions = {}) {
    this.dryRun = options.dryRun ?? false;
  }

  async deploy(params: {
    projectDir: string;
    spec: DeployableSpec;
    commitMessage?: string;
    remoteUrl?: string;
    deploy?: boolean;
  }): Promise<DeployResult> {
    const {
      projectDir,
      spec,
      commitMessage = "feat: application générée par Archon",
      remoteUrl,
      deploy = true,
    } = params;
    const logs: string[] = [];
    const profile = detectPlatform(spec);

    if (this.dryRun) {
      logs.push(`[dry-run] fichiers de déploiement + git + ${platformLabel(profile.platform)} dans ${projectDir}`);
      return {
        platform: profile.platform,
        profile,
        deployed: deploy,
        configFiles: profile.configFiles,
        gitInitialized: true,
        remotePushed: !!remoteUrl,
        logs,
      };
    }

    // 1. Fichiers de déploiement déterministes (clé en main garanti).
    const configFiles = await writeDeployFiles({
      projectDir,
      spec,
      profile,
    });

    // 2. git init si le répertoire n'est pas déjà un dépôt.
    let gitInitialized = false;
    if (!(await isGitRepo(projectDir))) {
      const init = await runCommand("git", ["init"], projectDir, logs);
      if (init.code !== 0) {
        return {
          platform: profile.platform,
          profile,
          deployed: false,
          configFiles,
          gitInitialized: false,
          logs,
          error: `git init a échoué : ${init.stderr.trim()}`,
        };
      }
      gitInitialized = true;
    }

    // 3. Commit initial.
    await runCommand("git", ["add", "-A"], projectDir, logs);
    const commit = await runCommand("git", ["commit", "-m", commitMessage], projectDir, logs);
    if (commit.code !== 0 && !commit.stderr.toLowerCase().includes("nothing to commit")) {
      return {
        platform: profile.platform,
        profile,
        deployed: false,
        configFiles,
        gitInitialized,
        logs,
        error: `git commit a échoué : ${commit.stderr.trim()}`,
      };
    }

    // 4. Push vers un dépôt distant (déclenche l'auto-deploy des PaaS).
    let remotePushed = false;
    if (remoteUrl) {
      await runCommand("git", ["remote", "remove", "origin"], projectDir, logs);
      await runCommand("git", ["remote", "add", "origin", remoteUrl], projectDir, logs);
      const push = await runCommand("git", ["push", "-u", "origin", "HEAD"], projectDir, logs);
      remotePushed = push.code === 0;
      if (!remotePushed) logs.push(`[warning] push à distance échoué (code ${push.code}).`);
    }

    // 5. Déploiement ciblé selon la plateforme détectée.
    const commitHash = extractCommitHash(commit.stdout);
    if (deploy) {
      const deployment = await this.deployPlatform(projectDir, profile, logs);
      return {
        ...deployment,
        configFiles,
        gitInitialized,
        remotePushed,
        logs,
        ...(commitHash ? { commit: commitHash } : {}),
      };
    }

    return {
      platform: profile.platform,
      profile,
      deployed: false,
      configFiles,
      gitInitialized,
      remotePushed,
      logs,
      ...(commitHash ? { commit: commitHash } : {}),
    };
  }

  private async deployPlatform(
    projectDir: string,
    profile: DeploymentProfile,
    logs: string[],
  ): Promise<Omit<DeployResult, "configFiles" | "gitInitialized" | "logs" | "remotePushed" | "commit">> {
    // Sans jeton, aucun déploiement distant : on signale juste l'omission.
    if (this.dryRun || !process.env.VERCEL_TOKEN) {
      logs.push(
        `[déploiement sauté] ${platformLabel(profile.platform)} — indiquez VERCEL_TOKEN (ou une remote git) pour déployer automatiquement.`,
      );
      return { platform: profile.platform, profile, deployed: false };
    }

    if (profile.platform === "vercel") {
      logs.push("Déploiement Vercel (production)…");
      const { code, stdout } = await runCommand("npx", ["vercel", "deploy", "--prod", "--yes"], projectDir, logs);
      const urlMatch = stdout.match(/https:\/\/[\w.-]+\.vercel\.app/);
      return {
        platform: "vercel",
        profile,
        deployed: code === 0,
        ...(urlMatch ? { url: urlMatch[0] } : {}),
        ...(code !== 0 ? { error: `vercel deploy a échoué (code ${code}).` } : {}),
      };
    }

    // Docker : pas de cible de conteneur par défaut (Railway/Fly/AWS/GCP) ;
    // on valide que l'image conteneur se construit correctement.
    logs.push("[docker] Validation : construction de l'image conteneur locale…");
    const { code } = await runCommand("docker", ["build", "-t", "archon-app", "."], projectDir, logs);
    if (code !== 0) {
      return {
        platform: "docker",
        profile,
        deployed: false,
        error: "docker build a échoué : vérifiez le Dockerfile généré.",
      };
    }
    return { platform: "docker", profile, deployed: true };
  }
}

async function isGitRepo(projectDir: string): Promise<boolean> {
  const { code } = await runCommand("git", ["rev-parse", "--is-inside-work-tree"], projectDir, []);
  return code === 0;
}

function extractCommitHash(stdout: string): string | undefined {
  const m = stdout.match(/\[[^\]]+\s([0-9a-f]{7,40})\]/);
  return m ? m[1] : undefined;
}