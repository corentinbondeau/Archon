import { describe, it, expect } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildProjectSpec,
  serializeSpecYaml,
  slugify,
  loadProjectSpec,
} from "../src/core/index.js";
import type { SpecInput } from "../src/core/index.js";

const validInput: SpecInput = {
  name: "telescope",
  displayName: "Telescope",
  baseline: "Anticiper les pannes avant qu'elles n'arrivent.",
  interfaceKind: "dashboard-desktop",
  palette: {
    primary: "#0ea5e9",
    secondary: "#8b5cf6",
    background: "#0f172a",
    foreground: "#f8fafc",
    accent: "#f59e0b",
  },
  personas: [{ id: "operator", label: "Opérateur", needs: ["supervision"] }],
  features: [
    { id: "alerting", label: "Alerting", description: "Détection de dérives." },
  ],
  journey: { entry: "Connexion", steps: [], targetAction: "Créer une alerte" },
  stack: {
    framework: "Next.js",
    language: "TypeScript",
    styling: "Tailwind CSS",
    orm: "Prisma",
    database: "SQLite",
    auth: "NextAuth",
    integrations: [],
  },
  constraints: [],
};

describe("specWriter", () => {
  it("construit une spec canonique validée", () => {
    const spec = buildProjectSpec(validInput);
    expect(spec.name).toBe("telescope");
    expect(spec.palette.primary).toBe("#0ea5e9");
    expect(spec.features).toHaveLength(1);
  });

  it("refuse une couleur invalide avec un message exploitable", () => {
    expect(() =>
      buildProjectSpec({ ...validInput, palette: { ...validInput.palette, primary: "rouge" } }),
    ).toThrow(/hexad/);
  });

  it("sérialise puis se relit via loadProjectSpec (aller-retour)", async () => {
    const spec = buildProjectSpec(validInput);
    const yaml = serializeSpecYaml(spec);
    const dir = await mkdtemp(join(tmpdir(), "archon-writer-"));
    const file = join(dir, "spec.yaml");
    await writeFile(file, yaml, "utf8");

    const { spec: reloaded } = await loadProjectSpec(file);
    expect(reloaded.displayName).toBe("Telescope");
    expect(reloaded.palette.accent).toBe("#f59e0b");
    expect(reloaded.stack.database).toBe("SQLite");
    // Les listes vides sont omises mais restaurées avec leurs valeurs par défaut.
    expect(reloaded.constraints).toEqual([]);
    expect(reloaded.stack.integrations).toEqual([]);
    await rm(dir, { recursive: true, force: true });
  });

  it("écrase une couleur à la sérialisation si user la fournit", () => {
    const spec = buildProjectSpec({
      ...validInput,
      palette: { ...validInput.palette, accent: "#22c55e" },
    });
    expect(serializeSpecYaml(spec)).toContain('accent: "#22c55e"');
  });
});

describe("slugify", () => {
  it("normalise accent, casse et espaces", () => {
    expect(slugify("Anticiper les Pannes !")).toBe("anticiper-les-pannes");
    expect(slugify("Téléscope")).toBe("telescope");
  });
});