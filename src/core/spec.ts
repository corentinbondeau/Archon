import { readFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { z } from "zod";
import YAML from "yaml";
import type { ProjectSpec } from "./types.js";

/**
 * Schémas Zod de validation du cadrage projet.
 * Toute valeur manquante ou mal typée provoque une erreur explicite.
 */

const hexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "code hexadécimal attendu (ex: #0ea5e9)");

const metaSchema = z.object({
  format: z.enum(["archon"]).default("archon"),
  version: z.string().optional(),
});

const yamlSpecSchema = z.object({
  meta: metaSchema.optional(),
  project: z.object({
    name: z.string().min(1),
    displayName: z.string().min(1).optional(),
    baseline: z.string().min(1),
    interfaceKind: z.enum([
      "mobile-first",
      "dashboard-desktop",
      "pwa",
      "native",
      "responsive",
    ]),
  }),
  palette: z.object({
    primary: hexColor,
    secondary: hexColor,
    background: hexColor,
    foreground: hexColor,
    accent: hexColor,
  }),
  personas: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        needs: z.array(z.string()).default([]),
      }),
    )
    .min(1),
  features: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        description: z.string().min(1),
      }),
    )
    .min(1)
    .max(5),
  journey: z.object({
    entry: z.string().min(1),
    steps: z.array(z.string()).default([]),
    targetAction: z.string().min(1),
  }),
  stack: z.object({
    framework: z.string().min(1),
    language: z.string().default("TypeScript"),
    styling: z.string().min(1),
    orm: z.string().min(1),
    database: z.string().min(1),
    auth: z.string().min(1),
    integrations: z.array(z.string()).default([]),
  }),
  constraints: z.array(z.string()).default([]),
});

export class SpecError extends Error {}

/** Détecte le format d'un fichier de spec à partir de son extension. */
function formatFor(filePath: string): "yaml" | "json" | "md" {
  switch (extname(filePath).toLowerCase()) {
    case ".json":
      return "json";
    case ".yaml":
    case ".yml":
      return "yaml";
    case ".md":
    case ".markdown":
      return "md";
    default:
      throw new SpecError(
        `Format de spec non pris en charge : ${filePath} (utilisez .md, .yaml/.yml ou .json)`,
      );
  }
}

/** Convertit la sortie validée vers le type canonique du domaine. */
function toProjectSpec(data: z.infer<typeof yamlSpecSchema>): ProjectSpec {
  return {
    name: data.project.name,
    displayName: data.project.displayName ?? data.project.name,
    baseline: data.project.baseline,
    palette: data.palette,
    interfaceKind: data.project.interfaceKind,
    personas: data.personas,
    features: data.features,
    journey: data.journey,
    stack: data.stack,
    constraints: data.constraints,
  };
}

/**
 * Valide un objet spec brut (issu de YAML/JSON ou d'un formulaire web) et le
 * convertit en `ProjectSpec`. Lève `SpecError` avec les issues détaillées.
 */
export function validateSpecObject(
  parsed: unknown,
  source = "spec",
): ProjectSpec {
  const result = yamlSpecSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".") || "(racine)"}: ${i.message}`)
      .join("\n");
    throw new SpecError(`Spécification invalide (${source}) :\n${issues}`);
  }
  return toProjectSpec(result.data);
}

/**
 * Extrait et valide un bloc YAML encadré par ```yaml ... ``` dans un fichier
 * Markdown de cadrage. Retourne la portion d'instructions humaines (le reste).
 */
function parseMarkdownSpec(raw: string): { yamlText: string; humanInstructions: string } {
  const fence = /```ya?ml\s*([\s\S]*?)```/i;
  const match = raw.match(fence);
  if (!match) {
    throw new SpecError(
      "Fichier Markdown sans bloc ```yaml``` : le cadrage doit contenir un bloc yaml avec la structure Archon.",
    );
  }
  const yamlText = match[1];
  const humanInstructions =
    raw.slice(0, match.index).trim().concat("\n", raw.slice(match.index! + match[0].length)).trim();
  return { yamlText, humanInstructions };
}

/** Charge et valide une spécification projet depuis un fichier md/yaml/json. */
export async function loadProjectSpec(filePath: string): Promise<{
  spec: ProjectSpec;
  humanInstructions: string;
}> {
  const absolute = resolve(filePath);
  let raw: string;
  try {
    raw = await readFile(absolute, "utf8");
  } catch (err) {
    throw new SpecError(`Impossible de lire le fichier de spec : ${absolute}`, {
      cause: err,
    });
  }

  const format = formatFor(absolute);
  let parsed: unknown;
  let humanInstructions = "";

  if (format === "md") {
    const { yamlText, humanInstructions: human } = parseMarkdownSpec(raw);
    parsed = YAML.parse(yamlText);
    humanInstructions = human;
  } else if (format === "yaml") {
    parsed = YAML.parse(raw);
  } else {
    parsed = JSON.parse(raw);
  }

  const result = yamlSpecSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".") || "(racine)"}: ${i.message}`)
      .join("\n");
    throw new SpecError(`Spécification invalide dans ${filePath} :\n${issues}`);
  }

  return { spec: toProjectSpec(result.data), humanInstructions };
}

/** Chemin du répertoire contenant la spec (pour relativiser les artefacts). */
export function specDir(filePath: string): string {
  return dirname(resolve(filePath));
}
