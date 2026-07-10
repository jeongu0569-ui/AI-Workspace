import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

export const CODMES_STATE_DIR = ".codmes";
export const LEGACY_STATE_DIR = ".ai-workspace";

export function stateRoot(workspaceRoot) {
  return path.join(workspaceRoot, CODMES_STATE_DIR);
}

export function legacyStateRoot(workspaceRoot) {
  return path.join(workspaceRoot, LEGACY_STATE_DIR);
}

export async function migrateWorkspaceState(workspaceRoot) {
  const next = stateRoot(workspaceRoot);
  const legacy = legacyStateRoot(workspaceRoot);
  const hasNext = await exists(next);
  const hasLegacy = await exists(legacy);

  if (hasNext && hasLegacy) {
    return { migrated: false, conflict: true, stateRoot: next, legacyRoot: legacy };
  }
  if (hasNext) {
    return { migrated: false, conflict: false, stateRoot: next, legacyRoot: legacy };
  }
  if (hasLegacy) {
    await fsp.rename(legacy, next);
    return { migrated: true, conflict: false, stateRoot: next, legacyRoot: legacy };
  }
  await fsp.mkdir(next, { recursive: true });
  return { migrated: false, conflict: false, stateRoot: next, legacyRoot: legacy, created: true };
}

export function migrateWorkspaceStateSync(workspaceRoot) {
  const next = stateRoot(workspaceRoot);
  const legacy = legacyStateRoot(workspaceRoot);
  const hasNext = fs.existsSync(next);
  const hasLegacy = fs.existsSync(legacy);

  if (hasNext && hasLegacy) {
    return { migrated: false, conflict: true, stateRoot: next, legacyRoot: legacy };
  }
  if (hasNext) {
    return { migrated: false, conflict: false, stateRoot: next, legacyRoot: legacy };
  }
  if (hasLegacy) {
    fs.renameSync(legacy, next);
    return { migrated: true, conflict: false, stateRoot: next, legacyRoot: legacy };
  }
  fs.mkdirSync(next, { recursive: true });
  return { migrated: false, conflict: false, stateRoot: next, legacyRoot: legacy, created: true };
}

async function exists(filePath) {
  try {
    await fsp.access(filePath);
    return true;
  } catch {
    return false;
  }
}
