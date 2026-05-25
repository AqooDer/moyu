#!/usr/bin/env node
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
import { runImageGenSpike } from "./spike/image-gen.js";

loadLocalEnv();

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

function optsRawPrompt(opts: { rawPrompt?: boolean }) {
  return opts.rawPrompt;
}

program.parseAsync(process.argv).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
