process.env.NODE_ENV = "test";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  loadToolModes,
  saveToolModeOverride,
  getEffectiveToolMode
} from "./tool-mode-registry.mjs";

test("Tool Mode Registry: basic loading and defaults", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "aiw-tool-modes-"));
  
  const modes = await loadToolModes(root);
  assert.equal(modes.chat.mode, "default");
  assert.ok(modes.chat.enabledTools.includes("tool_discovery"));
  assert.ok(modes.chat.enabledTools.includes("conversation_search"));
  
  assert.equal(modes.notes.mode, "default");
  assert.ok(modes.notes.enabledTools.includes("workspace_search"));
  
  assert.equal(modes.code.mode, "default");
  assert.ok(modes.code.enabledTools.includes("propose_patch"));
});

test("Tool Mode Registry: saving override and custom mode", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "aiw-tool-modes-override-"));
  
  await saveToolModeOverride(root, "chat", {
    mode: "custom",
    enabledTools: ["web_search"],
    disabledTools: ["memory_search"]
  });
  
  const modes = await loadToolModes(root);
  assert.equal(modes.chat.mode, "custom");
  assert.ok(modes.chat.enabledTools.includes("web_search"));
  // memory_search is excluded because it was in disabledTools
  assert.ok(!modes.chat.enabledTools.includes("memory_search"));
  // tool_discovery is mandatory and must be preserved
  assert.ok(modes.chat.enabledTools.includes("tool_discovery"));
  assert.ok(modes.chat.enabledTools.includes("conversation_search"));
});

test("Tool Mode Registry: safe mode overrides", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "aiw-tool-modes-safe-"));
  
  await saveToolModeOverride(root, "code", {
    mode: "safe"
  });
  
  const modes = await loadToolModes(root);
  assert.equal(modes.code.mode, "safe");
  assert.ok(modes.code.requiresApproval.includes("apply_patch"));
  assert.ok(modes.code.requiresApproval.includes("run_checks"));
});
