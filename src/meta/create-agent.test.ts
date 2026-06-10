import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createAgentWithMeta } from "./create-agent.js";

test("Meta-Agent uses configured OpenAI-compatible chat provider for Agent spec drafts", async () => {
  const previousCwd = process.cwd();
  const workspace = await mkdtemp(path.join(tmpdir(), "moyu-meta-llm-"));
  const restore = captureLlmEnv();
  const previousFetch = globalThis.fetch;
  let requestedUrl = "";
  let requestedBody: Record<string, unknown> = {};

  try {
    process.chdir(workspace);
    process.env.MOYU_LLM_PROVIDER_BASE_URL = "https://llm.example.com/v1";
    process.env.MOYU_LLM_PROVIDER_API_KEY = "test-key";
    process.env.MOYU_LLM_PROVIDER_MODEL = "meta-model";
    globalThis.fetch = async (input, init) => {
      requestedUrl = String(input);
      requestedBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      return new Response(
        JSON.stringify({
          model: "meta-model",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  agent_id: "research/notes-organizer-v1",
                  name: "Research Notes Organizer",
                  description: "Organize research notes into reviewable summaries.",
                  kind: "task",
                  tags: ["research", "notes"],
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };

    const result = await createAgentWithMeta({
      prompt: "Create a research notes organizer Agent",
    });

    assert.equal(requestedUrl, "https://llm.example.com/v1/chat/completions");
    assert.equal(requestedBody?.model, "meta-model");
    assert.equal(result.specSource, "llm");
    assert.equal(result.agentId, "research/notes-organizer-v1");

    const trace = JSON.parse(await readFile(path.join("traces", result.runId, "run.json"), "utf8"));
    const specStep = trace.steps.find((step: { id?: string }) => step.id === "spec-draft");
    assert.equal(specStep.outputSummary.source, "llm");
    assert.equal(specStep.outputSummary.model, "meta-model");
    assert.equal(specStep.outputSummary.provider, "https://llm.example.com/v1/chat/completions");

    const manifest = await readFile(path.join(result.agentPath, "manifest.yaml"), "utf8");
    assert.match(manifest, /agent_id: research\/notes-organizer-v1/);
    assert.match(manifest, /conversation-primary:/);
    assert.match(manifest, /model: gpt-4\.1-mini/);
  } finally {
    globalThis.fetch = previousFetch;
    process.chdir(previousCwd);
    restore();
    await rm(workspace, { recursive: true, force: true });
  }
});

test("Meta-Agent falls back to local rules when configured chat provider fails", async () => {
  const previousCwd = process.cwd();
  const workspace = await mkdtemp(path.join(tmpdir(), "moyu-meta-llm-fallback-"));
  const restore = captureLlmEnv();
  const previousFetch = globalThis.fetch;

  try {
    process.chdir(workspace);
    process.env.MOYU_LLM_PROVIDER_BASE_URL = "https://llm.example.com";
    process.env.MOYU_LLM_PROVIDER_API_KEY = "test-key";
    process.env.MOYU_LLM_PROVIDER_MODEL = "meta-model";
    globalThis.fetch = async () => new Response("provider unavailable", { status: 500 });

    const result = await createAgentWithMeta({
      prompt: "Create a research notes organizer Agent",
    });

    assert.equal(result.specSource, "rule");
    assert.equal(result.agentId, "custom/agent-v1");
    const trace = JSON.parse(await readFile(path.join("traces", result.runId, "run.json"), "utf8"));
    const specStep = trace.steps.find((step: { id?: string }) => step.id === "spec-draft");
    assert.equal(specStep.outputSummary.source, "rule");
    assert.equal(specStep.outputSummary.model, "meta-model");
    assert.match(specStep.outputSummary.fallback_reason, /provider unavailable/);
    assert.equal(
      trace.notes.some((note: string) => note.includes("fell back to local rules")),
      true,
    );
  } finally {
    globalThis.fetch = previousFetch;
    process.chdir(previousCwd);
    restore();
    await rm(workspace, { recursive: true, force: true });
  }
});

test("Meta-Agent strict LLM spec mode fails instead of falling back", async () => {
  const previousCwd = process.cwd();
  const workspace = await mkdtemp(path.join(tmpdir(), "moyu-meta-llm-strict-"));
  const restore = captureLlmEnv();
  const previousFetch = globalThis.fetch;

  try {
    process.chdir(workspace);
    process.env.MOYU_LLM_PROVIDER_BASE_URL = "https://llm.example.com";
    process.env.MOYU_LLM_PROVIDER_API_KEY = "test-key";
    process.env.MOYU_LLM_PROVIDER_MODEL = "meta-model";
    globalThis.fetch = async () => new Response("provider unavailable", { status: 500 });

    await assert.rejects(
      createAgentWithMeta({
        prompt: "Create a research notes organizer Agent",
        requireLlmSpec: true,
      }),
      /Meta-Agent LLM spec generation failed: chat completion request failed: 500 provider unavailable/,
    );
  } finally {
    globalThis.fetch = previousFetch;
    process.chdir(previousCwd);
    restore();
    await rm(workspace, { recursive: true, force: true });
  }
});

function captureLlmEnv() {
  const previousBaseUrl = process.env.MOYU_LLM_PROVIDER_BASE_URL;
  const previousApiKey = process.env.MOYU_LLM_PROVIDER_API_KEY;
  const previousModel = process.env.MOYU_LLM_PROVIDER_MODEL;
  return () => {
    restoreEnv("MOYU_LLM_PROVIDER_BASE_URL", previousBaseUrl);
    restoreEnv("MOYU_LLM_PROVIDER_API_KEY", previousApiKey);
    restoreEnv("MOYU_LLM_PROVIDER_MODEL", previousModel);
  };
}

function restoreEnv(name: string, value: string | undefined) {
  if (typeof value === "string") {
    process.env[name] = value;
  } else {
    delete process.env[name];
  }
}
