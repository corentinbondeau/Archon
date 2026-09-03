import { describe, it, expect, afterEach } from "vitest";
import { makeWebServer } from "../src/web/server.js";
import type { Server } from "node:http";

let server: Server | null = null;

async function start(): Promise<number> {
  const handle = makeWebServer();
  server = handle.server;
  await new Promise<void>((resolve, reject) => {
    server!.once("error", reject);
    server!.listen(0, "127.0.0.1", () => resolve());
  });
  const addr = server.address();
  return typeof addr === "object" && addr ? addr.port : 0;
}

afterEach(async () => {
  if (server) {
    await new Promise<void>((resolve) => server!.close(() => resolve()));
    server = null;
  }
});

describe("WebServer", () => {
  it("sert le formulaire sur /", async () => {
    const port = await start();
    const res = await fetch(`http://127.0.0.1:${port}/`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Archon");
  });

  it("exporte une spec YAML validée sur POST /api/spec", async () => {
    const port = await start();
    const payload = {
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
    const res = await fetch(`http://127.0.0.1:${port}/api/spec`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    expect(res.status).toBe(201);
    const data = (await res.json()) as { file: string; yaml: string };
    expect(data.file).toBe("telescope.yaml");
    expect(data.yaml).toContain("#0ea5e9");
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

  it("refuse une requête GET sur /api/spec", async () => {
    const port = await start();
    const res = await fetch(`http://127.0.0.1:${port}/api/spec`);
    expect(res.status).toBe(405);
  });
});