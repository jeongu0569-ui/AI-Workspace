import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { migrateWorkspaceState, stateRoot, legacyStateRoot } from "./state-dir.mjs";

test("state dir creates new .codmes for new workspaces", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "codmes-state-new-"));
  const result = await migrateWorkspaceState(root);
  assert.equal(result.created, true);
  assert.equal(result.conflict, false);
  await assert.doesNotReject(fs.stat(stateRoot(root)));
});

test("state dir migrates legacy .ai-workspace without deleting data", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "codmes-state-legacy-"));
  await fs.mkdir(path.join(legacyStateRoot(root), "config"), { recursive: true });
  await fs.writeFile(path.join(legacyStateRoot(root), "config", "auth.json"), "{\"secret\":\"kept\"}\n", "utf8");

  const result = await migrateWorkspaceState(root);
  assert.equal(result.migrated, true);
  assert.equal(result.conflict, false);
  const migrated = await fs.readFile(path.join(stateRoot(root), "config", "auth.json"), "utf8");
  assert.equal(migrated, "{\"secret\":\"kept\"}\n");
  await assert.rejects(fs.stat(legacyStateRoot(root)));
});

test("state dir does not overwrite when .codmes and .ai-workspace both exist", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "codmes-state-conflict-"));
  await fs.mkdir(stateRoot(root), { recursive: true });
  await fs.mkdir(legacyStateRoot(root), { recursive: true });
  await fs.writeFile(path.join(stateRoot(root), "marker"), "new", "utf8");
  await fs.writeFile(path.join(legacyStateRoot(root), "marker"), "legacy", "utf8");

  const result = await migrateWorkspaceState(root);
  assert.equal(result.migrated, false);
  assert.equal(result.conflict, true);
  assert.equal(await fs.readFile(path.join(stateRoot(root), "marker"), "utf8"), "new");
  assert.equal(await fs.readFile(path.join(legacyStateRoot(root), "marker"), "utf8"), "legacy");
});
