process.env.NODE_ENV = "test";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  listFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  getFolderMemory,
  updateFolderMemory,
  moveSessionToFolder
} from "./conversation-folders.mjs";

test("Conversation Folders: CRUD and memory settings", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "aiw-conv-folders-"));
  await fs.mkdir(path.join(root, ".ai-workspace", "sessions"), { recursive: true });
  
  // 1. Create
  const folder = await createFolder(root, { name: "Music", icon: "music", color: "pink" });
  assert.equal(folder.name, "Music");
  assert.equal(folder.icon, "music");
  
  // 2. List
  const folders = await listFolders(root);
  assert.equal(folders.length, 1);
  
  // 3. Update
  const updated = await updateFolder(root, folder.id, { name: "Jazz" });
  assert.equal(updated.name, "Jazz");
  
  // 4. Memory
  const mem = await getFolderMemory(root, folder.id);
  assert.equal(mem.length, 0);
  
  await updateFolderMemory(root, folder.id, [{ content: "I love wave to earth." }]);
  const updatedMem = await getFolderMemory(root, folder.id);
  assert.equal(updatedMem.length, 1);
  assert.equal(updatedMem[0].content, "I love wave to earth.");
  
  // 5. Delete
  await deleteFolder(root, folder.id);
  const foldersPost = await listFolders(root);
  assert.equal(foldersPost.length, 0);
});
