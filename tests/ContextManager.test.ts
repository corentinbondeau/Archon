import { describe, it, expect, beforeEach } from "vitest";
import {
  ContextManager,
  MemoryRunStore,
} from "../src/core/index.js";
import { loadSpecForTest } from "./helpers.js";

async function makeContext(): Promise<{
  ctx: ContextManager;
  store: MemoryRunStore;
}> {
  const { spec, humanInstructions } = await loadSpecForTest();
  const store = new MemoryRunStore();
  const ctx = await ContextManager.create(
    spec,
    "/tmp/archon-test/project-a",
    store,
    humanInstructions,
  );
  return { ctx, store };
}

describe("ContextManager", () => {
  let fixture: { ctx: ContextManager; store: MemoryRunStore };

  beforeEach(async () => {
    fixture = await makeContext();
  });

  it("expose la spec et le répertoire projet", () => {
    expect(fixture.ctx.getSpec().name).toBe("telescope");
    expect(fixture.ctx.getProjectDir()).toContain("project-a");
  });

  it("enregistre et fournit les artefacts d'un agent", () => {
    fixture.ctx.recordArtifacts("architect", ["/tmp/archon-test/project-a/ARCH.md"]);
    const artifacts = fixture.ctx.getArtifacts("architect");
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0]).toBe("ARCH.md");
  });

  it("sélectionne les artefacts antérieurs pour un agent (pas les siens)", () => {
    fixture.ctx.recordArtifacts("architect", ["/tmp/archon-test/project-a/ARCH.md"]);
    fixture.ctx.recordArtifacts("backend", ["/tmp/archon-test/project-a/src/lib/types.ts"]);
    const forFrontend = fixture.ctx.getContextFor("frontend");
    expect(forFrontend.map((c) => c.path)).toEqual([
      "ARCH.md",
      "src/lib/types.ts",
    ]);
  });

  it("calcule la position de reprise après une étape terminée", () => {
    fixture.ctx.setLastAgent("backend");
    const pos = fixture.ctx.getResumePosition([
      "architect",
      "backend",
      "frontend",
      "qa",
      "devops",
    ]);
    expect(pos).not.toBeNull();
    expect(pos!.agent).toBe("frontend");
  });

  it("persiste puis recharge l'état via le store", async () => {
    fixture.ctx.log("architect", "info", "hello");
    fixture.ctx.setLastAgent("architect");
    await fixture.ctx.persist();

    const { spec, humanInstructions } = await loadSpecForTest();
    const merged = await ContextManager.create(
      spec,
      "/tmp/archon-test/project-a",
      fixture.store,
      humanInstructions,
      true,
    );
    expect(merged.getLastAgent()).toBe("architect");
    expect(merged.getHumanInstructions()).toBe(humanInstructions);
  });
});