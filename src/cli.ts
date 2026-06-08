#!/usr/bin/env node
import path from "node:path";
import { Command } from "commander";
import {
  findAgent,
  formatAgentDetails,
  formatAgentList,
  listAgents,
} from "./agent/registry.js";
import { runImageAgent } from "./agent/run.js";
import { formatValidationResult, validateAgentFolder } from "./agent/validate.js";
import { loadLocalEnv } from "./lib/local-env.js";
import { createAgentWithMeta, formatMetaCreateAgentResult } from "./meta/create-agent.js";
import { InstallConflictError, installAgentDraft } from "./meta/install-agent.js";
import {
  formatArtifactDetail,
  formatArtifactList,
  getArtifactDetail,
  listArtifacts,
  openArtifact,
} from "./runtime/artifacts.js";
import {
  formatKnowledgeWriteBackList,
  formatKnowledgeWriteBackResult,
  listKnowledgeWriteBacks,
  markArtifactForKnowledgeBase,
} from "./runtime/artifact-writebacks.js";
import {
  formatRunHistoryDetail,
  formatRunHistoryList,
  getRunHistoryDetail,
  listRunHistory,
} from "./runtime/history.js";
import { writeWorkbenchData } from "./runtime/workbench-data.js";
import { runImageGenSpike } from "./spike/image-gen.js";
import { serveWorkbench } from "./ui/server.js";

loadLocalEnv(".env", { override: true });

const program = new Command();

program
  .name("moyu")
  .description("Moyu local-first agent platform")
  .version("0.1.0");

program
  .command("spike")
  .description("run a small throwaway proof-of-concept")
  .command("image-gen")
  .description("generate prototype images from prompts")
  .requiredOption("--prompt <text>", "base prompt for the image")
  .option("--count <number>", "number of images", "1")
  .option("--size <size>", "image size", "1024x1024")
  .option("--style <style>", "style hint", "realistic")
  .option("--raw-prompt", "send prompt without Moyu style normalization")
  .option("--out <path>", "output directory", "artifacts/spike-image-gen")
  .action(async (opts) => {
    await runImageGenSpike({
      prompt: opts.prompt,
      count: Number(opts.count),
      size: opts.size,
      style: opts.style,
      rawPrompt: Boolean(opts.rawPrompt),
      outDir: opts.out,
    });
  });

const agentCommand = program.command("agent").description("work with local Agent folders");

agentCommand
  .command("list")
  .description("list installed local Agents")
  .option("--root <path>", "agents root directory", "agents")
  .action(async (opts) => {
    const agents = await listAgents(opts.root);
    console.log(formatAgentList(agents));
  });

agentCommand
  .command("show")
  .description("show an Agent manifest summary")
  .argument("<id>", "agent id, folder name, or folder path")
  .option("--root <path>", "agents root directory", "agents")
  .action(async (identifier, opts) => {
    const agent = await findAgent(identifier, opts.root);
    if (!agent) {
      console.error(`Agent not found: ${identifier}`);
      process.exitCode = 1;
      return;
    }
    console.log(formatAgentDetails(agent));
  });

agentCommand
  .command("run")
  .description("run an Agent through the runtime prototype")
  .argument("<id>", "agent id, folder name, or folder path")
  .requiredOption("--prompt <text>", "prompt for the agent")
  .option("--count <number>", "number of images", "1")
  .option("--size <size>", "image size", "1024x1024")
  .option("--style <style>", "style hint", "realistic")
  .option("--raw-prompt", "send prompt without Moyu style normalization")
  .option("--dry-run", "skip provider call and only write trace/summary")
  .option("--out <path>", "output directory")
  .option("--root <path>", "agents root directory", "agents")
  .action(async (identifier, opts) => {
    const agent = await findAgent(identifier, opts.root);
    if (!agent) {
      console.error(`Agent not found: ${identifier}`);
      process.exitCode = 1;
      return;
    }

    const summary = await runImageAgent(agent, {
      prompt: opts.prompt,
      count: Number(opts.count),
      size: opts.size,
      style: opts.style,
      rawPrompt: Boolean(optsRawPrompt(opts)),
      dryRun: Boolean(opts.dryRun),
      outDir: opts.out,
    });
    console.log(summary);
  });

agentCommand
  .command("validate")
  .description("validate an Agent folder contract")
  .argument("<path>", "agent folder path")
  .action(async (agentPath) => {
    const result = await validateAgentFolder(agentPath);
    console.log(formatValidationResult(result));
    if (!result.ok) {
      process.exitCode = 1;
    }
  });

const metaCommand = program.command("meta").description("run Meta-Agent authoring flows");

metaCommand
  .command("create-agent")
  .description("create a reviewable Agent folder scaffold from a natural-language requirement")
  .requiredOption("--prompt <text>", "natural-language requirement for the new Agent")
  .option("--id <id>", "target Agent id, for example image-gen/prototype-v1")
  .option("--name <name>", "Agent display name")
  .option("--description <text>", "Agent description")
  .option("--out <path>", "draft output root; ignored when --persist is set")
  .option("--root <path>", "installed Agents root directory", "agents")
  .option("--persist", "write directly into the Agents root instead of a draft directory")
  .option("--force", "allow overwriting an existing draft or Agent folder")
  .action(async (opts) => {
    const result = await createAgentWithMeta({
      prompt: opts.prompt,
      agentId: opts.id,
      name: opts.name,
      description: opts.description,
      outDir: opts.out,
      rootDir: opts.root,
      persist: Boolean(opts.persist),
      force: Boolean(opts.force),
    });
    console.log(formatMetaCreateAgentResult(result));
    if (!result.validation.ok) {
      process.exitCode = 1;
    }
  });

metaCommand
  .command("install-agent")
  .description("install a generated Agent draft from a Meta-Agent run into the local Agents root")
  .requiredOption("--run <run_id>", "Meta-Agent create run id")
  .option("--root <path>", "installed Agents root directory", "agents")
  .option("--force", "overwrite an existing Agent folder")
  .action(async (opts) => {
    try {
      const result = await installAgentDraft({
        runId: opts.run,
        rootDir: opts.root,
        force: Boolean(opts.force),
      });
      console.log(`agent_id: ${result.agentId}`);
      console.log(`source: ${path.relative(process.cwd(), result.sourcePath)}`);
      console.log(`target: ${path.relative(process.cwd(), result.targetPath)}`);
      console.log(`installed: ${result.installed ? "yes" : "no"}`);
      console.log(`validation: ${result.validation.ok ? "ok" : "failed"}`);
      if (!result.installed) {
        process.exitCode = 1;
      }
    } catch (error) {
      if (error instanceof InstallConflictError) {
        console.error(`${error.message}. Pass --force to overwrite after reviewing the draft.`);
        process.exitCode = 1;
        return;
      }
      throw error;
    }
  });

const runCommand = program.command("run").description("inspect runtime run history");

runCommand
  .command("list")
  .description("list local runtime runs")
  .option("--limit <number>", "maximum number of runs to show", "20")
  .option("--traces <path>", "traces root directory", "traces")
  .action(async (opts) => {
    const limit = Number(opts.limit);
    const items = await listRunHistory({
      limit: Number.isFinite(limit) && limit > 0 ? limit : 20,
      tracesRoot: opts.traces,
    });
    console.log(formatRunHistoryList(items));
  });

runCommand
  .command("show")
  .description("show one runtime run and its artifacts")
  .argument("<run_id>", "run id")
  .option("--traces <path>", "traces root directory", "traces")
  .action(async (runId, opts) => {
    const detail = await getRunHistoryDetail(runId, { tracesRoot: opts.traces });
    if (!detail) {
      console.error(`Run not found: ${runId}`);
      process.exitCode = 1;
      return;
    }
    console.log(formatRunHistoryDetail(detail));
  });

const artifactCommand = program.command("artifact").description("inspect and open runtime artifacts");

artifactCommand
  .command("list")
  .description("list local runtime artifacts")
  .option("--run <run_id>", "only list artifacts from one run")
  .option("--limit <number>", "maximum number of artifacts to show", "20")
  .option("--traces <path>", "traces root directory", "traces")
  .action(async (opts) => {
    const limit = Number(opts.limit);
    const items = await listArtifacts({
      runId: opts.run,
      limit: Number.isFinite(limit) && limit > 0 ? limit : 20,
      tracesRoot: opts.traces,
    });
    console.log(formatArtifactList(items));
  });

artifactCommand
  .command("show")
  .description("show one artifact")
  .argument("<artifact_id>", "artifact id")
  .option("--traces <path>", "traces root directory", "traces")
  .action(async (artifactId, opts) => {
    const artifact = await getArtifactDetail(artifactId, { tracesRoot: opts.traces });
    if (!artifact) {
      console.error(`Artifact not found: ${artifactId}`);
      process.exitCode = 1;
      return;
    }
    console.log(formatArtifactDetail(artifact));
  });

artifactCommand
  .command("open")
  .description("open an artifact with the system default app")
  .argument("<artifact_id>", "artifact id")
  .option("--traces <path>", "traces root directory", "traces")
  .action(async (artifactId, opts) => {
    const artifact = await openArtifact(artifactId, { tracesRoot: opts.traces });
    if (!artifact) {
      console.error(`Artifact not found: ${artifactId}`);
      process.exitCode = 1;
      return;
    }
    console.log(`opened: ${artifact.path}`);
  });

artifactCommand
  .command("write-back")
  .description("mark an approved artifact for knowledge-base write-back")
  .argument("<artifact_id>", "artifact id")
  .requiredOption("--collection <id>", "target knowledge-base collection id")
  .requiredOption("--reviewer <name>", "reviewer who approved the write-back")
  .option("--note <text>", "review note")
  .option("--traces <path>", "traces root directory", "traces")
  .action(async (artifactId, opts) => {
    const result = await markArtifactForKnowledgeBase({
      artifactId,
      collectionId: opts.collection,
      reviewer: opts.reviewer,
      note: opts.note,
      tracesRoot: opts.traces,
    });
    if (!result) {
      console.error(`Artifact not found: ${artifactId}`);
      process.exitCode = 1;
      return;
    }
    console.log(formatKnowledgeWriteBackResult(result));
  });

artifactCommand
  .command("write-backs")
  .description("list artifact knowledge-base write-back records")
  .option("--run <run_id>", "only list write-backs from one run")
  .option("--artifact <artifact_id>", "only list write-backs for one artifact")
  .option("--collection <id>", "only list write-backs for one knowledge-base collection")
  .option("--traces <path>", "traces root directory", "traces")
  .action(async (opts) => {
    const items = await listKnowledgeWriteBacks({
      runId: opts.run,
      artifactId: opts.artifact,
      collectionId: opts.collection,
      tracesRoot: opts.traces,
    });
    console.log(formatKnowledgeWriteBackList(items));
  });

const uiCommand = program.command("ui").description("prepare local UI prototype data");

uiCommand
  .command("export-data")
  .description("export runtime data for the static Workbench prototype")
  .option("--out <path>", "output JSON path", "ui/workbench-prototype/data/workbench.json")
  .option("--traces <path>", "traces root directory", "traces")
  .option("--limit <number>", "maximum number of artifacts to include", "12")
  .action(async (opts) => {
    const limit = Number(opts.limit);
    const result = await writeWorkbenchData(opts.out, {
      tracesRoot: opts.traces,
      artifactLimit: Number.isFinite(limit) && limit > 0 ? limit : 12,
    });
    console.log(`workbench_data: ${path.relative(process.cwd(), result.outputPath)}`);
    console.log(`runs: ${result.data.selectedRun ? 1 : 0}`);
    console.log(`artifacts: ${result.data.artifacts.length}`);
  });

uiCommand
  .command("serve")
  .description("serve the Workbench prototype with local runtime APIs")
  .option("--host <host>", "host to bind", "127.0.0.1")
  .option("--port <number>", "port to listen on", "4177")
  .action(async (opts) => {
    const port = Number(opts.port);
    const server = await serveWorkbench({
      host: opts.host,
      port: Number.isFinite(port) && port > 0 ? port : 4177,
    });
    if (server.port !== server.requestedPort) {
      console.log(`port ${server.requestedPort} is busy, using ${server.port} instead`);
    }
    console.log(`workbench: ${server.url}`);
    console.log(
      "api: /api/workbench, /api/settings, /api/agents, /api/runs/:id, /api/artifacts/:id, /api/artifact-content, /api/artifact/open, /api/run/open-trace, /api/meta/create-agent, /api/meta/install-agent, /api/agent/run",
    );
  });

function optsRawPrompt(opts: { rawPrompt?: boolean }) {
  return opts.rawPrompt;
}

program.parseAsync(process.argv).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
