import { createInterface } from "node:readline";
import {
  askConfirm,
  askList,
  askSelect,
  askText,
} from "./prompts.js";
import {
  buildProjectSpec,
  slugify,
  type SpecInput,
} from "../core/index.js";
import type { ProjectSpec } from "../core/index.js";

/** Presets de direction artistique proposés par défaut. */
const PALETTE_PRESETS: {
  label: string;
  description: string;
  palette?: SpecInput["palette"] | undefined;
}[] = [
  {
    label: "Dark natif",
    description: "Sombre, moderniste : fond ardoise, accents saturés.",
    palette: {
      primary: "#0ea5e9",
      secondary: "#8b5cf6",
      background: "#0f172a",
      foreground: "#f8fafc",
      accent: "#f59e0b",
    },
  },
  {
    label: "Light épuré",
    description: "Clair, minimaliste et professionnel.",
    palette: {
      primary: "#2563eb",
      secondary: "#7c3aed",
      background: "#ffffff",
      foreground: "#0f172a",
      accent: "#f59e0b",
    },
  },
  {
    label: "Palette personnalisée",
    description: "Saisie manuelle des cinq codes hexadécimaux.",
  },
];

const INTERFACE_KINDS: { value: "mobile-first" | "dashboard-desktop" | "pwa" | "native" | "responsive"; label: string }[] = [
  { value: "mobile-first", label: "Mobile-first (responsive desktop)" },
  { value: "dashboard-desktop", label: "Dashboard desktop / écrans larges" },
  { value: "pwa", label: "PWA (installe, offline)" },
  { value: "native", label: "Application native" },
  { value: "responsive", label: "Responsive neutre" },
];

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

interface WizardResult {
  spec: ProjectSpec;
  outPath: string;
  runPipeline: boolean;
}

/**
 * Assistant interactif `archon init` : recueille pas-à-pas les informations
 * du cahier des charges (identité, palette, fonctionnalités, stack, personas)
 * et retourne une spec validée prête à écrire et à orchestrer.
 */
export async function runWizard(opts: {
  defaultOutPath: string;
  askToRun: boolean;
}): Promise<WizardResult> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const heading = (t: string) =>
      console.log(`\n\x1b[1m\x1b[36m◆ ${t}\x1b[0m`);

    const slugValidator = (v: string): true | string =>
      NAME_RE.test(v) && !v.includes("--")
        ? true
        : "Nom technique invalide : lettres minuscules, chiffres et tirets (ex: telescope-app).";

    heading("1. Identité & promesse");
    const displayName = await askText(rl, "Nom commercial de l'application", {
      validate: (v) => (v.length >= 2 ? true : "Au moins 2 caractères."),
    });
    const name = await askText(rl, "Nom technique (slug)", {
      default: slugify(displayName),
      validate: slugValidator,
    });
    const baseline = await askText(rl, "Baseline / promesse principale", {
      validate: (v) => (v.length >= 4 ? true : "Formulez une promesse claire."),
    });

    heading("2. Direction artistique & palette");
    const kindIndex = await askSelect(
      rl,
      "Quel type d'interface ?",
      INTERFACE_KINDS.map((k) => ({
        label: k.label,
        description:
          k.value === "mobile-first"
            ? "Optimisé mobile, adapté desktop."
            : k.value === "dashboard-desktop"
              ? "Interface riche pour écrans larges."
              : k.value === "pwa"
                ? "Progressive Web App installable."
                : k.value === "native"
                  ? "React Native ou Flutter."
                  : "Équilibre mobile / desktop.",
      })),
    );
    const interfaceKind = INTERFACE_KINDS[kindIndex].value;

    const presetIndex = await askSelect(
      rl,
      "Choisissez un point de départ de palette",
      PALETTE_PRESETS.map((p) => ({ label: p.label, description: p.description })),
    );
    const preset = PALETTE_PRESETS[presetIndex] as {
      label: string;
      description: string;
      palette: SpecInput["palette"];
    };
    const palette: SpecInput["palette"] = preset.palette
      ? { ...preset.palette }
      : await askCustomPalette(rl);

    if (preset.palette) {
      const tweak = await askConfirm(rl, "Modifier une couleur ?", false);
      if (tweak) {
        const tweaked = await askCustomPalette(rl, palette);
        Object.assign(palette, tweaked);
      }
    }

    heading("3. Personas");
    console.log(
      "\x1b[2mUn utilisateur cible prioritaire. Ajoutez-en ; Entrée vide pour terminer.\x1b[0m",
    );
    const personas: SpecInput["personas"] = [];
    for (let i = 0; i < 10; i++) {
      const label = await askText(
        rl,
        `Persona #${i + 1} (label)`,
        { optional: true },
      );
      if (label === "") {
        if (personas.length === 0) {
          console.log("\x1b[33m⚠\x1b[0m Au moins un persona est requis.\n");
          continue;
        }
        break;
      }
      const needsRaw = await askText(rl, "Besoins (virgulés)", {
        default: "",
        optional: true,
      });
      const needs = needsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      personas.push({ id: slugify(label) || `persona-${i + 1}`, label, needs });
    }

    heading("4. Fonctionnalités clés (MVP)");
    console.log(
      "\x1b[2mEntre 1 et 5 fonctionnalités. Entrée vide sur le label pour terminer.\x1b[0m",
    );
    const features: SpecInput["features"] = [];
    for (let i = 0; i < 5; i++) {
      const label = await askText(rl, `Fonctionnalité #${i + 1} (label)`, {
        optional: true,
      });
      if (label === "") break;
      const description = await askText(
        rl,
        `Description de " ${label} "`,
        { validate: (v) => (v.length >= 4 ? true : "Décrivez le comportement attendu.") },
      );
      features.push({ id: slugify(label), label, description });
    }
    if (features.length === 0) {
      throw new Error("Annulation : il faut au moins une fonctionnalité MVP.");
    }

    heading("5. Parcours utilisateur principal");
    const journeyEntry = await askText(rl, "Point d'entrée (ex: page d'accueil)");
    const journeySteps = await askList(rl, "Étape du parcours");
    const targetAction = await askText(rl, "Action clé finale (ex: créer une alerte)");

    heading("6. Stack technique");
    const framework = await askText(rl, "Framework", { default: "Next.js" });
    const language = (await askSelect(
      rl,
      "Langage",
      [{ label: "TypeScript" }, { label: "JavaScript" }],
    )) === 0
      ? "TypeScript"
      : "JavaScript";
    const styling = await askText(rl, "Système de style / CSS", {
      default: "Tailwind CSS",
    });
    const ormIndex = await askSelect(
      rl,
      "ORM",
      [
        { label: "Prisma" },
        { label: "Drizzle" },
        { label: "TypeORM" },
        { label: "SQLAlchemy" },
      ],
    );
    const ormChoices = ["Prisma", "Drizzle", "TypeORM", "SQLAlchemy"];
    const orm = ormChoices[ormIndex];
    const dbIndex = await askSelect(
      rl,
      "Base de données",
      [
        { label: "SQLite" },
        { label: "PostgreSQL" },
        { label: "Supabase" },
        { label: "MySQL" },
        { label: "MongoDB" },
      ],
    );
    const dbChoices = ["SQLite", "PostgreSQL", "Supabase", "MySQL", "MongoDB"];
    const db = dbChoices[dbIndex];
    const auth = await askText(rl, "Authentification", { default: "NextAuth" });
    const integrations = await askList(rl, "Intégration tierce (API, webhook)");

    heading("7. Contraintes");
    const constraints = await askList(rl, "Contrainte (ex: dark mode natif)");

    heading("8. Récapitulatif");
    console.log(
      `  Projet   : ${displayName} — ${baseline}\n` +
        `  Slug     : ${name}\n` +
        `  UI       : ${interfaceKind}\n` +
        `  Palette  : ${palette.primary} / ${palette.secondary} / ${palette.background} / ${palette.foreground} / ${palette.accent}\n` +
        `  Personas : ${personas.length} · Features : ${features.length}\n` +
        `  Stack    : ${framework} + ${language} + ${styling} + ${orm} (${db})\n` +
        `  Auth     : ${auth}` +
        (integrations.length ? `\n  Intégrations : ${integrations.join(", ")}` : ""),
    );

    const input: SpecInput = {
      name,
      displayName,
      baseline,
      interfaceKind,
      palette,
      personas,
      features,
      journey: {
        entry: journeyEntry,
        steps: journeySteps,
        targetAction,
      },
      stack: {
        framework,
        language,
        styling,
        orm,
        database: db,
        auth,
        integrations,
      },
      constraints,
    };

    const spec = buildProjectSpec(input);
    const outPath = await askText(rl, "Fichier de spec à écrire", {
      default: opts.defaultOutPath,
    });
    const runPipeline = opts.askToRun
      ? await askConfirm(rl, "Lancer le pipeline archon maintenant ?", true)
      : true;

    return { spec, outPath, runPipeline };
  } finally {
    rl.close();
  }
}

/** Saisie des cinq couleurs avec validation hexadécimale. */
async function askCustomPalette(
  rl: ReturnType<typeof createInterface>,
  current?: SpecInput["palette"],
): Promise<SpecInput["palette"]> {
  const hex =
    (label: string, defaultHex?: string) =>
    askText(rl, `Couleur ${label}`, {
      ...(defaultHex ? { default: defaultHex } : {}),
      validate: (v) => (HEX_RE.test(v) ? true : "Code hexadécimal attendu, ex: #0ea5e9."),
    });

  return {
    primary: await hex("primaire", current?.primary),
    secondary: await hex("secondaire", current?.secondary),
    background: await hex("de fond", current?.background),
    foreground: await hex("de texte", current?.foreground),
    accent: await hex("d'accent", current?.accent),
  };
}