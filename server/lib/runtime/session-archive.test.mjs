process.env.NODE_ENV = "test";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  archiveExpiredSessions,
  listArchivedSessions,
  archiveSession,
  unarchiveSession,
  isArchiveExempt
} from "./session-archive.mjs";

test("Session Archive: exemption check", () => {
  assert.equal(isArchiveExempt({ projectId: "knu-ai" }), true);
  assert.equal(isArchiveExempt({ folderId: "music" }), true);
  assert.equal(isArchiveExempt({ pinned: true }), true);
  assert.equal(isArchiveExempt({ kind: "general" }), false);
});

test("Session Archive: automatic archive and manual restore", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "aiw-session-archive-"));
  await fs.mkdir(path.join(root, ".ai-workspace", "sessions"), { recursive: true });
  
  const oldDate = new Date(Date.now() - 32 * 24 * 3600 * 1000).toISOString();
  
  const expiredSession = {
    id: "sess-expired",
    title: "old conversation",
    kind: "general",
    createdAt: oldDate,
    updatedAt: oldDate,
    visibleInSidebar: true
  };
  
  const activeSession = {
    id: "sess-active",
    title: "new conversation",
    kind: "general",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    visibleInSidebar: true
  };
  
  await fs.writeFile(path.join(root, ".ai-workspace", "sessions", "sess-expired.json"), JSON.stringify(expiredSession), "utf8");
  await fs.writeFile(path.join(root, ".ai-workspace", "sessions", "sess-active.json"), JSON.stringify(activeSession), "utf8");
  
  // Auto-archive
  const archiveRes = await archiveExpiredSessions(root, { thresholdDays: 30 });
  assert.equal(archiveRes.archivedCount, 1);
  
  const sess1 = JSON.parse(await fs.readFile(path.join(root, ".ai-workspace", "sessions", "sess-expired.json"), "utf8"));
  assert.ok(sess1.archivedAt);
  assert.equal(sess1.visibleInSidebar, false);
  
  const sess2 = JSON.parse(await fs.readFile(path.join(root, ".ai-workspace", "sessions", "sess-active.json"), "utf8"));
  assert.ok(!sess2.archivedAt);
  assert.equal(sess2.visibleInSidebar, true);
  
  // Manual unarchive
  await unarchiveSession(root, "sess-expired");
  const sessRestore = JSON.parse(await fs.readFile(path.join(root, ".ai-workspace", "sessions", "sess-expired.json"), "utf8"));
  assert.equal(sessRestore.archivedAt, null);
  assert.equal(sessRestore.visibleInSidebar, true);
});
