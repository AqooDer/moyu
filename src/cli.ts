#!/usr/bin/env node
import { Command } from "commander";
import { runImageGenSpike } from "./spike/image-gen.js";

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

program.parseAsync(process.argv).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
