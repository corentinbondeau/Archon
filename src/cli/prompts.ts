import type { Interface } from "node:readline";

/**
 * Primitives d'invite interactive pour le terminal (wizard `archon init`).
 * Zéro dépendance : tout est construit sur `node:readline`.
 */

export interface TextOptions {
  /** Valeur proposée si l'utilisateur presse Entrée sans saisir. */
  default?: string;
  /** Validateur : retourne 'true' (ou undefined) si valide, sinon un message. */
  validate?: (value: string) => true | string | undefined;
  /** Autorise une saisie vide (utilisé pour les listes extensibles). */
  optional?: boolean;
  /** Masque la saisie (mots de passe/tokens). */
  secret?: boolean;
}

/** Interroge l'utilisateur sur une entrée libre validée. */
export function askText(
  rl: Interface,
  question: string,
  options: TextOptions = {},
): Promise<string> {
  const { default: def, validate, secret, optional } = options;
  const suffix = def ? ` (défaut : \`${def}\`)` : "";
  return new Promise((resolve) => {
    const prompt = () => {
      rl.question(secret ? `\x1b[90m${question}${suffix} :\x1b[0m ` : `${question}${suffix} : `, (raw) => {
        const isEmpty = raw.trim().length === 0;
        if (isEmpty && optional) {
          resolve("");
          return;
        }
        if (isEmpty && def !== undefined) {
          resolve(def);
          return;
        }
        if (isEmpty) {
          console.log("\x1b[33m⚠\x1b[0m Réponse requise.\n");
          prompt();
          return;
        }
        const value = raw.trim();
        const validation = validate?.(value);
        if (validation && validation !== true) {
          console.log(`\x1b[31m✗\x1b[0m ${validation}\n`);
          prompt();
          return;
        }
        resolve(value);
      });
    };
    prompt();
  });
}

export interface Choice {
  label: string;
  description?: string;
}

/** Menu numéroté : retourne l'index (0-based) du choix retenu. */
export function askSelect(
  rl: Interface,
  question: string,
  choices: Choice[],
  defaultIndex = 0,
): Promise<number> {
  return new Promise((resolve) => {
    const show = () => {
      console.log(`\n${question}`);
      choices.forEach((c, i) => {
        const mark = i === defaultIndex ? " [défaut]" : "";
        console.log(
          `  \x1b[36m${i + 1}\x1b[0m. ${c.label}${mark}${
            c.description ? `\n     \x1b[2m${c.description}\x1b[0m` : ""
          }`,
        );
      });
      rl.question(
        `Choix \x1b[2m[1-${choices.length}]${defaultIndex !== undefined ? `, défaut ${String(defaultIndex + 1)}` : ""}\x1b[0m : `,
        (raw) => {
          const trimmed = raw.trim();
          if (trimmed === "" && defaultIndex !== undefined) {
            resolve(defaultIndex);
            return;
          }
          const n = Number(trimmed);
          if (Number.isInteger(n) && n >= 1 && n <= choices.length) {
            resolve(n - 1);
            return;
          }
          console.log(
            `\x1b[31m✗\x1b[0m Choix invalide : entrez un nombre entre 1 et ${choices.length}.\n`,
          );
          show();
        },
      );
    };
    show();
  });
}

/** Confirmation Oui/Non simple. */
export function askConfirm(
  rl: Interface,
  question: string,
  defaultYes = true,
): Promise<boolean> {
  const hint = defaultYes ? "O/n" : "o/N";
  return new Promise((resolve) => {
    const step = () => {
      rl.question(`${question} (${hint}) : `, (raw) => {
        const trimmed = raw.trim();
        if (trimmed === "") {
          // Entrée vide → applique le défaut (comportement d'un humain).
          resolve(defaultYes);
          return;
        }
        if (/^(o|oui|y|yes)$/i.test(trimmed)) {
          resolve(true);
          return;
        }
        if (/^(n|non|no)$/i.test(trimmed)) {
          resolve(false);
          return;
        }
        console.log(`\x1b[31m✗\x1b[0m Répondez par 'o' (oui) ou 'n' (non).\n`);
        step();
      });
    };
    step();
  });
}

/**
 * Ajout répété d'éléments simples (une question unique) jusqu'à entrée vide.
 */
export async function askList(
  rl: Interface,
  question: string,
  options: TextOptions = {},
): Promise<string[]> {
  const items: string[] = [];
  for (;;) {
    const value = await askText(
      rl,
      items.length === 0
        ? `${question} (entrée vide pour terminer)`
        : `${question} #${items.length + 1}`,
      { ...options, optional: true },
    );
    if (value === "") break;
    items.push(value);
  }
  return items;
}