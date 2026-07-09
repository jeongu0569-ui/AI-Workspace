process.env.NODE_ENV = "test";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { indexSession } from "./conversation-index.mjs";
import { executeConversationSearch, executeConversationRead } from "./conversation-tools.mjs";

test("Conversation Tools: index, search and read", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "aiw-conversation-tools-"));
  await fs.mkdir(path.join(root, ".ai-workspace", "sessions"), { recursive: true });
  
  const mockSession = {
    id: "session-123",
    title: "macbook setup",
    kind: "general",
    surface: "chat",
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    summary: {
      content: "Setting up clamshell mode on macOS.",
      coveredMessageIds: ["1", "2"]
    },
    messages: [
      { role: "user", content: "macbook clamshell mode setup" },
      { role: "assistant", content: "To setup clamshell mode, connect an external display and keyboard." }
    ]
  };
  
  // Write actual session JSON to state root so conversation_read can find it
  await fs.writeFile(
    path.join(root, ".ai-workspace", "sessions", "session-123.json"),
    JSON.stringify(mockSession, null, 2),
    "utf8"
  );
  
  // Index it
  await indexSession(root, mockSession);
  
  // Search
  const searchResult = await executeConversationSearch(root, {
    query: "clamshell"
  });
  
  assert.ok(searchResult.results.length > 0);
  assert.equal(searchResult.results[0].sessionId, "session-123");
  
  // Read
  const readResult = await executeConversationRead(root, {
    sessionId: "session-123",
    messageIds: ["1"],
    includeSurroundingMessages: true,
    surroundingWindow: 1
  });
  
  assert.equal(readResult.sessionId, "session-123");
  assert.ok(readResult.messages.length > 0);
  assert.ok(readResult.messages.some(m => m.content.includes("clamshell")));
});
