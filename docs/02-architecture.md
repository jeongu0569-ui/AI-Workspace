# Architecture

## Current Shape

```text
Apple Client / Web clients / CLI
  -> AI Workspace Server
      -> WorkspaceAgentEngine
          -> ChatRuntime
          -> ModelRuntime
          -> SessionRuntime
          -> LLMRuntime
          -> CodeAgentRuntime
          -> WorkspaceAgentStateStore
      -> Workspace file APIs
      -> Render/search/context services
```

AI Workspace owns the server and runtime state. The Hermes core runtime (config, auth, model, provider, sessions, tools, approvals, live socket) is natively absorbed into AI Workspace. It is not an adapter or bridge structure connecting to an external Hermes server.

## Runtime Modules

Current runtime files:

```text
server/lib/agent-engine.mjs
server/lib/chat-runtime.mjs
server/lib/model-runtime.mjs
server/lib/session-runtime.mjs
server/lib/llm-runtime.mjs
server/lib/code-agent-runtime.mjs
server/lib/runtime/config-store.mjs
```

Planned runtime layout:

```text
server/lib/runtime/
  session.mjs
  model.mjs
  provider.mjs
  auth.mjs
  stream.mjs
  tools.mjs
  approvals.mjs
  mcp.mjs
  sandbox.mjs
```

`config-store.mjs` is the first step. It stores runtime configuration under
`.ai-workspace/config` and exposes provider, model, and credential commands for
`aiw`.

## Workspace State

The workspace root is a normal server-side folder:

```text
AIWorkspace/
├── Notes/
├── Code/
├── Documents/
├── Attachments/
└── .ai-workspace/
```

Runtime state lives under:

```text
.ai-workspace/
├── config/
│   ├── config.yaml
│   └── auth.json
├── sessions/
├── tasks/
├── memory/
├── approvals/
├── decisions/
├── tool-logs/
├── diffs/
└── index/
```

## Path Rule

Clients only send workspace-relative paths:

```text
Notes/Work/meeting.md
Code/project-a/src/main.ts
Documents/os-book.pdf
```

The server rejects absolute paths and traversal:

```text
/Users/user/Desktop/secret.txt
../../etc/passwd
C:/Users/user/secret.txt
```

## Public API Rule

Clients should talk to AI Workspace APIs only:

```text
GET  /api/models
GET  /api/sessions
POST /api/sessions
GET  /api/sessions/:id/messages
WS   /api/live
```

The Apple client should not know about any external server URL or dashboard
credential. It only needs the AI Workspace Server URL.

## Code Runtime

Code work is handled through the server:

```text
inspect
  -> proposed patch
  -> approval
  -> apply
  -> checks
  -> git diff/status
  -> task memory update
```

The client never runs a local shell on iOS. Shell/check/git commands are
server-side operations with scope limits, approval, timeout, and logs.

## Migration Reference

The local reference implementation remains useful for provider catalog,
credential, streaming, tool, approval, MCP, and sandbox ideas. Those ideas
should be ported into AI Workspace-owned modules instead of being kept behind an
external server dependency.

## Current Native Runtime Backend

The runtime backend is an OpenAI-compatible native engine under `server/lib/runtime/openai-compatible-runtime.mjs`. It resolves the selected provider/model from `.ai-workspace/config/config.yaml`, streams chat completions into AI Workspace live events, and lets the session runtime persist only the visible user/assistant messages.

Assistant replies are persisted from the same streaming events that power the live UI. The engine buffers `message.delta` events by session/task and writes a single assistant message to `.ai-workspace/sessions` on `turn.complete`, with a non-streaming result fallback for models that only return final text.

The native runtime also exposes a first read-only tool registry:

- `workspace_search`: search workspace text files.
- `workspace_read_file`: read a workspace-relative text, markdown, or code file.
- `workspace_list_tree`: list files and folders under a workspace path.

Tool calls are executed by AI Workspace itself, emitted as `tool.start`, `tool.complete`, or `tool.error` live events, then passed back to the model as tool results before the final assistant message is streamed.
