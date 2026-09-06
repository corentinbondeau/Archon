/**
 * Détection automatique de la cible de déploiement à partir de la stack.
 * Aucun champ spec nécessaire : la plateforme est déduite du framework et
 * de la base de données déclarés dans le cahier des charges.
 */

export type DeploymentPlatform = "vercel" | "docker";

export interface DeploymentProfile {
  /** Plateforme retenue pour le déploiement. */
  platform: DeploymentPlatform;
  /** Justification lisible de la détection. */
  reason: string;
  /** Fichiers de déploiement attendus (relatifs) pour cette cible. */
  configFiles: string[];
}

/** Frameworks déployables nativement et gratuitement sur Vercel. */
const VERCEL_FRIENDLY: RegExp[] = [
  /next/i,
  /react/i,
  /svelte/i,
  /vue/i,
  /remix/i,
  /astro/i,
  /nuxt/i,
  /gatsby/i,
];

/**
 * Détecte la plateforme de déploiement la plus adaptée :
 * - Vercel si le framework est nativement supporté (Next.js, React…).
 * - Sinon Docker (portabilité maximale, toute stack).
 */
export function detectPlatform(spec: {
  stack: { framework: string };
}): DeploymentProfile {
  const framework = spec.stack.framework ?? "";

  const isVercelFriendly = VERCEL_FRIENDLY.some((re) => re.test(framework));

  if (isVercelFriendly) {
    return {
      platform: "vercel",
      reason: `Framework "${framework}" nativement supporté par Vercel. Déploiement serverless clé en main.`,
      configFiles: ["vercel.json"],
    };
  }

  return {
    platform: "docker",
    reason: `Stack "${framework}" non couverte nativement par Vercel ; utilisation d'un conteneur Docker (déployable n'importe où).`,
    configFiles: ["Dockerfile", ".dockerignore", "docker-compose.yml"],
  };
}

/** Nom lisible de la plateforme pour les logs CLI. */
export function platformLabel(platform: DeploymentPlatform): string {
  return platform === "vercel" ? "Vercel (serverless)" : "Docker (conteneur)";
}
