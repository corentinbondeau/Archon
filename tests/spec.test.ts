import { describe, it, expect } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadProjectSpec, SpecError } from "../src/core/index.js";

const YAML_SPEC = `
meta:
  format: archon
  version: "0.1"
project:
  name: telescope
  displayName: Telescope Fixture
  baseline: Anticiper les pannes avant qu'elles n'arrivent.
  interfaceKind: dashboard-desktop
palette:
  primary: "#0ea5e9"
  secondary: "#8b5cf6"
  background: "#0f172a"
  foreground: "#f8fafc"
  accent: "#f59e0b"
personas:
  - id: operator
    label: Opérateur d'exploitation
    needs: [supervision temps réel, alertes fiables]
features:
  - id: telemetry-view
    label: Vue télémétrie temps réel
    description: Tableau de bord des métriques systèmes en continu.
  - id: alerting
    label: Alerting prédictif
    description: Détection de dérives avant panne.
  - id: incident-log
    label: Journal d'incidents
    description: Traçabilité des interventions.
journey:
  entry: Connexion à la console
  steps: [Chargement du tableau de bord, Filtrage des flux]
  targetAction: Créer une alerte de détection
stack:
  framework: Next.js
  language: TypeScript
  styling: Tailwind CSS
  orm: Prisma
  database: SQLite
  auth: NextAuth
  integrations: []
constraints:
  - Dark mode natif.
`;

describe("loadProjectSpec (yaml)", () => {
  it("charge et valide un fichier YAML complet", async () => {
    const dir = await mkdtemp(join(tmpdir(), "archon-spec-"));
    const file = join(dir, "spec.yaml");
    await writeFile(file, YAML_SPEC, "utf8");
    const { spec, humanInstructions } = await loadProjectSpec(file);
    expect(spec.name).toBe("telescope");
    expect(spec.palette.primary).toBe("#0ea5e9");
    expect(spec.features).toHaveLength(3);
    expect(spec.stack.orm).toBe("Prisma");
    expect(humanInstructions).toBe("");
    await rm(dir, { recursive: true, force: true });
  });

  it("rejette une couleur hors format hexadécimal", async () => {
    const dir = await mkdtemp(join(tmpdir(), "archon-spec-"));
    const file = join(dir, "spec.yaml");
    await writeFile(
      file,
      YAML_SPEC.replace("primary: \"#0ea5e9\"", "primary: \"notacolor\""),
      "utf8",
    );
    await expect(loadProjectSpec(file)).rejects.toThrow(SpecError);
    await rm(dir, { recursive: true, force: true });
  });

  it("refuse un fichier sans extension prise en charge", async () => {
    const dir = await mkdtemp(join(tmpdir(), "archon-spec-"));
    const file = join(dir, "spec.txt");
    await writeFile(file, "content", "utf8");
    await expect(loadProjectSpec(file)).rejects.toThrow(/Format de spec/);
    await rm(dir, { recursive: true, force: true });
  });
});

describe("loadProjectSpec (markdown + bloc yaml)", () => {
  it("extrait le bloc yaml et conserve les instructions humaines", async () => {
    const dir = await mkdtemp(join(tmpdir(), "archon-spec-"));
    const file = join(dir, "project-spec.md");
    await writeFile(
      file,
      `# Cahier des charges

Voici mes exigences produit : tout doit être sombre et minimaliste.

\`\`\`yaml
${YAML_SPEC}
\`\`\`

## Détails de la baseline
Inclure une landing page no-code pour les opérateurs.
`,
      "utf8",
    );
    const { spec, humanInstructions } = await loadProjectSpec(file);
    expect(spec.name).toBe("telescope");
    expect(humanInstructions).toContain("sombre et minimaliste");
    expect(humanInstructions).toContain("landing page");
    await rm(dir, { recursive: true, force: true });
  });

  it("échoue si aucun bloc yaml n'est présent", async () => {
    const dir = await mkdtemp(join(tmpdir(), "archon-spec-"));
    const file = join(dir, "project-spec.md");
    await writeFile(file, "Pas de bloc yaml ici.", "utf8");
    await expect(loadProjectSpec(file)).rejects.toThrow(/sans bloc/);
    await rm(dir, { recursive: true, force: true });
  });
});