import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export interface LocalEnvOptions {
  override?: boolean;
}

export function loadLocalEnv(filePath = ".env", options: LocalEnvOptions = {}) {
  const resolved = path.resolve(filePath);
  if (!existsSync(resolved)) {
    return;
  }

  const content = readFileSync(resolved, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const eq = line.indexOf("=");
    if (eq <= 0) {
      continue;
    }

    const key = line.slice(0, eq).trim();
    const value = stripQuotes(line.slice(eq + 1).trim());
    if (options.override || !process.env[key]) {
      process.env[key] = value;
    }
  }
}

function stripQuotes(value: string) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
