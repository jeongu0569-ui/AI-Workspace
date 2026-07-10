# Runtime Migration Note

Codmes started from a prototype that referenced behavior from an existing
local Hermes installation. That prototype proved useful UI and workflow ideas,
but the product direction is now standalone.

## Boundary

Wrong long-term shape:

```text
Codmes
  -> Workspace Server
  -> External AI server
  -> External runtime internals
```

Target shape:

```text
Codmes
  -> Codmes Server
  -> Codmes runtime
```

## What To Migrate

The local reference implementation is useful for:

- provider catalog shape
- model catalog and picker behavior
- auth and credential store shape
- session storage conventions
- streaming event names and grouping
- tool registry ideas
- approval request/response flow
- MCP/search integration
- sandbox and safety policies

Those ideas should be ported into Codmes-owned modules. They should not
remain as a dependency on a separately running server.

## Current Step

The first migration step is already underway:

- `codmes model`, `codmes provider`, and `codmes auth` are Codmes commands.
- Provider registry data is derived from the local reference provider catalog
  and stored in Codmes runtime code.
- Runtime/session state lives under `.codmes/`.
- Public client APIs are moving to `/api/models`, `/api/sessions`, and
  `/api/live`.
- A first Codmes-owned OpenAI-compatible chat backend can execute
  configured models and stream `message.delta` events without a separate
  external runtime server.
- Surface-based tool modes let capable models call chat recall, memory,
  note/document search, and CodeAgentRuntime tools through Codmes-owned
  code. Mutating code tools remain approval-gated.
- `tool_discovery` can expand safe tools for the current turn without
  permanently enabling every tool for every chat.
- Conversation search/read and long-term memory now give the runtime compact
  recall without pasting all prior messages into every request.
- Assistant replies are now persisted to `.codmes/sessions` from live
  streaming events, so session history and visible streamed output share the
  same runtime path.
- MCP tool calls that need approval now pause as workspace tasks with
  `status=approval_required`, `approvalIds[]`, and server-owned `pendingState`.
  They can be approved/resumed, rejected, or cancelled without keeping the
  original model/tool stream blocked.
- Security policy decisions now write a first audit log under
  `.codmes/audit/audit.jsonl`, and `/api/doctor` reports recent denied and
  approval-required counts.

## Next Step

Move from configuration ownership to execution ownership:

```text
server/lib/runtime/
  provider.mjs
  auth.mjs
  model.mjs
  session.mjs
  stream.mjs
  tools.mjs
  approvals.mjs
  mcp.mjs
  sandbox.mjs
```

Next, broaden execution ownership: add provider-specific auth flows,
approval-gated mutating tools, MCP search orchestration, and richer model
capability metadata on top of the first OpenAI-compatible backend and read-only
workspace tools.
