import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  Deployer,
  detectPlatform,
  writeDeployFiles,
  type DeploymentProfile,
} from "../src/deploy/index.js";
import { DeployAgent } from "../src/agents/index.js";
import { loadSpecForTest } from "./helpers.js";

const SPEC_NEXT = { stack: { framework: "Next.js" } };
const SPEC_EXPRESS = { stack: { framework: "Express" } };

describe("detectPlatform", () => {
  it("détecte Vercel pour un framework supporté", () => {
    const profile = detectPlatform(SPEC_NEXT);
    expect(profile.platform).toBe("vercel");
    expect(profile.configFiles).toContain("vercel.json");
  });

  it("retombe sur Docker pour une stack non supportée", () => {
    const profile = detectPlatform(SPEC_EXPRESS);
    expect(profile.platform).toBe("docker");
    expect(profile.configFiles).toContain("Dockerfile");
  });

  it("reconnaît React/Remix/Astro comme Vercel-friendly", () => {
    for (const framework of ["React", "Remix", "Astro", "SvelteKit"]) {
      expect(
        detectPlatform({ stack: { framework } }).platform,
      ).toBe("vercel");
    }
  });
});

describe("writeDeployFiles", () => {
  async function setupDir(): Promise<string> {
    return mkdtemp(join(tmpdir(), "archon-deploy-"));
  }

  it("écrit vercel.json + CI pour une cible Vercel", async () => {
    const dir = await setupDir();
    try {
      const profile: DeploymentProfile = detectPlatform(SPEC_NEXT);
      const paths = await writeDeployFiles({
        projectDir: dir,
        spec: SPEC_NEXT,
        profile,
      });
      expect(paths).toEqual(
        expect.arrayContaining([
          ".gitignore",
          "vercel.json",
          ".github/workflows/deploy.yml",
        ]),
      );
      const vercel = JSON.parse(
        await readFile(join(dir, "vercel.json"), "utf8"),
      );
      expect(vercel.framework).toBe("nextjs");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("écrit Dockerfile + docker-compose pour une cible Docker", async () => {
    const dir = await setupDir();
    try {
      const profile: DeploymentProfile = detectPlatform(SPEC_EXPRESS);
      const paths = await writeDeployFiles({
        projectDir: dir,
        spec: SPEC_EXPRESS,
        profile,
      });
      expect(paths).toEqual(
        expect.arrayContaining([
          "Dockerfile",
          ".dockerignore",
          "docker-compose.yml",
          ".github/workflows/deploy.yml",
        ]),
      );
      const dockerfile = await readFile(join(dir, "Dockerfile"), "utf8");
      expect(dockerfile).toContain("FROM node:20-alpine");
      expect(dockerfile).toContain('"run", "start"');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("n'écrase pas un vercel.json déjà présent (priorité aux agents)", async () => {
    const dir = await setupDir();
    try {
      const profile: DeploymentProfile = detectPlatform(SPEC_NEXT);
      await writeFile(join(dir, "vercel.json"), "# custom\n");
      const paths = await writeDeployFiles({
        projectDir: dir,
        spec: SPEC_NEXT,
        profile,
      });
      expect(paths).not.toContain("vercel.json");
      expect(await readFile(join(dir, "vercel.json"), "utf8")).toBe("# custom\n");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("écrit le workflow CI GitHub Actions", async () => {
    const dir = await setupDir();
    try {
      const profile: DeploymentProfile = detectPlatform(SPEC_NEXT);
      await writeDeployFiles({ projectDir: dir, spec: SPEC_NEXT, profile });
      // mkdir importé pour vérifier l'écriture récursive du workflow.
      const workflow = await readFile(
        join(dir, ".github/workflows/deploy.yml"),
        "utf8",
      );
      expect(workflow).toContain("Deploy to Vercel");
      expect(workflow).toContain("npm run typecheck");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("Deployer", () => {
  it("dry-run : résume la cible détectée sans effet de bord", async () => {
    const deployer = new Deployer({ dryRun: true });
    const dir = await mkdtemp(join(tmpdir(), "archon-deployer-"));
    // mkdir utilisé pour valider le répertoire cible du Deployer.
    await mkdir(join(dir, ".archon"), { recursive: true });
    try {
      const result = await deployer.deploy({
        projectDir: dir,
        spec: SPEC_NEXT,
        deploy: true,
      });
      expect(result.platform).toBe("vercel");
      expect(result.deployed).toBe(true);
      expect(result.gitInitialized).toBe(true);
      expect(result.logs.join("\n")).toContain("Vercel");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("dry-run sans deploy produit une livraison locale prête", async () => {
    const deployer = new Deployer({ dryRun: true });
    const dir = await mkdtemp(join(tmpdir(), "archon-deployer-"));
    try {
      const result = await deployer.deploy({
        projectDir: dir,
        spec: SPEC_EXPRESS,
        deploy: false,
      });
      expect(result.deployed).toBe(false);
      expect(result.platform).toBe("docker");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("DeployAgent", () => {
  it("produit un AgentOutput avec nom, résumé et artefacts de déploiement", async () => {
    const dir = await mkdtemp(join(tmpdir(), "archon-deploy-agent-"));
    try {
      const agent = new DeployAgent({ dryRun: true });
      const { spec, humanInstructions } = await loadSpecForTest();
      const { ContextManager, MemoryRunStore } = await import("../src/core/index.js");
      const context = await ContextManager.create(
        spec,
        dir,
        new MemoryRunStore(),
        humanInstructions,
      );

      const output = await agent.run({
        spec,
        context,
        runner: {} as never,
        humanInstructions,
        deploy: { enabled: false },
      });

      expect(output.agent).toBe("deploy");
      expect(output.summary).toContain("Vercel");
      expect(output.producedArtifacts).toContain("vercel.json");
      expect(output.files.length).toBeGreaterThan(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});