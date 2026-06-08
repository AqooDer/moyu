import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

interface InstallModule {
  formatInstallConflict(data: unknown, dict: Record<string, string>): string;
  getCreateVersionAction(conflict: unknown): unknown;
  canCreateInstallVersion(input: {
    apiAvailable?: boolean;
    selectedRunId?: string;
    isInstalling?: boolean;
    conflict?: unknown;
  }): boolean;
  formatDiffSummary(diff: unknown, dict: Record<string, string>): string;
}

const dict = {
  installConflict: "正式 Agent 已存在，当前草案不会覆盖。",
  installConflictAction: "建议：创建新版本，或进入差异合并后再安装。",
  conflictAgentLabel: "冲突 Agent",
  conflictSourceLabel: "草案路径",
  conflictTargetLabel: "已有目标",
  conflictVersionLabel: "拟创建版本",
  conflictVersionTargetLabel: "版本目标",
  conflictDiffLabel: "文件差异",
  diffSourceOnly: "草案新增",
  diffTargetOnly: "目标独有",
  diffChanged: "内容变更",
  diffUnchanged: "相同",
};

test("install module formats conflict resolution actions for the Workbench", async () => {
  const module = await loadInstallModule();
  const conflict = {
    agentId: "custom/image-prototype-v1",
    sourcePath: "/tmp/draft/custom__image-prototype-v1",
    targetPath: "/repo/agents/custom__image-prototype-v1",
    diffSummary: {
      sourceOnly: 1,
      targetOnly: 0,
      changed: 2,
      unchanged: 5,
    },
    nextActions: {
      createVersion: {
        type: "create_version",
        method: "POST",
        endpoint: "/api/meta/install-agent/version",
        payload: { runId: "meta-create-1" },
        proposedAgentId: "custom/image-prototype-v2",
        proposedTargetPath: "/repo/agents/custom__image-prototype-v2",
      },
    },
  };

  const text = module.formatInstallConflict(conflict, dict);
  assert.match(text, /冲突 Agent: custom\/image-prototype-v1/);
  assert.match(text, /草案路径: \/tmp\/draft\/custom__image-prototype-v1/);
  assert.match(text, /已有目标: \/repo\/agents\/custom__image-prototype-v1/);
  assert.match(text, /拟创建版本: custom\/image-prototype-v2/);
  assert.match(text, /版本目标: \/repo\/agents\/custom__image-prototype-v2/);
  assert.match(text, /文件差异: 草案新增 1 · 目标独有 0 · 内容变更 2 · 相同 5/);
  assert.match(text, /建议：创建新版本/);

  assert.equal(module.getCreateVersionAction(conflict), conflict.nextActions.createVersion);
  assert.equal(
    module.canCreateInstallVersion({
      apiAvailable: true,
      selectedRunId: "meta-create-1",
      isInstalling: false,
      conflict,
    }),
    true,
  );
  assert.equal(
    module.canCreateInstallVersion({
      apiAvailable: true,
      selectedRunId: "meta-create-1",
      isInstalling: true,
      conflict,
    }),
    false,
  );
});

test("install module rejects incomplete version actions", async () => {
  const module = await loadInstallModule();
  const incompleteConflict = {
    nextActions: {
      createVersion: {
        method: "GET",
        endpoint: "/api/meta/install-agent/version",
      },
    },
  };

  assert.equal(module.getCreateVersionAction(incompleteConflict), null);
  assert.equal(
    module.canCreateInstallVersion({
      apiAvailable: true,
      selectedRunId: "meta-create-1",
      isInstalling: false,
      conflict: incompleteConflict,
    }),
    false,
  );
});

async function loadInstallModule() {
  const source = await readFile(new URL("../../ui/workbench-prototype/install-module.js", import.meta.url), "utf8");
  const context = vm.createContext({ window: {} });
  vm.runInContext(source, context);
  const module = (context.window as { MoyuInstallModule?: InstallModule }).MoyuInstallModule;
  assert.ok(module, "install module should attach to window");
  return module;
}
