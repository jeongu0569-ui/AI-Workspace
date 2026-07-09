import fs from "node:fs/promises";
import path from "node:path";

export const BUILTIN_PROVIDERS = [
  { id: "nous", name: "Nous Research", authType: "oauth_device_code", tab: "accounts", env: ["AIW_NOUS_API_KEY", "NOUS_API_KEY"], models: ["anthropic/claude-fable-5", "anthropic/claude-opus-4.8", "openai/gpt-5.5", "openai/gpt-5.4-mini"] },
  { id: "openrouter", name: "OpenRouter", authType: "api_key", tab: "keys", env: ["AIW_OPENROUTER_API_KEY", "OPENROUTER_API_KEY"], models: ["anthropic/claude-opus-4.8", "openai/gpt-5.5", "openai/gpt-5.4-mini", "google/gemini-3-pro-preview"] },
  { id: "moa", name: "Mixture of Agents", authType: "virtual", tab: "keys", env: [], models: ["default"] },
  { id: "novita", name: "NovitaAI", authType: "api_key", tab: "keys", env: ["AIW_NOVITA_API_KEY", "NOVITA_API_KEY"], baseUrlEnv: "NOVITA_BASE_URL", models: ["moonshotai/kimi-k2.5", "minimax/minimax-m2.7", "zai-org/glm-5"] },
  { id: "lmstudio", name: "LM Studio", authType: "api_key", tab: "keys", env: ["AIW_LM_API_KEY", "LM_API_KEY"], baseUrlEnv: "LM_BASE_URL", defaultBaseUrl: "http://127.0.0.1:1234/v1", models: ["local-model"] },
  { id: "anthropic", name: "Anthropic", authType: "api_key", tab: "keys", env: ["AIW_ANTHROPIC_API_KEY", "ANTHROPIC_API_KEY", "ANTHROPIC_TOKEN", "CLAUDE_CODE_OAUTH_TOKEN"], baseUrlEnv: "ANTHROPIC_BASE_URL", models: ["claude-fable-5", "claude-opus-4-8", "claude-sonnet-4-6"] },
  { id: "openai-codex", name: "OpenAI Codex", authType: "oauth_external", tab: "accounts", env: [], models: ["gpt-5.5", "gpt-5.4", "gpt-5.4-mini", "gpt-5.3-codex"] },
  { id: "openai-api", name: "OpenAI API", authType: "api_key", tab: "keys", env: ["AIW_OPENAI_API_KEY", "OPENAI_API_KEY"], baseUrlEnv: "OPENAI_BASE_URL", models: ["gpt-5.5", "gpt-5.5-pro", "gpt-5.4", "gpt-5.4-mini", "gpt-5-mini"] },
  { id: "alibaba", name: "Qwen Cloud", authType: "api_key", tab: "keys", env: ["AIW_DASHSCOPE_API_KEY", "DASHSCOPE_API_KEY"], baseUrlEnv: "DASHSCOPE_BASE_URL", models: ["qwen3.7-max", "qwen3.6-plus", "qwen3-coder-plus"] },
  { id: "xai-oauth", name: "xAI Grok OAuth", authType: "oauth_external", tab: "accounts", env: [], models: ["grok-build-0.1", "grok-composer-2.5-fast", "grok-4.3"] },
  { id: "xiaomi", name: "Xiaomi MiMo", authType: "api_key", tab: "keys", env: ["AIW_XIAOMI_API_KEY", "XIAOMI_API_KEY"], baseUrlEnv: "XIAOMI_BASE_URL", models: ["mimo-v2.5-pro", "mimo-v2.5", "mimo-v2-pro"] },
  { id: "tencent-tokenhub", name: "Tencent TokenHub", authType: "api_key", tab: "keys", env: ["AIW_TOKENHUB_API_KEY", "TOKENHUB_API_KEY"], baseUrlEnv: "TOKENHUB_BASE_URL", models: ["hy3-preview"] },
  { id: "nvidia", name: "NVIDIA NIM", authType: "api_key", tab: "keys", env: ["AIW_NVIDIA_API_KEY", "NVIDIA_API_KEY"], baseUrlEnv: "NVIDIA_BASE_URL", models: ["nvidia/llama-3.1-nemotron-70b-instruct", "nvidia/llama-3.3-70b-instruct"] },
  { id: "copilot", name: "GitHub Copilot", authType: "api_key", tab: "keys", env: ["AIW_COPILOT_GITHUB_TOKEN", "COPILOT_GITHUB_TOKEN", "GH_TOKEN", "GITHUB_TOKEN"], baseUrlEnv: "COPILOT_API_BASE_URL", models: ["gpt-5.4", "gpt-5.4-mini", "gpt-5-mini", "gpt-4.1"] },
  { id: "copilot-acp", name: "GitHub Copilot ACP", authType: "external_process", tab: "accounts", env: [], models: ["gpt-5.4", "gpt-5.4-mini", "gpt-5-mini", "gpt-4.1"] },
  { id: "huggingface", name: "Hugging Face", authType: "api_key", tab: "keys", env: ["AIW_HF_TOKEN", "HF_TOKEN"], baseUrlEnv: "HF_BASE_URL", models: ["Qwen/Qwen3.5-72B-Instruct", "deepseek-ai/DeepSeek-V3.2"] },
  { id: "gemini", name: "Google AI Studio", authType: "api_key", tab: "keys", env: ["AIW_GOOGLE_API_KEY", "AIW_GEMINI_API_KEY", "GOOGLE_API_KEY", "GEMINI_API_KEY"], baseUrlEnv: "GEMINI_BASE_URL", models: ["gemini-3.1-flash-lite", "gemini-2.5-pro", "gemini-2.5-flash", "gemini-3.5-flash"] },
  { id: "vertex", name: "Google Vertex AI", authType: "vertex", tab: "keys", env: ["AIW_GOOGLE_APPLICATION_CREDENTIALS", "GOOGLE_APPLICATION_CREDENTIALS"], models: [] },
  { id: "deepseek", name: "DeepSeek", authType: "api_key", tab: "keys", env: ["AIW_DEEPSEEK_API_KEY", "DEEPSEEK_API_KEY"], baseUrlEnv: "DEEPSEEK_BASE_URL", models: ["deepseek-chat", "deepseek-reasoner"] },
  { id: "xai", name: "xAI", authType: "api_key", tab: "keys", env: ["AIW_XAI_API_KEY", "XAI_API_KEY"], baseUrlEnv: "XAI_BASE_URL", models: ["grok-build-0.1", "grok-4.3"] },
  { id: "zai", name: "Z.AI / GLM", authType: "api_key", tab: "keys", env: ["AIW_GLM_API_KEY", "AIW_ZAI_API_KEY", "GLM_API_KEY", "ZAI_API_KEY", "Z_AI_API_KEY"], baseUrlEnv: "GLM_BASE_URL", models: ["glm-5.2", "glm-5", "glm-4-9b"] },
  { id: "kimi-coding", name: "Kimi / Kimi Coding Plan", authType: "api_key", tab: "keys", env: ["AIW_KIMI_API_KEY", "KIMI_API_KEY", "KIMI_CODING_API_KEY"], baseUrlEnv: "KIMI_BASE_URL", models: ["kimi-k2.7-code", "kimi-k2.6", "kimi-k2.5", "kimi-for-coding"] },
  { id: "kimi-coding-cn", name: "Kimi / Moonshot China", authType: "api_key", tab: "keys", env: ["AIW_KIMI_CN_API_KEY", "KIMI_CN_API_KEY"], models: ["kimi-k2.6", "kimi-k2.5", "kimi-k2-thinking"] },
  { id: "stepfun", name: "StepFun Step Plan", authType: "api_key", tab: "keys", env: ["AIW_STEPFUN_API_KEY", "STEPFUN_API_KEY"], baseUrlEnv: "STEPFUN_BASE_URL", models: ["step-3.5-flash", "step-3.5-flash-2603"] },
  { id: "minimax", name: "MiniMax", authType: "api_key", tab: "keys", env: ["AIW_MINIMAX_API_KEY", "MINIMAX_API_KEY"], baseUrlEnv: "MINIMAX_BASE_URL", models: ["MiniMax-M3", "MiniMax-M2.7", "MiniMax-M2.5"] },
  { id: "minimax-oauth", name: "MiniMax OAuth", authType: "oauth_minimax", tab: "accounts", env: [], models: ["MiniMax-M3", "MiniMax-M2.7"] },
  { id: "minimax-cn", name: "MiniMax China", authType: "api_key", tab: "keys", env: ["AIW_MINIMAX_CN_API_KEY", "MINIMAX_CN_API_KEY"], baseUrlEnv: "MINIMAX_CN_BASE_URL", models: ["MiniMax-M3", "MiniMax-M2.7"] },
  { id: "ollama-cloud", name: "Ollama Cloud", authType: "api_key", tab: "keys", env: ["AIW_OLLAMA_API_KEY", "OLLAMA_API_KEY"], baseUrlEnv: "OLLAMA_BASE_URL", models: ["deepseek-v4-flash", "minimax-m2.5", "glm-4.7"] },
  { id: "arcee", name: "Arcee AI", authType: "api_key", tab: "keys", env: ["AIW_ARCEEAI_API_KEY", "ARCEEAI_API_KEY"], baseUrlEnv: "ARCEE_BASE_URL", models: ["trinity-large-thinking", "trinity-large-preview", "trinity-mini"] },
  { id: "gmi", name: "GMI Cloud", authType: "api_key", tab: "keys", env: ["AIW_GMI_API_KEY", "GMI_API_KEY"], baseUrlEnv: "GMI_BASE_URL", models: ["zai-org/GLM-5.1-FP8", "deepseek-ai/DeepSeek-V3.2", "openai/gpt-5.4"] },
  { id: "kilocode", name: "Kilo Code", authType: "api_key", tab: "keys", env: ["AIW_KILOCODE_API_KEY", "KILOCODE_API_KEY"], baseUrlEnv: "KILOCODE_BASE_URL", models: ["inclusionai/ling-2.6-1t", "inclusionai/ring-2.6-1t", "meta-llama/llama-3.1-70b-instruct"] },
  { id: "opencode-zen", name: "OpenCode Zen", authType: "api_key", tab: "keys", env: ["AIW_OPENCODE_ZEN_API_KEY", "OPENCODE_ZEN_API_KEY"], baseUrlEnv: "OPENCODE_ZEN_BASE_URL", models: ["ring-2.6-1t-free", "mimo-v2-pro-free", "deepseek-v4-flash"] },
  { id: "opencode-go", name: "OpenCode Go", authType: "api_key", tab: "keys", env: ["AIW_OPENCODE_GO_API_KEY", "OPENCODE_GO_API_KEY"], baseUrlEnv: "OPENCODE_GO_BASE_URL", models: ["deepseek-v4-flash", "minimax-m2.5", "qwen3.7-plus"] },
  { id: "bedrock", name: "AWS Bedrock", authType: "aws_sdk", tab: "keys", env: ["AWS_PROFILE", "AWS_REGION"], models: ["us.anthropic.claude-sonnet-4-6", "us.amazon.nova-pro-v1:0"] },
  { id: "azure-foundry", name: "Azure Foundry", authType: "api_key", tab: "keys", env: ["AIW_AZURE_FOUNDRY_API_KEY", "AZURE_FOUNDRY_API_KEY"], baseUrlEnv: "AZURE_FOUNDRY_BASE_URL", models: [] },
  { id: "qwen-oauth", name: "Qwen OAuth Portal", authType: "oauth_external", tab: "accounts", env: ["AIW_QWEN_API_KEY", "QWEN_API_KEY"], models: [] },
  { id: "alibaba-coding-plan", name: "Alibaba Cloud Coding Plan", authType: "api_key", tab: "keys", env: ["AIW_ALIBABA_CODING_PLAN_API_KEY", "ALIBABA_CODING_PLAN_API_KEY", "DASHSCOPE_API_KEY"], baseUrlEnv: "ALIBABA_CODING_PLAN_BASE_URL", models: ["qwen3.7-max", "qwen3.6-plus", "qwen3-coder-plus"] },
  { id: "custom", name: "Custom OpenAI-compatible", authType: "api_key", tab: "keys", env: ["AIW_CUSTOM_API_KEY"], baseUrlEnv: "AIW_CUSTOM_BASE_URL", models: ["custom-model"] },
  { id: "google-antigravity", name: "Google Antigravity OAuth", authType: "oauth_external", tab: "accounts", env: ["AIW_GOOGLE_ANTIGRAVITY_TOKEN"], models: ["google-antigravity"] }
];

const DEFAULT_RUNTIME_CONFIG = {
  schemaVersion: 1,
  defaultModel: null,
  models: [],
  providers: {}
};

const DEFAULT_CREDENTIALS = {
  schemaVersion: 1,
  providers: {}
};

export function runtimeConfigDir(workspaceRoot) {
  return path.join(workspaceRoot, ".ai-workspace", "config");
}

export async function ensureRuntimeConfig(workspaceRoot) {
  const dir = runtimeConfigDir(workspaceRoot);
  await fs.mkdir(dir, { recursive: true });
  await writeJsonIfMissing(path.join(dir, "runtime.json"), DEFAULT_RUNTIME_CONFIG);
  await writeJsonIfMissing(path.join(dir, "credentials.json"), DEFAULT_CREDENTIALS);
}

export function listProviderRegistry() {
  return BUILTIN_PROVIDERS.map((provider) => ({ ...provider }));
}

export async function readRuntimeConfig(workspaceRoot) {
  await ensureRuntimeConfig(workspaceRoot);
  return {
    ...DEFAULT_RUNTIME_CONFIG,
    ...await readJson(path.join(runtimeConfigDir(workspaceRoot), "runtime.json"), DEFAULT_RUNTIME_CONFIG)
  };
}

export async function writeRuntimeConfig(workspaceRoot, value) {
  await ensureRuntimeConfig(workspaceRoot);
  await fs.writeFile(
    path.join(runtimeConfigDir(workspaceRoot), "runtime.json"),
    JSON.stringify({ ...DEFAULT_RUNTIME_CONFIG, ...value }, null, 2) + "\n",
    "utf8"
  );
}

export async function listRuntimeModels(workspaceRoot) {
  const config = await readRuntimeConfig(workspaceRoot);
  const configured = Array.isArray(config.models) ? config.models : [];
  const rows = [];
  const seen = new Set();
  for (const model of configured) {
    const id = model.id || `${model.provider}:${model.model}`;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    rows.push(normalizeModel(model, config.defaultModel, "config"));
  }
  for (const provider of BUILTIN_PROVIDERS) {
    for (const modelName of provider.models || []) {
      const id = `${provider.id}:${modelName}`;
      if (seen.has(id)) continue;
      seen.add(id);
      rows.push(normalizeModel({
        id,
        provider: provider.id,
        model: modelName,
        name: modelName
      }, config.defaultModel, "registry"));
    }
  }
  return rows;
}

export async function setDefaultModel(workspaceRoot, provider, model) {
  const config = await readRuntimeConfig(workspaceRoot);
  const next = {
    provider,
    model,
    id: `${provider}:${model}`,
    updatedAt: new Date().toISOString()
  };
  await writeRuntimeConfig(workspaceRoot, {
    ...config,
    defaultModel: next
  });
  return next;
}

export async function readCredentials(workspaceRoot) {
  await ensureRuntimeConfig(workspaceRoot);
  return {
    ...DEFAULT_CREDENTIALS,
    ...await readJson(path.join(runtimeConfigDir(workspaceRoot), "credentials.json"), DEFAULT_CREDENTIALS)
  };
}

export async function writeCredentials(workspaceRoot, value) {
  await ensureRuntimeConfig(workspaceRoot);
  await fs.writeFile(
    path.join(runtimeConfigDir(workspaceRoot), "credentials.json"),
    JSON.stringify({ ...DEFAULT_CREDENTIALS, ...value }, null, 2) + "\n",
    "utf8"
  );
}

export async function listCredentialStatus(workspaceRoot, env = process.env) {
  const credentials = await readCredentials(workspaceRoot);
  return BUILTIN_PROVIDERS.map((provider) => {
    const stored = credentials.providers?.[provider.id] || {};
    const storedKeys = Object.keys(stored.values || {});
    const envKeys = (provider.env || []).filter((key) => Boolean(env[key]));
    return {
      provider: provider.id,
      name: provider.name,
      authType: provider.authType,
      configured: storedKeys.length > 0 || envKeys.length > 0 || provider.authType === "none",
      storedKeys,
      envKeys
    };
  });
}

export async function setCredentialValue(workspaceRoot, providerId, key, value) {
  const provider = BUILTIN_PROVIDERS.find((item) => item.id === providerId);
  if (!provider) throw Object.assign(new Error(`Unknown provider: ${providerId}`), { status: 400 });
  const credentials = await readCredentials(workspaceRoot);
  const providerCredentials = credentials.providers?.[providerId] || {};
  const next = {
    ...credentials,
    providers: {
      ...(credentials.providers || {}),
      [providerId]: {
        ...providerCredentials,
        updatedAt: new Date().toISOString(),
        values: {
          ...(providerCredentials.values || {}),
          [key]: value
        }
      }
    }
  };
  await writeCredentials(workspaceRoot, next);
  return {
    provider: providerId,
    key,
    stored: true
  };
}

export async function removeCredentialValue(workspaceRoot, providerId, key = "") {
  const credentials = await readCredentials(workspaceRoot);
  const providerCredentials = credentials.providers?.[providerId];
  if (!providerCredentials) return { provider: providerId, removed: false };
  if (key) {
    delete providerCredentials.values?.[key];
  } else {
    delete credentials.providers[providerId];
  }
  await writeCredentials(workspaceRoot, credentials);
  return { provider: providerId, key, removed: true };
}

function normalizeModel(model, defaultModel, source) {
  const provider = model.provider || "";
  const modelName = model.model || model.name || model.id || "";
  const id = model.id || `${provider}:${modelName}`;
  const active = defaultModel && (
    defaultModel.id === id ||
    (defaultModel.provider === provider && defaultModel.model === modelName)
  );
  return {
    id,
    name: model.name || modelName || id,
    model: modelName,
    provider,
    source,
    isActive: Boolean(active)
  };
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJsonIfMissing(filePath, value) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
  }
}
