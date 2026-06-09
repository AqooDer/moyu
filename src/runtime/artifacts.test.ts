import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { RuntimeStore } from "./store.js";
import {
  buildArtifactPreviewMetadata,
  readArtifactPreview,
  readArtifactText,
} from "./artifacts.js";

test("artifact preview metadata classifies text, image, and office files", () => {
  const markdown = buildArtifactPreviewMetadata({
    type: "md",
    name: "README.md",
    path: path.resolve("artifacts/demo/README.md"),
  });
  assert.equal(markdown.kind, "text");
  assert.equal(markdown.canInline, true);
  assert.equal(markdown.canExtractText, true);
  assert.equal(markdown.sandbox.scope, "artifacts");

  const image = buildArtifactPreviewMetadata({
    type: "png",
    name: "concept.png",
    path: path.resolve("artifacts/demo/concept.png"),
  });
  assert.equal(image.kind, "image");
  assert.equal(image.canInline, true);
  assert.equal(image.mime, "image/png");

  const docx = buildArtifactPreviewMetadata({
    type: "docx",
    name: "brief.docx",
    path: path.resolve("artifacts/demo/brief.docx"),
  });
  assert.equal(docx.kind, "office");
  assert.equal(docx.canInline, false);
  assert.equal(docx.canOpenExternal, true);
  assert.match(docx.reason || "", /Office parsing/);
});

test("artifact preview reads text content and keeps binary artifacts metadata-only", async () => {
  const previousCwd = process.cwd();
  const workspace = await mkdtemp(path.join(tmpdir(), "moyu-artifact-preview-"));

  try {
    process.chdir(workspace);
    await mkdir("outputs", { recursive: true });
    const textPath = path.resolve("outputs", "summary.md");
    const docxPath = path.resolve("outputs", "brief.docx");
    await writeFile(textPath, "# Summary\n\nA traceable artifact.\n", "utf8");
    await writeFile(docxPath, Buffer.from([0x50, 0x4b, 0x03, 0x04]));

    const runtime = RuntimeStore.createRun({
      id: "run-preview-test",
      workId: "work-preview-test",
      agentId: "test/preview",
      agentVersion: "0.1.0",
      recipeId: null,
      dryRun: false,
      input: {},
    });
    runtime.setRunState("running");
    const textStep = runtime.startStep({ id: "text", name: "TEXT", kind: "tool" });
    const textArtifact = await runtime.addArtifact({
      producerStepId: textStep.id,
      type: "md",
      role: "primary",
      filePath: textPath,
    });
    runtime.finishStep(textStep.id, "succeeded");
    const binaryStep = runtime.startStep({ id: "binary", name: "BINARY", kind: "tool" });
    const binaryArtifact = await runtime.addArtifact({
      producerStepId: binaryStep.id,
      type: "docx",
      role: "report",
      filePath: docxPath,
    });
    runtime.finishStep(binaryStep.id, "succeeded");
    runtime.setRunState("succeeded");
    await runtime.writeTrace();

    const textPreview = await readArtifactPreview(textArtifact.id);
    assert.equal(textPreview?.preview.kind, "text");
    assert.equal(textPreview?.binary, false);
    assert.match(textPreview?.text || "", /Traceable|traceable/);
    assert.equal(textPreview?.preview.sandbox.scope, "workspace");
    assert.equal(textPreview?.preview.sandbox.relativePath, "outputs/summary.md");

    const legacyText = await readArtifactText(textArtifact.id);
    assert.equal(legacyText?.binary, false);
    assert.match(legacyText?.text || "", /Summary/);

    const binaryPreview = await readArtifactPreview(binaryArtifact.id);
    assert.equal(binaryPreview?.preview.kind, "office");
    assert.equal(binaryPreview?.binary, true);
    assert.equal(binaryPreview?.text, null);
    assert.equal(binaryPreview?.preview.canOpenExternal, true);
  } finally {
    process.chdir(previousCwd);
    await rm(workspace, { recursive: true, force: true });
  }
});
