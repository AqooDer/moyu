import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

interface SettingsModule {
  parseSettingsHash(hashValue: string): { view: string; sectionId: string };
  toSettingsHash(sectionId: string): string;
  normalizeSettingsPayload(payload: unknown): unknown;
  resolveSettingsRenderState(input: { status?: string; settings?: unknown } | null): string;
  shouldUsePreviewSettingsFallback(input: { status?: string; canUseLocalApi?: boolean; apiAvailable?: boolean }): boolean;
  getCapabilityDetailRows(input: unknown): Array<{ kind: string; labelKey: string; value: unknown }>;
}

test("settings module resolves hash routing and render states", async () => {
  const module = await loadSettingsModule();
  const settings = {
    nav: [{ id: "models" }],
  };

  assertSettingsRoute(module.parseSettingsHash("#settings/models"), "settings", "models");
  assertSettingsRoute(module.parseSettingsHash("#settings"), "settings", "overview");
  assertSettingsRoute(module.parseSettingsHash("#settings-old/models"), "conversation", "");
  assertSettingsRoute(module.parseSettingsHash("#settings/%E0%A4%A"), "settings", "overview");
  assert.equal(module.toSettingsHash("tools"), "#settings/tools");
  assert.equal(module.toSettingsHash(""), "#settings/overview");

  assert.equal(module.normalizeSettingsPayload({ ok: true, settings }), settings);
  assert.equal(module.normalizeSettingsPayload(settings), settings);
  assert.equal(module.normalizeSettingsPayload({ ok: true }), null);

  assert.equal(module.resolveSettingsRenderState({ status: "loading" }), "loading");
  assert.equal(module.resolveSettingsRenderState({ status: "error" }), "error");
  assert.equal(module.resolveSettingsRenderState({ status: "ready", settings: { nav: [] } }), "empty");
  assert.equal(module.resolveSettingsRenderState({ status: "ready", settings }), "ready");

  assert.equal(module.shouldUsePreviewSettingsFallback({ status: "ready", canUseLocalApi: true, apiAvailable: true }), false);
  assert.equal(module.shouldUsePreviewSettingsFallback({ status: "idle", canUseLocalApi: false, apiAvailable: false }), true);
  assert.equal(module.shouldUsePreviewSettingsFallback({ status: "idle", canUseLocalApi: true, apiAvailable: false }), true);
  assert.equal(module.shouldUsePreviewSettingsFallback({ status: "error", canUseLocalApi: true, apiAvailable: true }), true);
});

test("settings module exposes capability detail rows for rendering permission boundaries", async () => {
  const module = await loadSettingsModule();
  const rows = module.getCapabilityDetailRows({
    scope: { zh: "所有运行时默认可用", en: "Available to all runtime sessions" },
    source: { zh: "builtin runtime", en: "builtin runtime" },
    sourceType: "builtin",
    permissionBoundary: { zh: "只能写入 Artifact 路径", en: "Write only artifact paths" },
    approval: { zh: "默认启用", en: "Enabled by default" },
    defaultEnabledFor: ["meta/create-agent"],
    riskLevel: "low",
  });

  assert.equal(
    JSON.stringify(rows.map((row) => [row.kind, row.labelKey])),
    JSON.stringify([
      ["text", "scopeLabel"],
      ["text", "sourceLabel"],
      ["text", "sourceTypeLabel"],
      ["text", "permissionBoundaryLabel"],
      ["text", "approvalLabel"],
      ["tags", "defaultEnabledForLabel"],
      ["text", "riskLevelLabel"],
    ]),
  );
  assert.equal(rows[3].value && typeof rows[3].value === "object" && "zh" in rows[3].value, true);
  assert.deepEqual(rows[5].value, ["meta/create-agent"]);

  const sparseRows = module.getCapabilityDetailRows({
    scope: { zh: "仅保留 scope", en: "Scope only" },
    defaultEnabledFor: [],
  });
  assert.equal(JSON.stringify(sparseRows.map((row) => row.labelKey)), JSON.stringify(["scopeLabel"]));
});

function assertSettingsRoute(route: { view: string; sectionId: string }, view: string, sectionId: string) {
  assert.equal(route.view, view);
  assert.equal(route.sectionId, sectionId);
}

async function loadSettingsModule() {
  const source = await readFile(new URL("../../ui/workbench-prototype/settings-module.js", import.meta.url), "utf8");
  const context = vm.createContext({ window: {} });
  vm.runInContext(source, context);
  const module = (context.window as { MoyuSettingsModule?: SettingsModule }).MoyuSettingsModule;
  assert.ok(module, "settings module should attach to window");
  return module;
}
