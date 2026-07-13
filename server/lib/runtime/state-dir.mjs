import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

export const CODMES_STATE_DIR = ".codmes";

export function stateRoot(workspaceRoot) {
  return path.join(workspaceRoot, CODMES_STATE_DIR);
}

export async function migrateWorkspaceState(workspaceRoot) {
  const next = stateRoot(workspaceRoot);
  const hasNext = await exists(next);
  if (hasNext) {
    return { created: false, stateRoot: next };
  }
  await fsp.mkdir(next, { recursive: true });
  return { created: true, stateRoot: next };
}

export function migrateWorkspaceStateSync(workspaceRoot) {
  const next = stateRoot(workspaceRoot);
  const hasNext = fs.existsSync(next);
  if (hasNext) {
    return { created: false, stateRoot: next };
  }
  fs.mkdirSync(next, { recursive: true });
  return { created: true, stateRoot: next };
}

async function exists(filePath) {
  try {
    await fsp.access(filePath);
    return true;
  } catch {
    return false;
  }
}
