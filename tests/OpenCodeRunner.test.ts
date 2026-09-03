import { describe, it, expect } from "vitest";
import { mkdtemp, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  OpenCodeRunner,
  OpenCodeRunnerError,
} from "../src/adapters/index.js";
import { writeFakeOpenCodeBin } from "./helpers.js";

describe("OpenCodeRunner.buildArgs", () => {
  it("construit une ligne headless déterministe", () => {
    const runner = new OpenCodeRunner({ model: "anthropic/claude-sonnet" });
    const args = runner.buildArgs({
      cwd: "/tmp/proj",
      prompt: "Fais le travail",
      title: "archon/architect",
    });
    expect(args).toEqual([
      "run",
      "--format",
      "json",
      "--model",
      "anthropic/claude-sonnet",
      "--title",
      "archon/architect",
      "Fais le travail",
    ]);
  });

  it("injecte --auto et --continue selon les options", () => {
    const runner = new OpenCodeRunner({ autoApprove: true });
    const fwd = runner.buildArgs({ cwd: ".", prompt: "x" });
    const resume = runner.buildArgs({ cwd: ".", prompt: "x" }, true);
    expect(fwd).toContain("--auto");
    expect(resume).toContain("--continue");
    expect(resume).not.toContain("--session");
  });
});

describe("OpenCodeRunner.run (binaire fictif NDJSON)", () => {
  it("parse les événements texte et fichier d'un run réussi", async () => {
    const bin = await writeFakeOpenCodeBin("ok");
    const cwd = await mkdtemp(join(tmpdir(), "archon-run-ok-"));
    await mkdir(cwd, { recursive: true });

    const runner = new OpenCodeRunner({ binary: bin, timeoutMs: 10000 });
    const result = await runner.run({
      cwd,
      prompt: "génère l'architecture",
      title: "archon/architect",
    });

    expect(result.exitCode).toBe(0);
    expect(result.session).toBe("ses_test_1");
    expect(result.text).toBe("fichiers créés");
    expect(result.files).toHaveLength(1);
    expect(result.files[0].path).toBe(join(cwd, "ARCH.md"));
    expect(result.files[0].action).toBe("create");
  });

  it("remonte un échec avec code de sortie et stderr", async () => {
    const bin = await writeFakeOpenCodeBin("error");
    const cwd = await mkdtemp(join(tmpdir(), "archon-run-err-"));
    await mkdir(cwd, { recursive: true });

    const runner = new OpenCodeRunner({ binary: bin });
    const result = await runner.run({ cwd, prompt: "échoue" });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("erreur simulée");
    expect(result.files).toHaveLength(0);
  });

  it("lève une erreur explicite si le binaire est introuvable", async () => {
    const runner = new OpenCodeRunner({
      binary: "/chemin/inexistant/opencode",
    });
    await expect(
      runner.run({ cwd: "/tmp", prompt: "x" }),
    ).rejects.toThrow(OpenCodeRunnerError);
  });
});