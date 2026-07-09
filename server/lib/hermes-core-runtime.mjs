import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { HermesLiveClient } from "./hermes-compat.mjs";

export function createHermesCoreRuntime(config = {}, options = {}) {
  if (!options.liveClient && !config?.hermesServerUrl) return null;
  return new HermesCoreRuntime(config, options);
}

export class HermesCoreRuntime extends EventEmitter {
  constructor(config = {}, options = {}) {
    super();
    this.name = "hermes-core";
    this.config = config || {};
    this.liveClient = options.liveClient || (this.config.hermesServerUrl ? new HermesLiveClient(this.config) : null);
    this.#relayLiveEvents();
  }

  isConfigured() {
    return Boolean(this.liveClient);
  }

  async connect() {
    return await this.#live().connect();
  }

  async createSession(params = {}) {
    return await this.#live().createSession(params);
  }

  async resumeSession(sessionId) {
    return await this.#live().resumeSession(sessionId);
  }

  async submitPrompt(params = {}) {
    return await this.#live().submitPrompt(params);
  }

  async respondToApproval(params = {}) {
    return await this.#live().respondToApproval(params);
  }

  async setAccessMode(sessionId, accessMode) {
    return await this.#live().setAccessMode(sessionId, accessMode);
  }

  async setReasoning(sessionId, reasoningEffort) {
    return await this.#live().setReasoning(sessionId, reasoningEffort);
  }

  async fetchHermesJson(endpoint, options = {}) {
    return await this.#live().fetchHermesJson(endpoint, options);
  }

  async providerCatalog(options = {}) {
    return await readHermesProviderCatalog(options);
  }

  close() {
    this.liveClient?.close?.();
  }

  #live() {
    if (!this.liveClient) {
      throw Object.assign(
        new Error("Hermes core runtime is unavailable because Hermes is not configured."),
        { status: 503 }
      );
    }
    return this.liveClient;
  }

  #relayLiveEvents() {
    if (!this.liveClient?.on) return;
    this.liveClient.on("event", (event) => this.emit("event", event));
    this.liveClient.on("close", () => this.emit("close"));
    this.liveClient.on("error", (error) => this.emit("error", error));
  }
}

export async function readHermesProviderCatalog(options = {}) {
  const python = await findHermesPython(options);
  if (python) {
    const code = `
import json
from hermes_cli.provider_catalog import provider_catalog
rows = []
for item in provider_catalog():
    rows.append({
        "slug": getattr(item, "slug", "") or getattr(item, "name", ""),
        "label": getattr(item, "label", "") or getattr(item, "display_name", ""),
        "authType": getattr(item, "auth_type", ""),
        "transport": getattr(item, "transport", ""),
    })
print(json.dumps(rows, ensure_ascii=False))
`;
    try {
      const output = await runProcessCapture(python, ["-c", code], {
        cwd: options.cwd || process.cwd(),
        env: options.env || process.env
      });
      const parsed = JSON.parse(output || "[]");
      if (Array.isArray(parsed)) return parsed.filter((item) => item.slug);
    } catch {
      // Fall through to the provider plugin metadata scan.
    }
  }

  const root = await findHermesAgentRoot(options);
  if (!root) return [];
  const providersDir = path.join(root, "plugins", "model-providers");
  let entries = [];
  try {
    entries = await fs.readdir(providersDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const rows = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const yamlPath = path.join(providersDir, entry.name, "plugin.yaml");
    let yaml = "";
    try {
      yaml = await fs.readFile(yamlPath, "utf8");
    } catch {
      // Missing plugin metadata is not fatal for orientation output.
    }
    rows.push({
      slug: entry.name,
      label: yaml.match(/^description:\s*(.+)$/m)?.[1]?.trim() || entry.name,
      authType: "",
      transport: ""
    });
  }
  return rows.sort((a, b) => a.slug.localeCompare(b.slug));
}

export async function findHermesPython(options = {}) {
  if (options.hermesPython !== undefined) {
    return options.hermesPython ? expandHome(String(options.hermesPython)) : "";
  }
  const env = options.env || process.env;
  if (env.HERMES_PYTHON) return expandHome(env.HERMES_PYTHON);
  const root = await findHermesAgentRoot(options);
  if (!root) return "";
  const candidate = path.join(root, "venv", "bin", "python");
  try {
    await fs.access(candidate);
    return candidate;
  } catch {
    return "";
  }
}

export async function findHermesAgentRoot(options = {}) {
  if (options.hermesAgentRoot !== undefined) {
    return options.hermesAgentRoot ? expandHome(String(options.hermesAgentRoot)) : "";
  }
  const env = options.env || process.env;
  if (env.HERMES_AGENT_ROOT) return expandHome(env.HERMES_AGENT_ROOT);
  const defaultRoot = path.join(os.homedir(), ".hermes", "hermes-agent");
  try {
    await fs.access(path.join(defaultRoot, "hermes_cli"));
    return defaultRoot;
  } catch {
    return "";
  }
}

async function runProcessCapture(command, args, options) {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${command} exited with signal ${signal}`));
        return;
      }
      if (code) {
        reject(new Error(stderr.trim() || `${command} exited with code ${code}`));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

function expandHome(value) {
  if (value === "~") return os.homedir();
  if (value.startsWith("~/")) return path.join(os.homedir(), value.slice(2));
  return value;
}
