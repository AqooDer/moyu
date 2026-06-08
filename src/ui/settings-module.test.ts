import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

interface SettingsModule {
  parseSettingsHash(hashValue: string): { view: string; sectionId: string };
  toSettingsHash(sectionId: string): string;
  normalizeSettingsPayload(payload: unknown): unknown;
  resolveSettingsRenderState(input: { status?: string; settings?: unknown } | null): string;
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
