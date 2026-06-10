import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { readMetaAgentLlmConfigFromStore } from "../../lib/env.js";
import {
  listModelRoles,
  listProviders,
  readProviderApiKey,
  upsertModelRole,
  upsertProvider,
} from "./sqlite.js";

test("SQLite settings encrypt provider API keys and resolve Meta-Agent LLM config", async () => {
  const workspace = await mkdtemp(path.join(tmpdir(), "moyu-settings-sqlite-"));
  const paths = {
    dbPath: path.join(workspace, ".moyu", "settings.sqlite"),
    keyPath: path.join(workspace, ".moyu", "settings.key"),
  };
  const restore = captureLlmEnv();
  const secret = "sk-test-secret-plaintext";

  try {
    delete process.env.MOYU_LLM_PROVIDER_ID;
    delete process.env.MOYU_LLM_PROVIDER_BASE_URL;
    delete process.env.MOYU_LLM_PROVIDER_API_KEY;
    delete process.env.MOYU_LLM_PROVIDER_MODEL;

    await upsertProvider(
      {
        id: "openai-compat",
        name: "Local OpenAI-compatible Provider",
        baseUrl: "https://llm.example.com/v1",
        defaultFor: ["conversation-primary"],
        models: ["meta-model"],
        chatModels: ["meta-model"],
        apiKey: secret,
      },
      paths,
    );
    await upsertModelRole(
      {
        id: "conversation-primary",
        providerId: "openai-compat",
        model: "meta-model",
      },
      paths,
    );

    const dbBytes = await readFile(paths.dbPath);
    assert.equal(dbBytes.includes(Buffer.from(secret)), false);

    const providers = await listProviders(paths);
    assert.equal(providers.length, 1);
    assert.equal(providers[0].baseUrl, "https://llm.example.com/v1");
    assert.equal(providers[0].secretConfigured, true);
    assert.deepEqual(providers[0].chatModels, ["meta-model"]);
    assert.equal(await readProviderApiKey("openai-compat", paths), secret);

    const roles = await listModelRoles(paths);
    assert.equal(roles.find((role) => role.id === "conversation-primary")?.model, "meta-model");

    const config = await readMetaAgentLlmConfigFromStore(paths);
    assert.deepEqual(config, {
      baseUrl: "https://llm.example.com/v1",
      apiKey: secret,
      model: "meta-model",
      modelSource: "workspace_config",
    });
  } finally {
    restore();
    await rm(workspace, { recursive: true, force: true });
  }
});

function captureLlmEnv() {
  const previousProviderId = process.env.MOYU_LLM_PROVIDER_ID;
  const previousBaseUrl = process.env.MOYU_LLM_PROVIDER_BASE_URL;
  const previousApiKey = process.env.MOYU_LLM_PROVIDER_API_KEY;
  const previousModel = process.env.MOYU_LLM_PROVIDER_MODEL;
  return () => {
    restoreEnv("MOYU_LLM_PROVIDER_ID", previousProviderId);
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
