import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { HermesCoreRuntime, readHermesProviderCatalog } from "./hermes-core-runtime.mjs";

test("HermesCoreRuntime delegates live session calls and relays events", async () => {
  const liveClient = new FakeLiveClient();
  const runtime = new HermesCoreRuntime({ hermesServerUrl: "http://127.0.0.1:9119" }, { liveClient });
  const events = [];
  runtime.on("event", (event) => events.push(event));

  await runtime.connect();
  const session = await runtime.createSession({ model: "demo-model" });
  await runtime.submitPrompt({ sessionId: session.sessionId, message: "hello" });
  liveClient.emit("event", { type: "message.delta", text: "hi" });

  assert.deepEqual(liveClient.calls.map((call) => call.method), ["connect", "createSession", "submitPrompt"]);
  assert.equal(session.sessionId, "stored-1");
  assert.deepEqual(events, [{ type: "message.delta", text: "hi" }]);
});

test("readHermesProviderCatalog falls back to Hermes plugin metadata", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "hermes-provider-catalog-"));
  const providerDir = path.join(root, "plugins", "model-providers", "google-antigravity");
  await fs.mkdir(providerDir, { recursive: true });
  await fs.writeFile(path.join(root, "hermes_cli"), "", "utf8");
  await fs.writeFile(path.join(providerDir, "plugin.yaml"), [
    "name: google-antigravity-provider",
    "kind: model-provider",
    "description: Google Antigravity (OAuth)",
    ""
  ].join("\n"), "utf8");

  const providers = await readHermesProviderCatalog({
    hermesAgentRoot: root,
    hermesPython: ""
  });

  assert.deepEqual(providers, [{
    slug: "google-antigravity",
    label: "Google Antigravity (OAuth)",
    authType: "",
    transport: ""
  }]);
});

class FakeLiveClient extends EventEmitter {
  constructor() {
    super();
    this.calls = [];
  }

  async connect() {
    this.calls.push({ method: "connect" });
  }

  async createSession(params) {
    this.calls.push({ method: "createSession", params });
    return { sessionId: "stored-1", runtimeSessionId: "runtime-1" };
  }

  async resumeSession(sessionId) {
    this.calls.push({ method: "resumeSession", sessionId });
    return "runtime-1";
  }

  async submitPrompt(params) {
    this.calls.push({ method: "submitPrompt", params });
    return { ok: true };
  }

  async respondToApproval(params) {
    this.calls.push({ method: "respondToApproval", params });
    return { ok: true };
  }

  async setAccessMode(sessionId, accessMode) {
    this.calls.push({ method: "setAccessMode", sessionId, accessMode });
  }

  async setReasoning(sessionId, reasoningEffort) {
    this.calls.push({ method: "setReasoning", sessionId, reasoningEffort });
  }

  async fetchHermesJson(endpoint, options) {
    this.calls.push({ method: "fetchHermesJson", endpoint, options });
    return {};
  }

  close() {
    this.calls.push({ method: "close" });
  }
}
