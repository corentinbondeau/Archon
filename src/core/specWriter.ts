import YAML from "yaml";
import { validateSpecObject } from "./spec.js";
import type { ProjectSpec } from "./types.js";

/**
 * Entrée d'un formulaire (wizard terminal ou web) avant validation.
 * Les champs manquants/mal formés sont détectés par la validation Zod.
 */
export interface SpecInput {
  name: string;
  displayName?: string | undefined;
  baseline: string;
  interfaceKind: ProjectSpec["interfaceKind"];
  palette: {
    primary: string;
    secondary: string;
    background: string;
    foreground: string;
    accent: string;
  };
  personas: { id: string; label: string; needs: string[] }[];
  features: { id: string; label: string; description: string }[];
  journey: { entry: string; steps: string[]; targetAction: string };
  stack: {
    framework: string;
    language?: string | undefined;
    styling: string;
    orm: string;
    database: string;
    auth: string;
    integrations?: string[] | undefined;
  };
  constraints?: string[] | undefined;
}

/** Façonne l'entrée du formulaire vers la structure attendue par le schéma. */
function toSchemaShape(input: SpecInput): unknown {
  return {
    project: {
      name: input.name,
      displayName: input.displayName,
      baseline: input.baseline,
      interfaceKind: input.interfaceKind,
    },
    palette: input.palette,
    personas: input.personas,
    features: input.features,
    journey: input.journey,
    stack: input.stack,
    constraints: input.constraints,
  };
}

/**
 * Valide et normalise une saisie utilisateur en `ProjectSpec` canonique.
 * Lève `SpecError` si un champ est absent ou invalide.
 */
export function buildProjectSpec(
  input: SpecInput,
  source = "formulaire",
): ProjectSpec {
  return validateSpecObject(toSchemaShape(input), source);
}

/**
 * Sérialise une spec en YAML exploitable par `--spec`.
 * Les couleurs et libellés sont automatiquement cités par yaml (rond-point
 * de parsing garanti) ; les listes vides sont omises pour la lisibilité.
 */
export function serializeSpecYaml(spec: ProjectSpec, metaVersion = "0.2"): string {
  const doc: Record<string, unknown> = {
    meta: { format: "archon", version: metaVersion },
    project: {
      name: spec.name,
      displayName: spec.displayName,
      baseline: spec.baseline,
      interfaceKind: spec.interfaceKind,
    },
    palette: spec.palette,
  };

  doc.personas = spec.personas.map((p) => ({
    id: p.id,
    label: p.label,
    needs: p.needs.length ? p.needs : undefined,
  }));
  doc.features = spec.features.map((f) => ({
    id: f.id,
    label: f.label,
    description: f.description,
  }));
  doc.journey = {
    entry: spec.journey.entry,
    steps: spec.journey.steps.length ? spec.journey.steps : undefined,
    targetAction: spec.journey.targetAction,
  };
  doc.stack = {
    framework: spec.stack.framework,
    language: spec.stack.language,
    styling: spec.stack.styling,
    orm: spec.stack.orm,
    database: spec.stack.database,
    auth: spec.stack.auth,
    integrations: spec.stack.integrations.length
      ? spec.stack.integrations
      : undefined,
  };
  doc.constraints = spec.constraints.length ? spec.constraints : undefined;

  return YAML.stringify(doc, { indent: 2 });
}

/** Génère le nom technique aligné si l'utilisateur n'en fournit pas un. */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}