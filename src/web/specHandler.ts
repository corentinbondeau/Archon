import { buildProjectSpec, serializeSpecYaml, type SpecInput } from "../core/index.js";

/**
 * Logique métier d'export d'une spec, partagée entre le serveur HTTP local
 * (`archon web`) et la Serverless Function Vercel (`api/spec.ts`).
 * Retourne un corps sérialisable en JSON (succès ou erreur).
 */

/** Formats de statut HTTP réutilisés par les deux hôtes. */
export const SPEC_STATUS = {
  created: 201,
  badRequest: 400,
  tooLarge: 413,
  unprocessable: 422,
  methodNotAllowed: 405,
} as const;

/** Corps JSON de réponse (succès ou erreur). */
export type SpecApiResponse =
  | { file: string; name: string; yaml: string }
  | { error: string };

/**
 * Transforme les informations du formulaire en spec YAML validé.
 * @param input Les champs du cahier des charges.
 * @param source Label de debug pour les messages de validation.
 */
export function renderSpecPayload(
  input: unknown,
  source = "formulaire",
): SpecApiResponse {
  const spec = buildProjectSpec(input as SpecInput, source);
  return {
    file: `${spec.name}.yaml`,
    name: spec.name,
    yaml: serializeSpecYaml(spec),
  };
}