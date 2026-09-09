import { randomUUID } from "node:crypto";

/**
 * Authentification GitHub via device flow (et le client OAuth public utilisé
 * par les outils Copilot). Le token reste en mémoire du serveur local :
 * il est injecté dans l'environnement des process opencode (`GITHUB_TOKEN`)
 * et sert à l'authentification git pour les commits/push.
 */

const GITHUB_API = "https://api.github.com";
const DEVICE_CODE_URL = "https://github.com/login/device/code";
const ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token";

/** Client OAuth public partagé par les intégrations Copilot. */
const COPILOT_CLIENT_ID = "Iv1.b507a08c87ecfe98";

/** Scopes demandés : lecture profil + accès dépôts pour les commits/push. */
const SCOPES = "read:user repo workflow";

const UA = {
  "user-agent": "Archon/0.1",
  accept: "application/json",
};

export interface DeviceFlow {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  intervalSec: number;
  expiresSec: number;
}

export interface GitHubUser {
  login: string;
  id: number;
  name: string | null;
  avatarUrl: string;
}

export interface GitHubRepo {
  name: string;
  fullName: string;
  private: boolean;
  htmlUrl: string;
}

interface DeviceCodeResponse {
  device_code?: string;
  user_code?: string;
  verification_uri?: string;
  expires_in?: number;
  interval?: number;
  error?: string;
  error_description?: string;
}

interface AccessTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

/** Démarre le device flow : renvoie le code à afficher à l'utilisateur. */
export async function startDeviceFlow(): Promise<DeviceFlow> {
  const body = JSON.stringify({ client_id: COPILOT_CLIENT_ID, scope: SCOPES });
  const res = await fetch(DEVICE_CODE_URL, {
    method: "POST",
    headers: { ...UA, "content-type": "application/json" },
    body,
  });
  if (!res.ok) {
    throw new Error(`GitHub a refusé la demande (HTTP ${res.status}).`);
  }
  const data = (await res.json()) as DeviceCodeResponse;
  if (data.error || !data.device_code) {
    throw new Error(
      data.error_description ??
        `Erreur GitHub : ${data.error ?? "réponse inattendue"}`,
    );
  }
  return {
    deviceCode: data.device_code,
    userCode: data.user_code!,
    verificationUri: data.verification_uri ?? "https://github.com/login/device",
    intervalSec: data.interval ?? 5,
    expiresSec: data.expires_in ?? 900,
  };
}

export type PollResult =
  | { status: "pending" | "slow_down" | "denied" | "expired" }
  | { status: "authorized"; token: string };

function pollErrorCategory(category: "pending" | "slow_down" | "denied" | "expired"): PollResult {
  return { status: category };
}

/** Interroge le device flow en attendant l'autorisation de l'utilisateur. */
export async function pollDeviceFlow(
  deviceCode: string,
): Promise<PollResult> {
  const res = await fetch(ACCESS_TOKEN_URL, {
    method: "POST",
    headers: { ...UA, "content-type": "application/json" },
    body: JSON.stringify({
      client_id: COPILOT_CLIENT_ID,
      device_code: deviceCode,
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    }),
  });
  if (!res.ok) return pollErrorCategory("denied");
  const data = (await res.json()) as AccessTokenResponse;
  if (data.access_token) return { status: "authorized", token: data.access_token };
  switch (data.error) {
    case "authorization_pending":
      return { status: "pending" };
    case "slow_down":
      return { status: "slow_down" };
    case "expired_token":
      return { status: "expired" };
    case "access_denied":
      return { status: "denied" };
    default:
      return { status: "pending" };
  }
}

/** Charge le profil GitHub de l'utilisateur. */
export async function fetchGitHubUser(token: string): Promise<GitHubUser> {
  const res = await fetch(`${GITHUB_API}/user`, {
    headers: { ...UA, authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Impossible de récupérer le profil GitHub.");
  const data = (await res.json()) as {
    login: string;
    id: number;
    name: string | null;
    avatar_url: string;
  };
  return { login: data.login, id: data.id, name: data.name, avatarUrl: data.avatar_url };
}

/** Liste les dépôts accessibles pour choisir le dépôt cible. */
export async function fetchGitHubRepos(token: string): Promise<GitHubRepo[]> {
  const res = await fetch(
    `${GITHUB_API}/user/repos?per_page=100&sort=updated&visibility=all`,
    { headers: { ...UA, authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error("Impossible de récupérer la liste des dépôts.");
  const data = (await res.json()) as Array<{
    name: string;
    full_name: string;
    private: boolean;
    html_url: string;
  }>;
  return data.map((r) => ({
    name: r.name,
    fullName: r.full_name,
    private: r.private,
    htmlUrl: r.html_url,
  }));
}

/** Crée un dépôt GitHub (si le nom ciblé n'existe pas encore). */
export async function createGitHubRepo(
  token: string,
  name: string,
  isPrivate: boolean,
): Promise<GitHubRepo> {
  const res = await fetch(`${GITHUB_API}/user/repos`, {
    method: "POST",
    headers: { ...UA, authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ name, private: isPrivate, auto_init: false }),
  });
  if (!res.ok) {
    throw new Error(
      `Impossible de créer le dépôt "${name}" (HTTP ${res.status}).`,
    );
  }
  const data = (await res.json()) as {
    name: string;
    full_name: string;
    private: boolean;
    html_url: string;
  };
  return {
    name: data.name,
    fullName: data.full_name,
    private: data.private,
    htmlUrl: data.html_url,
  };
}

/** Gestionnaire en mémoire d'une session GitHub authentifiée. */
export class GitHubSessionStore {
  private readonly tokens = new Map<string, string>();

  setToken(key: string, token: string): void {
    this.tokens.set(key, token);
  }

  getToken(key: string): string | undefined {
    return this.tokens.get(key);
  }

  deleteToken(key: string): void {
    this.tokens.delete(key);
  }

  /** Clé de session unique (générée au démarrage de l'auth). */
  static newKey(): string {
    return randomUUID();
  }
}