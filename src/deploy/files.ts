import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { DeploymentProfile } from "./platform.js";

/**
 * Écriture déterministe des fichiers de déploiement dans le projet généré.
 * Contrairement aux artefacts produits par les agents (OpenCode), ces fichiers
 * sont générés programmatiquement : leur présence est garantie et leur
 * contenu adapté à la plateforme détectée, pour un livrable réellement
 * "clé en main".
 */

export interface WriteFilesParams {
  projectDir: string;
  spec: { stack: { framework: string }; name?: string };
  profile: DeploymentProfile;
}

const GITIGNORE = `# Dependencies
node_modules/

# Build
dist/
build/
.next/
out/
.turbo/

# Environnement / secrets
.env
.env.*
!.env.example

# Logs
*.log
npm-debug.log*

# OS / IDE
.DS_Store
.idea/
.vscode/

# Archon state
.archon/
`;

const DOCKERIGNORE = `node_modules
npm-debug.log
.git
.gitignore
.archon
.env
dist
.next
build
`;


/** Construit le contenu du Dockerfile selon la stack détectée. */
function dockerfileContent(spec: WriteFilesParams["spec"]): string {
  const isNext = /next/i.test(spec.stack.framework);
  const isNodeDeps = /yarn|pnpm/.test(spec.stack.framework); // non utilisé — conservé pour clarté
  void isNodeDeps;
  if (isNext) {
    // Next.js autonome (output: "standalone") — image finale légère.
    return `FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts || npm install

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
`;
  }
  // Stack générique Node/TS (Express, Fastify, Hono…).
  return `FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts || npm install
COPY . .
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "run", "start"]
`;
}

/** Construit un docker-compose minimal (base de données + app). */
function composeContent(): string {
  return `services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    restart: unless-stopped
`;
}

interface WriteResult {
  paths: string[];
  skipped: { path: string; reason: string }[];
}

async function writeIfMissing(
  projectDir: string,
  rel: string,
  content: string,
  results: WriteResult,
): Promise<void> {
  const target = join(projectDir, rel);
  try {
    await readFile(target, "utf8");
    results.skipped.push({ path: rel, reason: "existe déjà (non écrasé)" });
  } catch {
    await mkdir(join(projectDir, dirOf(rel)), { recursive: true });
    await writeFile(target, content, "utf8");
    results.paths.push(rel);
  }
}

function dirOf(rel: string): string {
  const idx = rel.lastIndexOf("/");
  return idx >= 0 ? rel.slice(0, idx) : ".";
}

/**
 * Écrit les fichiers de déploiement pour la plateforme détectée.
 * Ne jamais écraser un fichier existant (le contenu de l'agent a priorité).
 */
export async function writeDeployFiles(params: WriteFilesParams): Promise<string[]> {
  const { projectDir, profile } = params;
  const results: WriteResult = { paths: [], skipped: [] };

  await writeIfMissing(projectDir, ".gitignore", GITIGNORE, results);

  if (profile.platform === "vercel") {
    await writeIfMissing(
      projectDir,
      "vercel.json",
      JSON.stringify(
        {
          version: 2,
          framework: "nextjs",
          buildCommand: "npm run build",
          installCommand: "npm install",
        },
        null,
        2,
      ) + "\n",
      results,
    );
  } else {
    await writeIfMissing(projectDir, "Dockerfile", dockerfileContent(params.spec), results);
    await writeIfMissing(projectDir, ".dockerignore", DOCKERIGNORE, results);
    await writeIfMissing(projectDir, "docker-compose.yml", composeContent(), results);
  }

  // CI/CD : workflow GitHub Actions qui valide puis déploie sur push.
  await writeIfMissing(
    projectDir,
    ".github/workflows/deploy.yml",
    ciWorkflowContent(profile),
    results,
  );

  return results.paths;
}

/** Workflow GitHub Actions : valide + déploie selon la plateforme. */
function ciWorkflowContent(profile: DeploymentProfile): string {
  const deployStep =
    profile.platform === "vercel"
      ? `      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: \${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: \${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: \${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'`
      : `      - name: Build Docker image
        run: docker build -t app:latest .`;

  return `name: CI / Déploiement

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
${deployStep}
`;
}