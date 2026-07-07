import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildWorkspaceContext } from "./context-router.mjs";

test("attaches a short note inline", async () => {
  const root = await fixtureWorkspace();
  const context = await buildWorkspaceContext(root, {
    scopeType: "note",
    scopePath: "Notes/a.md"
  });
  assert.equal(context.workspace.scopeType, "note");
  assert.equal(context.inlineBlocks.length, 1);
  assert.match(context.inlineBlocks[0].content, /Alpha note/);
  assert.equal(context.summary.ragRecommended, false);
});

test("folder context lists files and recommends rag", async () => {
  const root = await fixtureWorkspace();
  const context = await buildWorkspaceContext(root, {
    scopeType: "folder",
    scopePath: "Notes",
    maxInlineFiles: 1
  });
  assert.equal(context.workspace.ragRecommended, true);
  assert.equal(context.workspace.ragSearchScopeType, "folder");
  assert.ok(context.fileList.some((file) => file.path === "Notes/a.md"));
  assert.equal(context.inlineBlocks.length, 1);
});

test("pdf context is metadata only", async () => {
  const root = await fixtureWorkspace();
  const context = await buildWorkspaceContext(root, {
    scopeType: "pdf",
    scopePath: "Documents/book.pdf"
  });
  assert.equal(context.inlineBlocks.length, 0);
  assert.equal(context.resources[0].kind, "pdf");
  assert.equal(context.summary.ragRecommended, true);
});

test("rejects context path traversal", async () => {
  const root = await fixtureWorkspace();
  await assert.rejects(
    () => buildWorkspaceContext(root, { scopeType: "note", scopePath: "../secret.md" }),
    /Path traversal/
  );
});

async function fixtureWorkspace() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "context-router-"));
  await fs.mkdir(path.join(root, "Notes"), { recursive: true });
  await fs.mkdir(path.join(root, "Documents"), { recursive: true });
  await fs.writeFile(path.join(root, "Notes", "a.md"), "# Alpha note\n\nHello.", "utf8");
  await fs.writeFile(path.join(root, "Notes", "b.md"), "# Beta note\n\nWorld.", "utf8");
  await fs.writeFile(path.join(root, "Documents", "book.pdf"), "%PDF fake", "utf8");
  return root;
}

