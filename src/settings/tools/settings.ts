import { listPluginCapabilities, toWorkbenchCapability } from "../../plugins/registry.js";
import type { WorkbenchCapability } from "../types.js";

export function getWorkbenchTools(): WorkbenchCapability[] {
  return listPluginCapabilities({ kind: "tool" }).map(toWorkbenchCapability);
}
