import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { migrateWorkspaceState, stateRoot } from "./state-dir.mjs";

test("state dir creates new .codmes for new workspaces", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "codmes-state-new-"));
  const result = await migrateWorkspaceState(root);
  assert.equal(result.created, true);
  await assert.doesNotReject(fs.stat(stateRoot(root)));
});

test("state dir leaves existing .codmes in place", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "codmes-state-existing-"));
  await fs.mkdir(path.join(stateRoot(root), "config"), { recursive: true });
  await fs.writeFile(path.join(stateRoot(root), "config", "auth.json"), "{\"secret\":\"kept\"}\n", "utf8");
  const result = await migrateWorkspaceState(root);
  assert.equal(result.created, false);
  assert.equal(await fs.readFile(path.join(stateRoot(root), "config", "auth.json"), "utf8"), "{\"secret\":\"kept\"}\n");
});
