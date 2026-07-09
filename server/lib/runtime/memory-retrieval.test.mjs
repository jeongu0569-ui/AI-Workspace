process.env.NODE_ENV = "test";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { searchMemory } from "./memory-retrieval.mjs";

test("Memory Retrieval: search across memory pools", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "aiw-memory-retrieval-"));
  await fs.mkdir(path.join(root, ".ai-workspace", "memory", "user"), { recursive: true });
  await fs.mkdir(path.join(root, ".ai-workspace", "memory", "folders"), { recursive: true });
  await fs.mkdir(path.join(root, ".ai-workspace", "sessions"), { recursive: true });
  
  // 1. User memory
  await fs.writeFile(
    path.join(root, ".ai-workspace", "memory", "user", "memories.jsonl"),
    JSON.stringify({ content: "User has a MacBook Pro 16 inch.", pinned: true, createdAt: new Date().toISOString() }) + "\n",
    "utf8"
  );
  
  // 2. Folder memory
  await fs.writeFile(
    path.join(root, ".ai-workspace", "memory", "folders", "folder-computer.json"),
    JSON.stringify([{ content: "Computer folder: local LLM setup.", pinned: false, createdAt: new Date().toISOString() }]),
    "utf8"
  );
  
  // Search without folder ID
  const search1 = await searchMemory(root, "macbook");
  assert.equal(search1.length, 1);
  assert.equal(search1[0].type, "user_memory");
  
  // Search with folder ID (computer)
  const search2 = await searchMemory(root, "local LLM", {
    currentFolderId: "computer"
  });
  
  assert.equal(search2.length, 1);
  assert.equal(search2[0].type, "folder_memory");
  assert.equal(search2[0].folderId, "computer");
});
