# Runtime Migration Note

AI Workspace started from a prototype that referenced behavior from an existing
local Hermes installation. That prototype proved useful UI and workflow ideas,
but the product direction is now standalone.

## Boundary

Wrong long-term shape:

```text
AI Workspace
  -> Workspace Server
  -> External AI server
  -> External runtime internals
```

Target shape:

```text
AI Workspace
  -> AI Workspace Server
  -> AI Workspace runtime
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

Those ideas should be ported into AI Workspace-owned modules. They should not
remain as a dependency on a separately running server.

## Current Step

The first migration step is already underway:

- `aiw model`, `aiw provider`, and `aiw auth` are AI Workspace commands.
- Provider registry data is derived from the local reference provider catalog
  and stored in AI Workspace runtime code.
- Runtime/session state lives under `.ai-workspace/`.
- Public client APIs are moving to `/api/models`, `/api/sessions`, and
  `/api/live`.

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

The first execution backend should be small and explicit: resolve a configured
OpenAI-compatible provider, stream output through AI Workspace events, persist
messages to `.ai-workspace/sessions`, and route dangerous operations through
the approval inbox.
