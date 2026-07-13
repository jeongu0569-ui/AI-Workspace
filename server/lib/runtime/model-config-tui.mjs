import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { migrateWorkspaceStateSync, stateRoot } from "./state-dir.mjs";

const REQUIRED_IMPORTS = "import yaml, httpx, requests, rich, prompt_toolkit";

export function modelConfigHome(workspaceRoot) {
  migrateWorkspaceStateSync(workspaceRoot);
  return path.join(stateRoot(workspaceRoot), "config");
}

export function vendoredModelEntry(repoRoot) {
  return path.join(repoRoot, "vendor", "hermes-agent", "aiw_model.py");
}

export function resolveModelRuntimePython(repoRoot, env = process.env) {
  const candidates = [
    env.CODMES_RUNTIME_PYTHON,
    path.join(repoRoot, ".codmes-runtime", "bin", "python"),
    path.join(repoRoot, ".codmes-runtime", "Scripts", "python.exe"),
    path.join(repoRoot, ".venv", "bin", "python"),
    path.join(repoRoot, ".venv", "Scripts", "python.exe"),
    path.join(repoRoot, "vendor", "hermes-agent", ".venv", "bin", "python"),
    path.join(os.homedir(), ".hermes", "hermes-agent", "venv", "bin", "python"),
    "python3",
    "python"
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate.includes(path.sep) && !fs.existsSync(candidate)) continue;
    const probe = spawnSync(candidate, ["-c", REQUIRED_IMPORTS], {
      env: { ...env, PYTHONNOUSERSITE: "1" },
      stdio: "ignore"
    });
    if (!probe.error && probe.status === 0) return candidate;
  }

  throw new Error(
    "Codmes model setup runtime is unavailable. Set CODMES_RUNTIME_PYTHON " +
    "to a compatible Python environment or run `npm run runtime:bootstrap`."
  );
}

export function createModelTuiLaunch({ repoRoot, workspaceRoot, args = [], env = process.env }) {
  const python = resolveModelRuntimePython(repoRoot, env);
  const vendorRoot = path.join(repoRoot, "vendor", "hermes-agent");
  const existingPythonPath = env.PYTHONPATH ? String(env.PYTHONPATH) : "";
  return {
    command: python,
    args: [vendoredModelEntry(repoRoot), ...args],
    cwd: repoRoot,
    env: {
      ...env,
      HERMES_HOME: modelConfigHome(workspaceRoot),
      PYTHONPATH: [vendorRoot, existingPythonPath].filter(Boolean).join(path.delimiter),
      PYTHONNOUSERSITE: "1",
      CODMES_VENDOR_RUNTIME: "1"
    }
  };
}
