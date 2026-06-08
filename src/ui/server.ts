import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { findAgent, listAgents } from "../agent/registry.js";
import { runImageAgent } from "../agent/run.js";
import { createAgentWithMeta } from "../meta/create-agent.js";
import { listAgentDraftRecords, type AgentDraftState } from "../meta/agent-draft.js";
import { InstallConflictError, installAgentDraft } from "../meta/install-agent.js";
import { getArtifactDetail, openArtifact, readArtifactText } from "../runtime/artifacts.js";
import { getRunHistoryDetail, openRunTrace } from "../runtime/history.js";
import { buildWorkbenchData, buildWorkbenchSettings } from "../runtime/workbench-data.js";

interface ServeWorkbenchOptions {
  host?: string;
  port?: number;
  rootDir?: string;
  portFallback?: boolean;
}

interface MetaCreateRequest {
  prompt?: string;
  agentId?: string;
  name?: string;
  description?: string;
  persist?: boolean;
}

interface MetaInstallRequest {
  runId?: string;
  force?: boolean;
}

interface ArtifactOpenRequest {
  artifactId?: string;
}

interface RunOpenTraceRequest {
  runId?: string;
}

interface AgentRunRequest {
  agentId?: string;
  prompt?: string;
  count?: number;
  size?: string;
  style?: string;
  rawPrompt?: boolean;
  dryRun?: boolean;
}

export async function serveWorkbench(input: ServeWorkbenchOptions = {}) {
  const host = input.host ?? "127.0.0.1";
  const requestedPort = input.port ?? 4177;
  const rootDir = path.resolve(input.rootDir ?? ".");

  const server = createServer(async (request, response) => {
    try {
      await routeRequest(request, response, rootDir);
    } catch (error) {
      writeJson(response, 500, {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  const port = await listenWithFallback(server, host, requestedPort, input.portFallback ?? true);

  return {
    host,
    port,
    requestedPort,
    url: `http://${host}:${port}/ui/workbench-prototype/`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

async function routeRequest(request: IncomingMessage, response: ServerResponse, rootDir: string) {
  const method = request.method ?? "GET";
  const url = new URL(request.url ?? "/", "http://127.0.0.1");

  if (method === "GET" && url.pathname === "/api/health") {
    writeJson(response, 200, { ok: true, service: "moyu-workbench" });
    return;
  }

  if (method === "GET" && url.pathname === "/api/workbench") {
    writeJson(response, 200, await buildWorkbenchData({ selectedRunId: url.searchParams.get("runId") || undefined }));
    return;
  }

  if (method === "GET" && url.pathname === "/api/settings") {
    writeJson(response, 200, {
      ok: true,
      schemaVersion: 1,
      settings: buildWorkbenchSettings(),
    });
    return;
  }

  if (method === "GET" && url.pathname === "/api/agents") {
    writeJson(response, 200, { ok: true, agents: await listAgents() });
    return;
  }

  if (method === "GET" && url.pathname === "/api/meta/agent-drafts") {
    writeJson(response, 200, {
      ok: true,
      drafts: await listAgentDraftRecords({
        state: readDraftState(url.searchParams.get("state")),
        agentId: url.searchParams.get("agentId") || undefined,
      }),
    });
    return;
  }

  const runMatch = url.pathname.match(/^\/api\/runs\/([^/]+)$/);
  if (method === "GET" && runMatch) {
    const runId = decodeURIComponent(runMatch[1]);
    const detail = await getRunHistoryDetail(runId);
    if (!detail) {
      writeJson(response, 404, { ok: false, error: "run not found" });
      return;
    }
    writeJson(response, 200, { ok: true, ...detail });
    return;
  }

  const artifactMatch = url.pathname.match(/^\/api\/artifacts\/([^/]+)$/);
  if (method === "GET" && artifactMatch) {
    const artifactId = decodeURIComponent(artifactMatch[1]);
    const artifact = await getArtifactDetail(artifactId);
    if (!artifact) {
      writeJson(response, 404, { ok: false, error: "artifact not found" });
      return;
    }
    writeJson(response, 200, { ok: true, artifact });
    return;
  }

  if (method === "GET" && url.pathname === "/api/artifact-content") {
    const artifactId = url.searchParams.get("id");
    if (!artifactId) {
      writeJson(response, 400, { ok: false, error: "id is required" });
      return;
    }

    const content = await readArtifactText(artifactId);
    if (!content) {
      writeJson(response, 404, { ok: false, error: "artifact not found" });
      return;
    }
    writeJson(response, 200, { ok: true, ...content });
    return;
  }

  if (method === "POST" && url.pathname === "/api/artifact/open") {
    const payload = await readJsonBody<ArtifactOpenRequest>(request);
    const artifactId = payload.artifactId?.trim();
    if (!artifactId) {
      writeJson(response, 400, { ok: false, error: "artifactId is required" });
      return;
    }

    const artifact = await openArtifact(artifactId);
    if (!artifact) {
      writeJson(response, 404, { ok: false, error: "artifact not found" });
      return;
    }
    writeJson(response, 200, { ok: true, artifact });
    return;
  }

  if (method === "POST" && url.pathname === "/api/run/open-trace") {
    const payload = await readJsonBody<RunOpenTraceRequest>(request);
    const runId = payload.runId?.trim();
    if (!runId) {
      writeJson(response, 400, { ok: false, error: "runId is required" });
      return;
    }

    const run = await openRunTrace(runId);
    if (!run) {
      writeJson(response, 404, { ok: false, error: "run not found" });
      return;
    }
    writeJson(response, 200, { ok: true, run });
    return;
  }

  if (method === "POST" && url.pathname === "/api/meta/create-agent") {
    const payload = await readJsonBody<MetaCreateRequest>(request);
    const prompt = payload.prompt?.trim();
    if (!prompt) {
      writeJson(response, 400, { ok: false, error: "prompt is required" });
      return;
    }

    const result = await createAgentWithMeta({
      prompt,
      agentId: payload.agentId,
      name: payload.name,
      description: payload.description,
      persist: Boolean(payload.persist),
    });
    const workbench = await buildWorkbenchData();
    writeJson(response, result.validation.ok ? 200 : 422, { ok: result.validation.ok, result, workbench });
    return;
  }

  if (method === "POST" && url.pathname === "/api/meta/install-agent") {
    const payload = await readJsonBody<MetaInstallRequest>(request);
    const runId = payload.runId?.trim();
    if (!runId) {
      writeJson(response, 400, { ok: false, error: "runId is required" });
      return;
    }

    try {
      const result = await installAgentDraft({
        runId,
        force: Boolean(payload.force),
      });
      writeJson(response, result.installed ? 200 : 422, {
        ok: result.installed,
        result,
        workbench: await buildWorkbenchData(),
      });
    } catch (error) {
      if (error instanceof InstallConflictError) {
        writeJson(response, 409, {
          ok: false,
          code: "agent_exists",
          error: error.message,
          agentId: error.agentId,
          sourcePath: error.sourcePath,
          targetPath: error.targetPath,
          suggestion: "create_new_version_or_diff_merge",
        });
        return;
      }
      throw error;
    }
    return;
  }

  if (method === "POST" && url.pathname === "/api/agent/run") {
    const payload = await readJsonBody<AgentRunRequest>(request);
    const agentId = payload.agentId?.trim();
    const prompt = payload.prompt?.trim();
    if (!agentId) {
      writeJson(response, 400, { ok: false, error: "agentId is required" });
      return;
    }
    if (!prompt) {
      writeJson(response, 400, { ok: false, error: "prompt is required" });
      return;
    }

    const agent = await findAgent(agentId);
    if (!agent) {
      writeJson(response, 404, { ok: false, error: `Agent not found: ${agentId}` });
      return;
    }

    const summary = await runImageAgent(agent, {
      prompt,
      count: normalizeCount(payload.count),
      size: normalizeSize(payload.size),
      style: payload.style?.trim() || "realistic",
      rawPrompt: Boolean(payload.rawPrompt),
      dryRun: payload.dryRun ?? true,
    });
    writeJson(response, 200, {
      ok: true,
      result: parseRunSummary(summary),
      summary,
      workbench: await buildWorkbenchData(),
    });
    return;
  }

  if (method !== "GET" && method !== "HEAD") {
    writeJson(response, 405, { ok: false, error: "method not allowed" });
    return;
  }

  await serveStaticFile(response, rootDir, url.pathname, method === "HEAD");
}

async function listenWithFallback(
  server: ReturnType<typeof createServer>,
  host: string,
  requestedPort: number,
  allowFallback: boolean,
) {
  const maxAttempts = allowFallback ? 20 : 1;
  let lastError: unknown = null;

  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const port = requestedPort + offset;
    try {
      await listenOnce(server, host, port);
      return getListeningPort(server, port);
    } catch (error) {
      lastError = error;
      if (!isAddressInUse(error)) {
        throw error;
      }
    }
  }

  throw lastError;
}

function getListeningPort(server: ReturnType<typeof createServer>, fallbackPort: number) {
  const address = server.address();
  return typeof address === "object" && address ? (address as AddressInfo).port : fallbackPort;
}

async function listenOnce(server: ReturnType<typeof createServer>, host: string, port: number) {
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, host);
  });
}

function isAddressInUse(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "EADDRINUSE");
}

async function serveStaticFile(response: ServerResponse, rootDir: string, pathname: string, headOnly: boolean) {
  const normalizedPath = pathname === "/" ? "/ui/workbench-prototype/" : decodeURIComponent(pathname);
  const relativePath = normalizedPath.replace(/^\/+/, "");
  let filePath = path.resolve(rootDir, relativePath);

  if (!filePath.startsWith(`${rootDir}${path.sep}`) && filePath !== rootDir) {
    writeJson(response, 403, { ok: false, error: "forbidden" });
    return;
  }

  const fileInfo = await safeStat(filePath);
  if (fileInfo?.isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  const finalInfo = await safeStat(filePath);
  if (!finalInfo?.isFile()) {
    writeJson(response, 404, { ok: false, error: "not found" });
    return;
  }

  response.writeHead(200, {
    "Content-Type": getContentType(filePath),
    "Cache-Control": "no-store",
  });
  if (!headOnly) {
    response.end(await readFile(filePath));
  } else {
    response.end();
  }
}

async function readJsonBody<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 128 * 1024) {
      throw new Error("request body too large");
    }
    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    return {} as T;
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as T;
}

async function safeStat(filePath: string) {
  try {
    return await stat(filePath);
  } catch {
    return null;
  }
}

function writeJson(response: ServerResponse, statusCode: number, body: unknown) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(`${JSON.stringify(body, null, 2)}\n`);
}

function getContentType(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  const types: Record<string, string> = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".md": "text/markdown; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".ts": "text/plain; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".yaml": "text/yaml; charset=utf-8",
    ".yml": "text/yaml; charset=utf-8",
  };
  return types[extension] ?? "application/octet-stream";
}

function normalizeCount(value: unknown) {
  const count = typeof value === "number" ? value : Number(value);
  return Number.isFinite(count) && count > 0 ? Math.min(Math.floor(count), 12) : 1;
}

function readDraftState(value: string | null): AgentDraftState | undefined {
  if (
    value === "drafted" ||
    value === "validation_failed" ||
    value === "installed" ||
    value === "install_conflict"
  ) {
    return value;
  }
  return undefined;
}

function normalizeSize(value: unknown): "1024x1024" | "1792x1024" | "1024x1792" {
  return value === "1792x1024" || value === "1024x1792" ? value : "1024x1024";
}

function parseRunSummary(summary: string) {
  const result: Record<string, string> = {};
  for (const line of summary.split("\n")) {
    const separator = line.indexOf(":");
    if (separator <= 0) {
      continue;
    }
    result[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return result;
}
