import { describe, it, expect, afterEach } from "vitest";
import { makeWebServer } from "../src/web/server.js";
import type { Server } from "node:http";
import type { PipelineRunner, PipelineProgress } from "../src/core/runPipeline.js";

let server: Server | null = null;

async function start(
  autoLaunch = false,
  override: Partial<Parameters<typeof makeWebServer>[0]> = {},
): Promise<number> {
  const handle = makeWebServer({
    port: 0,
    autoLaunch,
    workDir: "/tmp/archon-test-work",
    presetToken: "test-token",
    presetLogin: "demo",
    runnerFactory: () => fakeRunner(),
    ...override,
  });
  server = handle.server;
  await new Promise<void>((resolve, reject) => {
    server!.once("error", reject);
    server!.listen(0, "127.0.0.1", () => resolve());
  });
  const addr = server.address();
  return typeof addr === "object" && addr ? addr.port : 0;
}

/** Faux lanceur : imite un pipeline terminé, sans invoquer OpenCode. */
function fakeRunner(): PipelineRunner {
  const progress: PipelineProgress = {
    agent: null,
    step: null,
    totalSteps: 6,
    status: "idle",
    outputs: [],
    errors: [],
    commits: [],
  };
  return {
    async start(_specPath) {
      progress.status = "done";
      progress.summary = "Livraison prête.";
      return progress;
    },
    progress() {
      return progress;
    },
  };
}

afterEach(async () => {
  if (server) {
    await new Promise<void>((resolve) => server!.close(() => resolve()));
    server = null;
  }
});

const VALID_PAYLOAD = {
  name: "telescope",
  displayName: "Telescope",
  baseline: "Anticiper les pannes.",
  interfaceKind: "dashboard-desktop",
  palette: {
    primary: "#0ea5e9",
    secondary: "#8b5cf6",
    background: "#0f172a",
    foreground: "#f8fafc",
    accent: "#f59e0b",
  },
  personas: [{ id: "op", label: "Opérateur", needs: ["supervision"] }],
  features: [{ id: "alerts", label: "Alerting", description: "Détecter." }],
  journey: { entry: "Connexion", steps: [], targetAction: "Alerter" },
  stack: {
    framework: "Next.js",
    language: "TypeScript",
    styling: "Tailwind",
    orm: "Prisma",
    database: "SQLite",
    auth: "NextAuth",
    integrations: [],
  },
};

describe("WebServer", () => {
  it("sert le formulaire sur /", async () => {
    const port = await start();
    const res = await fetch(`http://127.0.0.1:${port}/`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Archon");
  });

  it("valide une spec sur POST /api/spec", async () => {
    const port = await start();
    const res = await fetch(`http://127.0.0.1:${port}/api/spec`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...VALID_PAYLOAD, repo: "demo/utilisateur" }),
    });
    expect(res.status).toBe(201);
    const data = (await res.json()) as { status: string };
    expect(data.status).toBe("spec-only");
  });

  it("refuse sans GitHub ni dépôt cible", async () => {
    const port = await start(false, { presetToken: undefined });
    const res = await fetch(`http://127.0.0.1:${port}/api/spec`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(VALID_PAYLOAD),
    });
    expect(res.status).toBe(422);
    const data = (await res.json()) as { error: string };
    expect(data.error).toContain("Connectez-vous");
  });

  it("lance le pipeline automatiquement et expose un run interrogeable", async () => {
    const port = await start(true);
    const res = await fetch(`http://127.0.0.1:${port}/api/spec`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...VALID_PAYLOAD, repo: "demo/utilisateur" }),
    });
    expect(res.status).toBe(201);
    const data = (await res.json()) as {
      runId: string;
      status: string;
      repo?: string;
    };
    expect(data.runId).toBeTruthy();
    expect(data.status).toBe("launching");
    expect(data.repo).toBe("demo/utilisateur");

    // Le run progresse et peut être interrogé.
    await new Promise((r) => setTimeout(r, 50));
    const poll = await fetch(`http://127.0.0.1:${port}/api/run/${data.runId}`);
    expect(poll.status).toBe(200);
    const progress = (await poll.json()) as { status: string; summary?: string };
    expect(progress.status).toBe("done");
    expect(progress.summary).toContain("Livraison prête");
  });

  it("répond 422 avec le détail des erreurs de validation", async () => {
    const port = await start();
    const bad = {
      name: "x",
      displayName: "x",
      baseline: "b",
      interfaceKind: "dashboard-desktop",
      palette: {
        primary: "pashex",
        secondary: "#8b5cf6",
        background: "#0f172a",
        foreground: "#f8fafc",
        accent: "#f59e0b",
      },
      personas: [],
      features: [],
      journey: { entry: "", steps: [], targetAction: "" },
      stack: {
        framework: "",
        styling: "",
        orm: "",
        database: "",
        auth: "",
      },
    };
    const res = await fetch(`http://127.0.0.1:${port}/api/spec`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(bad),
    });
    expect(res.status).toBe(422);
    const data = (await res.json()) as { error: string };
    expect(data.error).toContain("Spécification invalide");
  });

  it("retourne 404 sur une route inconnue", async () => {
    const port = await start();
    const res = await fetch(`http://127.0.0.1:${port}/api/nope`);
    expect(res.status).toBe(404);
  });
});