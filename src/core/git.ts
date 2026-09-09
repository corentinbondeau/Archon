import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

export interface CommitResult {
  sha: string;
  pushed: boolean;
}

export interface GitOptions {
  /** Token GitHub OAuth (auth git via URL HTTPS injectée). */
  token?: string | undefined;
}

function run(cwd: string, args: string[], opts?: GitOptions): Promise<string> {
  return exec("git", args, {
    cwd,
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: "0",
      ...(opts?.token ? { GITHUB_TOKEN: opts.token } : {}),
    },
  }).then((r) => r.stdout.trim());
}

async function isRepo(cwd: string): Promise<boolean> {
  try {
    await run(cwd, ["rev-parse", "--is-inside-work-tree"]);
    return true;
  } catch {
    return false;
  }
}

/** Initialise un dépôt git s'il n'en est pas déjà un. */
export async function initRepo(cwd: string): Promise<void> {
  if (!(await isRepo(cwd))) {
    await run(cwd, ["init", "-b", "main"]);
  }
  await run(cwd, ["config", "user.name", "Archon"]);
  await run(cwd, ["config", "user.email", "archon@local"]);
}

/** Commit tous les changements d'une étape. Retourne le SHA court ("" si rien à commiter). */
export async function commitStep(
  cwd: string,
  message: string,
  token?: string,
): Promise<CommitResult> {
  await initRepo(cwd);
  await run(cwd, ["add", "-A"], { token });

  let sha = "";
  try {
    const commitArgs = ["commit", "-m", message];
    await run(cwd, commitArgs, { token });
    sha = await run(cwd, ["rev-parse", "--short", "HEAD"]);
  } catch (err) {
    const msg = String(err);
    if (msg.includes("nothing to commit")) sha = "";
    else throw err;
  }
  return { sha, pushed: false };
}

/** Parse une cible de dépôt (owner/repo, URL ou nom unique) en informations utiles. */
export function parseRepoTarget(target: string): {
  owner: string;
  repo: string;
  fullName: string;
} {
  const trimmed = target.trim();
  const urlMatch = trimmed.match(/github\.com[:\/]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
  if (urlMatch) {
    const owner = urlMatch[1];
    const repo = urlMatch[2].replace(/\.git$/, "");
    return { owner, repo, fullName: `${owner}/${repo}` };
  }
  const parts = trimmed.replace(/^https?:\/\//, "").split("/").filter(Boolean);
  if (parts.length >= 2) {
    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/, "");
    return { owner, repo, fullName: `${owner}/${repo}` };
  }
  if (parts.length === 1) {
    return { owner: parts[0], repo: parts[0], fullName: parts[0] };
  }
  throw new Error(`Cible de dépôt invalide : "${target}"`);
}

/** Ajoute un remote et pousse la branche main. Retourne l'URL publique. */
export async function pushToRepo(
  cwd: string,
  target: string,
  token?: string,
): Promise<string> {
  const { owner, repo } = parseRepoTarget(target);
  await run(cwd, ["remote", "remove", "archon"], { token }).catch(() => undefined);
  const authUrl = token
    ? `https://x-access-token:${token}@github.com/${owner}/${repo}.git`
    : `https://github.com/${owner}/${repo}.git`;
  await run(cwd, ["remote", "add", "archon", authUrl], { token });
  try {
    await run(cwd, ["push", "-u", "archon", "HEAD:main"], { token });
  } catch (err) {
    throw new Error(
      `Impossible de pousser vers ${owner}/${repo} : ${
        err instanceof Error ? err.message.split("\n").at(-1) : String(err)
      }`,
    );
  }
  return `https://github.com/${owner}/${repo}`;
}