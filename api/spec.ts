import { renderSpecPayload } from "../src/web/specHandler.js";

/**
 * Serverless Function Vercel (Node) :
 * Exporte une spec YAML validée depuis les données du formulaire web.
 *
 * Endpoint : POST /api/spec
 * Corps     : JSON correspondant aux champs du cahier des charges.
 * Réponses  : 201 { file, name, yaml }  |  400  |  413  |  422 { error }  |  405
 */

interface VercelRequest {
  method?: string;
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
  headers?: Record<string, string | string[] | undefined>;
}

interface VercelResponse {
  status(code: number): VercelResponseStatus;
}

interface VercelResponseStatus {
  json(payload: unknown): void;
  send(payload: string): void;
  setHeader?(): void;
}

const MAX_BODY = 256 * 1024;

/** Lit et borne le corps de requête (string | Buffer | objet déjà parsé). */
function readRawBody(body: unknown): string {
  if (typeof body === "string") return body;
  if (Buffer.isBuffer(body)) return body.toString("utf8");
  // Vercel fournit parfois un objet déjà parsé.
  return JSON.stringify(body);
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Méthode non autorisée." });
    return;
  }

  let raw: string;
  try {
    raw = readRawBody(req.body);
    if (Buffer.byteLength(raw) > MAX_BODY) {
      res.status(413).json({ error: "Formulaire trop volumineux." });
      return;
    }
  } catch {
    res.status(400).json({ error: "Corps de requête illisible." });
    return;
  }

  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    res.status(400).json({ error: "JSON invalide." });
    return;
  }

  try {
    const payload = renderSpecPayload(input);
    res.status(201).json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(422).json({ error: message });
  }
}
