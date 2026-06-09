import { listPluginCapabilities, toWorkbenchCapability } from "../../plugins/registry.js";
import type { WorkbenchCapability } from "../types.js";

export function getWorkbenchMcpServers(): WorkbenchCapability[] {
  return listPluginCapabilities({ kind: "mcp" }).map(toWorkbenchCapability);
}
