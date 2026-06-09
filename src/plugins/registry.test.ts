import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPluginRegistrySnapshot,
  listPluginCapabilities,
  listPluginPermissions,
  toWorkbenchCapability,
} from "./registry.js";

test("plugin registry exposes capabilities across framework extension kinds", () => {
  const snapshot = buildPluginRegistrySnapshot();

  assert.equal(snapshot.schemaVersion, 1);
  assert.equal(snapshot.summary.total, snapshot.capabilities.length);
  assert.equal(snapshot.summary.byKind.skill, 2);
  assert.equal(snapshot.summary.byKind.tool, 3);
  assert.equal(snapshot.summary.byKind.mcp, 2);
  assert.equal(snapshot.summary.byKind.previewer, 1);
  assert.equal(snapshot.summary.byKind.middleware, 1);
  assert.equal(snapshot.summary.highRisk >= 2, true);
  assert.equal(snapshot.permissions.some((permission) => permission.id === "artifact.preview.read"), true);
});

test("plugin registry maps permissions into Workbench capability cards", () => {
  const previewer = listPluginCapabilities({ kind: "previewer" })[0];
  assert.equal(previewer.id, "artifact-preview-v1");
  assert.deepEqual(previewer.permissionIds, ["artifact.preview.read"]);

  const workbenchCapability = toWorkbenchCapability(previewer);
  assert.equal(workbenchCapability.kind, "previewer");
  assert.equal(workbenchCapability.riskLevel, "low");
  assert.deepEqual(workbenchCapability.permissionIds, ["artifact.preview.read"]);
  assert.match(workbenchCapability.permissionBoundary.zh, /已登记 Artifact/);

  const permissions = listPluginPermissions();
  assert.equal(
    permissions.every((permission) => permission.boundary.zh && permission.approval.zh && permission.riskLevel),
    true,
  );
});
