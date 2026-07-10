# Runtime Migration Notes

This note tracks the migration from the first prototype toward a standalone
Codmes runtime. It does not describe a product architecture where
Codmes runs as a wrapper around a separate server.

## Current Decision

Codmes owns the runtime boundary.

```text
Client
  -> Codmes Server
  -> Codmes runtime
```

The initial prototype used an existing local implementation as a reference for
sessions, provider catalogs, auth, streaming events, tools, approvals, MCP, and
code-agent workflows. Those ideas are being moved into Codmes modules.

## Already Migrated

- `codmes model` is an Codmes command.
- `codmes provider list` reads Codmes's provider registry.
- `codmes auth` stores Codmes credentials under `.codmes/config`.
- Models are listed from Codmes runtime config.
- Sessions are stored under `.codmes/sessions`.
- Public client APIs are `/api/models`, `/api/sessions`, and `/api/live`.

## Still To Migrate

- Real model execution backend.
- Streaming model output through Codmes event format.
- Tool registry and tool execution.
- Approval-aware tool calls.
- MCP/docsearch connection ownership.
- Sandbox policy.
- OAuth account flows for providers that are not API-key based.

## Provider Registry Source

The first provider registry snapshot is derived from the local reference
provider catalog. This avoids inventing names, auth categories, and model
families from scratch while still moving ownership into Codmes code.

Future updates should either:

- port the relevant catalog logic directly into `server/lib/runtime/provider.mjs`
  and `server/lib/runtime/model.mjs`, or
- provide a one-time migration script that regenerates Codmes-owned
  registry data from a local reference checkout.
