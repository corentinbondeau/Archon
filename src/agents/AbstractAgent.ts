import type { AgentInput, BaseAgent } from "./BaseAgent.js";
import {
  formatPriorArtifacts,
  renderPrompt,
  sharedStyleBlock,
  type PromptContext,
} from "./PromptTemplate.js";
import type {
  AgentName,
  AgentOutput,
  FileChange,
  StepLog,
} from "../core/types.js";
import type { RunResult } from "../adapters/OpenCodeRunner.js";
import type { ContextManager } from "../core/ContextManager.js";

/**
 * Implémentation factorisée d'un agent : compose le prompt (rôle +
 * objectifs + variables projet + artefacts antérieurs + style), invoque
 * l'adaptateur OpenCode et normalise le résultat en `AgentOutput`.
 * Une politique de session unitaire par étape évite toute contamination
 * entre agents.
 */
export abstract class AbstractAgent implements BaseAgent {
  abstract readonly name: AgentName;

  protected abstract readonly role: string;
  protected abstract readonly objectives: string[];
  protected abstract templateFn(ctx: PromptContext): string;

  async run(input: AgentInput): Promise<AgentOutput> {
    const logs: StepLog[] = [];
    const log = (level: StepLog["level"], message: string) =>
      logs.push({ at: new Date().toISOString(), agent: this.name, level, message });

    const context = input.context;
    const runner = input.runner;
    const spec = context.getSpec();

    log("info", "Préparation du prompt (variables projet + artefacts antérieurs).");

    let prompt: string;
    try {
      prompt = this.buildPrompt(context);
    } catch (err) {
      const message = `Prompt invalide : ${err instanceof Error ? err.message : String(err)}`;
      log("error", message);
      return this.failure(logs, message);
    }

    // Chaque agent démarre une nouvelle session OpenCode : les artefacts
    // sont transmis via le prompt (contexte), pas via la continuité de
    // session. L'ID collecté sert seulement aux logs et à `opencode export`.
    let result: RunResult;
    try {
      log("info", `Invocation OpenCode (répertoire : ${spec.name}).`);
      result = await runner.run({
        cwd: context.getProjectDir(),
        prompt,
        title: `archon/${this.name}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log("error", message);
      return this.failure(logs, message);
    }

    const files: FileChange[] = result.files.map((f) => ({
      path: f.path,
      action: f.action,
      summary: `${this.name}: ${f.action} ${f.path}`,
    }));

    log(
      result.exitCode === 0 ? "info" : "warn",
      `OpenCode terminé (exit ${result.exitCode}), ${result.files.length} fichier(s) signalé(s).`,
    );

    if (result.exitCode !== 0) {
      log("error", `Échec OpenCode : ${result.stderr || result.text}`);
      return this.failure(
        logs,
        "L'outil OpenCode a retourné un code de sortie non nul.",
        result,
      );
    }

    const producedArtifacts = await this.collectArtifacts(context);
    if (producedArtifacts.length > 0) {
      context.recordArtifacts(this.name, producedArtifacts);
      log("info", `Artefacts enregistrés : ${producedArtifacts.join(", ")}`);
    }

    return {
      agent: this.name,
      summary: result.text || `${this.name}: exécution terminée.`,
      files,
      logs,
      producedArtifacts,
    };
  }

  /**
   * Compos the prompt complet d'une étape.
   */
  buildPrompt(context: ContextManager): string {
    const spec = context.getSpec();
    const priorArtifacts = context.getContextFor(this.name);
    const promptCtx: PromptContext = {
      spec,
      agent: this.name,
      projectDir: context.getProjectDir(),
      priorArtifacts,
      humanInstructions: context.getHumanInstructions(),
    };

    const objectivesBlock = this.objectives
      .map((o, i) => `${i + 1}. ${o}`)
      .join("\n");

    const body = renderPrompt(this.templateFn(promptCtx), promptCtx);

    const humanBlock = promptCtx.humanInstructions
      ? [
          "",
          "## Instructions humaines du cahier des charges",
          promptCtx.humanInstructions,
        ].join("\n")
      : "";

    return [
      body,
      "",
      `## Objectifs de cette étape (${this.name})`,
      objectivesBlock,
      "",
      sharedStyleBlock(promptCtx),
      humanBlock,
      "",
      "## Contexte des étapes précédentes",
      formatPriorArtifacts(priorArtifacts),
      "",
      "## Exigences de rendu",
      "- Produisez des fichiers complets, propres et directement exploitables.",
      "- N'inventez aucune API ni fonctionnalité non documentée.",
      '- Terminez votre dernier message par un résumé concis : fichiers créés/modifiés, et points d\'attention pour les étapes suivantes.',
      "- Aucun placeholder générique : tout le nommage doit refléter le domaine métier du produit.",
    ].join("\n");
  }

  /**
   * Artefacts de contexte produits par l'agent pour les étapes suivantes.
   * À surcharger dans les agents qui produisent des documents/contrats.
   */
  protected async collectArtifacts(
    _context: ContextManager,
  ): Promise<string[]> {
    return [];
  }

  protected failure(
    logs: StepLog[],
    message: string,
    result?: RunResult,
  ): AgentOutput {
    return {
      agent: this.name,
      summary: message,
      files: result?.files.map((f) => ({
        path: f.path,
        action: f.action,
        summary: message,
      })) ?? [],
      logs,
      producedArtifacts: [],
      error: {
        agent: this.name,
        message,
        detail: result?.stderr || result?.text,
        exitCode: result?.exitCode ?? undefined,
      },
    };
  }
}