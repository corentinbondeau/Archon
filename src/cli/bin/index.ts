#!/usr/bin/env node
import { join, resolve } from "node:path";
import { writeFile } from "node:fs/promises";
import {
  ensureProjectDir,
  ContextManager,
  FileRunStore,
  loadProjectSpec,
  Orchestrator,
  AgentHalt,
  OrchestratorError,
  SpecError,
  serializeSpecYaml,
} from "../../core/index.js";
import { createDefaultAgents } from "../../agents/index.js";
import { OpenCodeRunner } from "../../adapters/index.js";
import { runWizard } from "../wizard.js";
import { startWebServer } from "../../web/server.js";
import type { AgentOutput } from "../../core/index.js";

/** Sous-commandes reconnues : `init` (wizard) et `web` (formulaire). */
type Command = "init" | "web" | "run" | undefined;

interface CliArgs {
  command: Command;
  spec: string | undefined;
  dir: string | undefined;
  out: string | undefined;
  model: string | undefined;
  opencodeAgent: string | undefined;
  auto: boolean;
  fresh: boolean;
  run: boolean;
  retries: number;
  port: number;
  verbose: boolean;
  deploy: boolean;
  remote: string | undefined;
  help: boolean;
}

const USAGE = `
Archon — Orchestrateur multi-agents OpenCode.

Usage :
  archon init [--out <spec>] [--run] [options]   Assistant interactif du cahier des charges
  archon web [--port <n>]                        Formulaire web local (export de spec)
  archon --spec <chemin> [options]                Lancement direct du pipeline

Options :
  --spec <fichier>      Chemin du cahier des charges (.md avec bloc yaml, .yaml, .yml ou .json)
  --dir <repertoire>    Répertoire cible de l'application générée (défaut : <nom du projet> dans le cwd)
  --out <fichier>       Fichier spec écrit par \`init\` (défaut : ./project-spec.yaml)
  --run                 Après \`init\`, lancer le pipeline sans confirmation
  --port <n>            Port du serveur web (défaut : 8765)
  --model <m>           Modèle OpenCode (ex: anthropic/claude-sonnet-4-5)
  --agent <a>           Agent OpenCode custom à utiliser
  --retry <n>           Nombre maximal de tentatives par agent (défaut : 1)
  --auto                Autoriser automatiquement les permissions OpenCode (--auto)
  --fresh               Ignorer l'état persisté et repartir de l'étape 1
  --deploy              Déployer l'application après génération (Vercel ou Docker selon la stack)
  --remote <url>        Dépôt git distant à créer/pousser (déclenche l'auto-deploy PaaS)
  --verbose             Afficher le prompt transmis à chaque agent
  -h, --help            Afficher cette aide
`.trim();

const DEFAULTS = {
  out: "project-spec.yaml",
  port: 8765,
};

/** Parse simple des arguments : --cle valeur ou --flag booléen. */
function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    command: undefined,
    spec: undefined,
    dir: undefined,
    out: undefined,
    model: undefined,
    opencodeAgent: undefined,
    auto: false,
    fresh: false,
    run: false,
    retries: 1,
    port: DEFAULTS.port,
    verbose: false,
    deploy: false,
    remote: undefined,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = (): string | undefined => argv[++i];
    switch (arg) {
      case "init":
      case "web":
        args.command = arg;
        break;
      case "--spec":
        args.spec = next();
        if (!args.command) args.command = "run";
        break;
      case "--dir":
        args.dir = next();
        break;
      case "--out":
        args.out = next();
        break;
      case "--model":
        args.model = next();
        break;
      case "--agent":
        args.opencodeAgent = next();
        break;
      case "--retry":
        args.retries = Number(next() ?? "1");
        break;
      case "--port":
        args.port = Number(next() ?? String(DEFAULTS.port));
        break;
      case "--auto":
        args.auto = true;
        break;
      case "--fresh":
        args.fresh = true;
        break;
      case "--run":
        args.run = true;
        break;
      case "--verbose":
        args.verbose = true;
        break;
      case "--deploy":
        args.deploy = true;
        break;
      case "--remote":
        args.remote = next();
        break;
      case "-h":
      case "--help":
        args.help = true;
        break;
      default:
        if (arg.startsWith("-") && arg !== "-") {
          console.error(`Option inconnue : ${arg}`);
          console.error(USAGE);
          process.exit(2);
        }
        break;
    }
  }
  return args;
}

/** Petit logger PVC coloré pour le CLI. */
const paint = {
  step: (s: string): string => `\x1b[36m›\x1b[0m ${s}`,
  ok: (s: string): string => `\x1b[32m✓\x1b[0m ${s}`,
  warn: (s: string): string => `\x1b[33m⚠\x1b[0m ${s}`,
  err: (s: string): string => `\x1b[31m✗\x1b[0m ${s}`,
  dim: (s: string): string => `\x1b[2m${s}\x1b[0m`,
};

/** Affiche le résumé exploitable à la fin d'un run. */
function printAgentSummary(output: AgentOutput, verbose: boolean): void {
  console.log(paint.ok(`[${output.agent}] ${output.summary.split("\n")[0]}`));
  if (verbose) {
    for (const l of output.logs) console.log(paint.dim(`  ${l.level}: ${l.message}`));
  }
}

/**
 * Exécute le pipeline complet depuis un fichier de spec (chemin partagé par
 * `--spec` direct et par le wizard `init`).
 */
async function runPipeline(specPath: string, args: CliArgs): Promise<void> {
  const { spec, humanInstructions } = await loadProjectSpec(specPath);

  const projectDir = resolve(args.dir ?? join(process.cwd(), spec.name));
  await ensureProjectDir(projectDir);

  const store = new FileRunStore(join(projectDir, ".archon", "state.json"));
  const context = await ContextManager.create(
    spec,
    projectDir,
    store,
    humanInstructions,
    !args.fresh,
  );

  const runner = new OpenCodeRunner({
    model: args.model,
    opencodeAgent: args.opencodeAgent,
    autoApprove: args.auto,
  });

  const agents = createDefaultAgents();

  console.log(paint.step(`Projet     : ${spec.displayName} — ${spec.baseline}`));
  console.log(paint.dim(`Répertoire : ${projectDir}`));
  console.log(
    paint.dim(
      `Palette    : ${spec.palette.primary} / ${spec.palette.secondary} / ${spec.palette.background} / ${spec.palette.foreground} / ${spec.palette.accent}`,
    ),
  );
  console.log(
    paint.dim(
      `Stack      : ${spec.stack.framework} + ${spec.stack.language} + ${spec.stack.styling} + ${spec.stack.orm} (${spec.stack.database})`,
    ),
  );
  console.log("");

  const orchestrator = new Orchestrator(agents, context, {
    runner,
    maxAgentRetries: args.retries,
    ...(args.deploy || args.remote
      ? {
          deploy: {
            enabled: args.deploy,
            ...(args.remote ? { remoteUrl: args.remote } : {}),
          },
        }
      : {}),
    hooks: {
      onStepStart: (step, agent) => {
        console.log(paint.step(`Étape ${step + 1}/${agents.length} — ${agent}`));
      },
      onStepEnd: (_step, _agent, output) => {
        printAgentSummary(output, args.verbose);
        console.log("");
      },
      onRetry: (agent, attempt) => {
        console.log(paint.warn(`Nouvelle tentative (${attempt + 2}) pour ${agent}…`));
        return true;
      },
    },
  });

  const result = await orchestrator.run();

  console.log("");
  if (result.completed) {
    console.log(paint.ok(`Livraison prête dans ${result.projectDir}.`));
    console.log(
      paint.dim(
        `${result.stats.agentsRun} agents · ${result.stats.filesTouched} fichiers · ${result.stats.artifactsProduced} artefacts · ${result.stats.warnings} avertissements · ${result.stats.errors} erreurs`,
      ),
    );
    return;
  }

  console.log(paint.err("Pipeline incomplet — voir les erreurs ci-dessous :"));
  for (const e of result.errors) {
    console.log(paint.err(`[${e.agent}] ${e.error?.message ?? "erreur inconnue"}`));
    if (e.error?.detail && args.verbose) {
      console.log(paint.dim(e.error.detail));
    }
  }
}

/** Commande `init` : assistant interactif puis écriture de la spec. */
async function cmdInit(args: CliArgs): Promise<void> {
  const { spec, outPath, runPipeline: shouldRun } = await runWizard({
    defaultOutPath: args.out ?? DEFAULTS.out,
    askToRun: !args.run,
  });

  const out = resolve(outPath);
  const yaml = serializeSpecYaml(spec);
  await writeFile(out, yaml, "utf8");
  console.log(`\n${paint.ok(`Spec écrite dans ${out}`)}`);
  console.log(paint.dim(`Récapitulatif validé : ${spec.features.length} features · ${spec.personas.length} personas`));

  if (shouldRun) {
    console.log("");
    await runPipeline(out, args);
  }
}

/** Commande `web` : sert le formulaire local et l'endpoint d'export. */
async function cmdWeb(args: CliArgs): Promise<void> {
  const handle = await startWebServer({ port: args.port });
  console.log(paint.step(`Formulaire Archon : http://localhost:${handle.port}`));
  console.log(paint.dim("Appuyez sur Ctrl+C pour arrêter le serveur."));
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.command) {
    console.log(USAGE);
    process.exit(args.help ? 0 : 2);
  }

  try {
    if (args.command === "init") {
      await cmdInit(args);
      process.exit(0);
    }
    if (args.command === "web") {
      await cmdWeb(args);
      return; // le serveur reste actif
    }
    await runPipeline(args.spec!, args);
    process.exit(0);
  } catch (err) {
    if (err instanceof SpecError) {
      console.error(paint.err(err.message));
      process.exit(2);
    }
    if (err instanceof AgentHalt) {
      console.error(paint.err(`Pipeline arrêté (${err.agent}) : ${err.message}`));
      process.exit(1);
    }
    if (err instanceof OrchestratorError) {
      console.error(paint.err(err.message));
      process.exit(1);
    }
    console.error(paint.err(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }
}

main();