import { mkdtemp, mkdir, writeFile, chmod } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadProjectSpec } from "../src/core/index.js";
import type { ProjectSpec } from "../src/core/index.js";

const FIXTURE_DIR = join(tmpdir(), "archon-test");
const SPEC_FILE = join(FIXTURE_DIR, "telescope.yaml");

const SPEC_YAML = `
project:
  name: telescope
  displayName: Telescope
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
    needs: [supervision temps réel]
features:
  - id: telemetry-view
    label: Vue télémétrie
    description: Tableau de bord des métriques en continu.
  - id: alerting
    label: Alerting prédictif
    description: Détection de dérives avant panne.
  - id: incident-log
    label: Journal d'incidents
    description: Traçabilité des interventions.
journey:
  entry: Connexion à la console
  steps: [Chargement du tableau de bord]
  targetAction: Créer une alerte
stack:
  framework: Next.js
  language: TypeScript
  styling: Tailwind CSS
  orm: Prisma
  database: SQLite
  auth: NextAuth
  integrations: []
`;

let cached: { spec: ProjectSpec; humanInstructions: string } | null = null;

/** Charge (une fois) la spec de test et crée le répertoire fictif. */
export async function loadSpecForTest(): Promise<{
  spec: ProjectSpec;
  humanInstructions: string;
}> {
  if (cached) return cached;
  await mkdir(FIXTURE_DIR, { recursive: true });
  await writeFile(SPEC_FILE, SPEC_YAML, "utf8");
  cached = await loadProjectSpec(SPEC_FILE);
  return cached;
}

/** Ecrit un binaire fictif émettant du NDJSON OpenCode de façon déterministe. */
export async function writeFakeOpenCodeBin(
  scenario: "ok" | "error",
): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "archon-fake-bin-"));
  const bin = join(dir, "opencode.sh");
  const readArgs =
    'echo "ARGS=$@"; ';
  const events =
    scenario === "ok"
      ? [
          'echo \'{"type":"step_start","sessionID":"ses_test_1","part":{"type":"step-start"}}\'',
          'echo \'{"type":"text","sessionID":"ses_test_1","part":{"type":"text","text":"fichiers créés"}}\'',
          'echo \'{"type":"file","sessionID":"ses_test_1","part":{"type":"file","path":"ARCH.md","content":"..."}}\'',
          'echo \'{"type":"step_finish","sessionID":"ses_test_1","part":{"type":"step-finish","reason":"stop"}}\'',
        ]
      : [
          'echo \'{"type":"step_start","sessionID":"ses_err_1","part":{"type":"step-start"}}\'',
          'echo "erreur simulée sur stderr" >&2',
        ];
  const script = [
    "#!/bin/sh",
    readArgs,
    ...events,
    scenario === "ok" ? "exit 0" : "exit 1",
    "",
  ].join("\n");
  await writeFile(bin, script, "utf8");
  await chmod(bin, 0o755);
  return bin;
}