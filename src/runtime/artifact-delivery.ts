import path from "node:path";
import { buildArtifactPreviewMetadata } from "./artifacts.js";
import type {
  ArtifactDeliveryPreviewKind,
  ArtifactDeliveryRecord,
  ArtifactDeliveryState,
  ArtifactRecord,
  ArtifactRole,
  RunRecord,
} from "./types.js";

export interface CreateArtifactDeliveryInput {
  run: RunRecord;
  artifacts: ArtifactRecord[];
  title?: string;
  state?: ArtifactDeliveryState;
  createdAt?: string;
  constraints?: string[];
}

export function createArtifactDeliveryRecord(
  input: CreateArtifactDeliveryInput,
): ArtifactDeliveryRecord {
  const timestamp = input.createdAt ?? new Date().toISOString();
  const items = input.artifacts.map((artifact) => {
    const preview = buildArtifactPreviewMetadata({
      type: artifact.type,
      name: artifact.name,
      path: artifact.path,
    });
    const relativePath = preview.sandbox.relativePath ?? workspaceRelativePath(artifact.path);
    return {
      artifactId: artifact.id,
      name: artifact.name,
      type: artifact.type,
      role: artifact.role,
      path: artifact.path,
      relativePath,
      sizeBytes: artifact.sizeBytes,
      sha256: artifact.sha256,
      previewKind: preview.kind as ArtifactDeliveryPreviewKind,
      canInline: preview.canInline,
      canOpenExternal: preview.canOpenExternal,
      state: "ready" as const,
      summary: `${preview.label}; ${preview.canInline ? "inline preview" : "metadata preview"}.`,
    };
  });
  const primaryArtifactId = findPrimaryArtifactId(input.artifacts);
  const openableArtifactIds = items
    .filter((item) => item.canOpenExternal)
    .map((item) => item.artifactId);

  return {
    id: `delivery-${input.run.id}`,
    runId: input.run.id,
    workId: input.run.workId || `work-${input.run.id}`,
    title: input.title ?? "Artifact delivery manifest",
    state: input.state ?? (items.length > 0 ? "ready" : "empty"),
    summary: {
      primary: countRole(input.artifacts, "primary"),
      intermediate: countRole(input.artifacts, "intermediate"),
      report: countRole(input.artifacts, "report"),
      log: countRole(input.artifacts, "log"),
      inlinePreviewable: items.filter((item) => item.canInline).length,
      externalOpenable: openableArtifactIds.length,
    },
    items,
    totalArtifacts: items.length,
    totalSizeBytes: items.reduce((total, item) => total + item.sizeBytes, 0),
    primaryArtifactId,
    downloadableArtifactIds: items.map((item) => item.artifactId),
    openableArtifactIds,
    constraints: input.constraints ?? defaultDeliveryConstraints(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function formatArtifactDeliverySummary(delivery: ArtifactDeliveryRecord | null) {
  if (!delivery) {
    return "No artifact delivery manifest.";
  }

  const lines = [
    `${delivery.title} (${delivery.state})`,
    `artifacts: ${delivery.totalArtifacts}`,
    `total_size: ${formatBytes(delivery.totalSizeBytes)}`,
    `primary: ${delivery.primaryArtifactId ?? "-"}`,
    `openable: ${delivery.openableArtifactIds.length}`,
  ];
  if (delivery.items.length > 0) {
    lines.push(
      ...delivery.items.map(
        (item) =>
          `- ${item.artifactId} ${item.name} ${item.type}/${item.role} ${formatBytes(item.sizeBytes)} preview=${item.previewKind}`,
      ),
    );
  }
  return lines.join("\n");
}

function findPrimaryArtifactId(artifacts: ArtifactRecord[]) {
  return (
    artifacts.find((artifact) => artifact.role === "primary")?.id ??
    artifacts[0]?.id ??
    null
  );
}

function countRole(artifacts: ArtifactRecord[], role: ArtifactRole) {
  return artifacts.filter((artifact) => artifact.role === role).length;
}

function workspaceRelativePath(filePath: string) {
  const relative = path.relative(process.cwd(), path.resolve(filePath));
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }
  return relative.split(path.sep).join("/");
}

function defaultDeliveryConstraints() {
  return [
    "Delivery v1 is a read-only manifest; bundled downloads are not enabled yet.",
    "Artifact version graph, diff, delete, and adoption workflows are planned for later Artifact Service milestones.",
    "PDF and Office files keep metadata/open-external delivery until parser plugins are enabled.",
  ];
}

function formatBytes(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes}B`;
  }
  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)}KB`;
  }
  return `${(sizeBytes / 1024 / 1024).toFixed(1)}MB`;
}
