# Runtime Migration Notes

This note tracks the migration from the first prototype toward a standalone
AI Workspace runtime. It does not describe a product architecture where
AI Workspace runs as a wrapper around a separate server.

## Current Decision

AI Workspace owns the runtime boundary.

```text
Client
  -> AI Workspace Server
  -> AI Workspace runtime
```

The initial prototype used an existing local implementation as a reference for
sessions, provider catalogs, auth, streaming events, tools, approvals, MCP, and
code-agent workflows. Those ideas are being moved into AI Workspace modules.

## Already Migrated

- `aiw model` is an AI Workspace command.
- `aiw provider list` reads AI Workspace's provider registry.
- `aiw auth` stores AI Workspace credentials under `.ai-workspace/config`.
- Models are listed from AI Workspace runtime config.
- Sessions are stored under `.ai-workspace/sessions`.
- Public client APIs are `/api/models`, `/api/sessions`, and `/api/live`.

## Still To Migrate

- Real model execution backend.
- Streaming model output through AI Workspace event format.
- Tool registry and tool execution.
- Approval-aware tool calls.
- MCP/docsearch connection ownership.
- Sandbox policy.
- OAuth account flows for providers that are not API-key based.

## Provider Registry Source

The first provider registry snapshot is derived from the local reference
provider catalog. This avoids inventing names, auth categories, and model
families from scratch while still moving ownership into AI Workspace code.

Future updates should either:

- port the relevant catalog logic directly into `server/lib/runtime/provider.mjs`
  and `server/lib/runtime/model.mjs`, or
- provide a one-time migration script that regenerates AI Workspace-owned
  registry data from a local reference checkout.
