import { describe, it, expect } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  ContextManager,
  MemoryRunStore,
  Orchestrator,
  ensureProjectDir,
} from "../src/core/index.js";
import type { AgentName } from "../src/core/index.js";
import { OpenCodeRunner } from "../src/adapters/index.js";
import type { RunRequest, RunResult } from "../src/adapters/index.js";
import { createDefaultAgents } from "../src/agents/index.js";
import { loadSpecForTest } from "./helpers.js";

/**
 * Faux runner : mime une invocation OpenCode réussie ou en échec, en
 * fonction du titre de session (`archon/<agent>`).
 */
class FakeRunner extends OpenCodeRunner {
  calls: string[] = [];
  failOn: AgentName[] = [];

  override async run(req: RunRequest): Promise<RunResult> {
    const agent = (req.title ?? "archon/unknown").replace("archon/", "");
    this.calls.push(agent);
    if (this.failOn.includes(agent as AgentName)) {
      return {
        text: "",
        session: `ses_${agent}`,
        files: [],
        exitCode: 1,
        stderr: `Erreur simulée pour ${agent}`,
      };
    }
    return {
      text: `Livrable ${agent} généré.`,
      session: `ses_${agent}`,
      files: [
        { path: join(req.cwd, "ARCH.md"), action: "create" },
        { path: join(req.cwd, "src/lib/types.ts"), action: "create" },
      ],
      exitCode: 0,
      stderr: "",
    };
  }
}

async function buildOrchestrator(options: {
  runner: FakeRunner;
  projectDir: string;
}) {
  await ensureProjectDir(options.projectDir);
  const { spec, humanInstructions } = await loadSpecForTest();
  const store = new MemoryRunStore();
  const context = await ContextManager.create(
    spec,
    options.projectDir,
    store,
    humanInstructions,
    true,
  );
  return new Orchestrator(createDefaultAgents({ deployDryRun: true }), context, {
    runner: options.runner,
  });
}

describe("Orchestrator", () => {
  it("exécute les agents du pipeline dans l'ordre et marque la fin de run", async () => {
    const runner = new FakeRunner();
    const output = await mkdtemp(join(tmpdir(), "archon-ok-"));
    const orch = await buildOrchestrator({ runner, projectDir: output });

    const result = await orch.run();

    expect(result.completed).toBe(true);
    // Les 5 agents de génération passent par OpenCode ; `deploy` s'exécute
    // en dernier sans invoquer le runner (opération déterministe).
    expect(runner.calls).toEqual([
      "architect",
      "backend",
      "frontend",
      "qa",
      "devops",
    ]);
    expect(result.outputs.map((o) => o.agent)).toEqual([
      "architect",
      "backend",
      "frontend",
      "qa",
      "devops",
      "deploy",
    ]);
    expect(result.stats.agentsRun).toBe(6);
    expect(result.stats.filesTouched).toBeGreaterThan(0);
    expect(orch.context.isCompleted()).toBe(true);
  });

  it("enchaîne le contexte : le frontend reçoit les artefacts architect+backend", async () => {
    const runner = new FakeRunner();
    const output = await mkdtemp(join(tmpdir(), "archon-ctx-"));
    const orch = await buildOrchestrator({ runner, projectDir: output });

    await orch.run();

    const ctx = orch.context;
    expect(ctx.getArtifacts("architect")).toContain("ARCH.md");
    expect(ctx.getArtifacts("backend")).toContain("src/lib/types.ts");
  });

  it("interrompt le pipeline sur l'échec d'un agent", async () => {
    const runner = new FakeRunner();
    runner.failOn = ["frontend"];
    const output = await mkdtemp(join(tmpdir(), "archon-fail-"));
    const orch = await buildOrchestrator({ runner, projectDir: output });

    const result = await orch.run();

    expect(result.completed).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].agent).toBe("frontend");
    expect(result.errors[0].error?.exitCode).toBe(1);
    // Le pipeline s'est arrêté après frontend : qa et devops non appelés.
    expect(runner.calls).toEqual(["architect", "backend", "frontend"]);
    expect(orch.context.getFatalError()?.message).toMatch(/code de sortie non nul/);
  });

  it("reprend à l'étape suivante après un échec si on relance", async () => {
    const runner = new FakeRunner();
    runner.failOn = ["backend"];
    const output = await mkdtemp(join(tmpdir(), "archon-resume-"));
    const orch = await buildOrchestrator({ runner, projectDir: output });

    const first = await orch.run();
    expect(first.completed).toBe(false);
    expect(orch.context.getLastAgent()).toBe("architect");

    // Le runner ne re-échoue plus : la relance couvre backend → devops.
    runner.failOn = [];
    runner.calls = [];
    const second = await orch.run();
    expect(runner.calls).toEqual(["backend", "frontend", "qa", "devops"]);
    expect(second.completed).toBe(true);
    expect(second.errors).toHaveLength(0);
  });
});