import { listPluginCapabilities, toWorkbenchCapability } from "../../plugins/registry.js";
import type { WorkbenchCapability } from "../types.js";

export function getWorkbenchSkills(): WorkbenchCapability[] {
  return listPluginCapabilities({ kind: "skill" }).map(toWorkbenchCapability);
}
