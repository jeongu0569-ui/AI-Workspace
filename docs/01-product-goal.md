# Product Goal

## Goal

Build AI Workspace as a standalone, server-centered workspace app.

AI Workspace is not an Obsidian plugin, not a thin chat app, and not a wrapper
around an external AI server. The product should combine three familiar
surfaces:

```text
ChatGPT-like chat
+ Obsidian / GoodNotes-like notes, PDFs, and resources
+ Codex-like coding agent workspace
```

The Workspace Server owns runtime configuration, sessions, context routing,
task history, approvals, tool logs, diffs, search state, and long-running work
records.

## Target Runtime Shape

```text
Client
  -> AI Workspace Server
  -> AI Workspace runtime
       - chat/session runtime
       - model/provider/auth runtime
       - stream/event runtime
       - tool registry
       - approval system
       - MCP/search integration
       - code task runtime
```

The runtime should be internal to AI Workspace. A separate external AI server
should not be required for normal operation.

## Migration Position

The early prototype referenced an existing local Hermes implementation because
it already had useful ideas for provider catalogs, auth storage, model picking,
streaming events, tool calls, approvals, MCP, and code-agent behavior.

That codebase is a migration reference, not the final product boundary. The
direction is to bring the useful runtime ideas into AI Workspace-owned modules:

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

server/lib/workspace/
  files.mjs
  tree.mjs
  search.mjs
  context.mjs
  notes.mjs
  pdf.mjs
  code.mjs
```

## Why Not Obsidian Plugin

Obsidian is a local Vault app. That is excellent for personal markdown notes,
but it conflicts with this product's final shape:

- PDFs in the Vault are synced to every device and can overload iPhone/iPad
  storage.
- PDFs outside the Vault become awkward links instead of first-class indexed
  resources.
- Large folder, tag, PDF, and workspace context should be searched on the
  server, not attached by a plugin.
- iPhone cannot reliably treat NAS/shared folders as a local Obsidian Vault.
- Code agent features need a Codex-like UI, not a cramped note plugin panel.

The new app should make AI Workspace Server the center. Clients should fetch
only the data they need.

## User-Facing Model

Users should still see a familiar file tree:

```text
Workspace
├── Notes
│   ├── Markdown notes
│   ├── PDFs
│   ├── Images
│   └── Attachments
└── Code
    ├── Projects
    ├── Folders
    └── Code files
```

The UI should feel like Obsidian, GoodNotes, VS Code, and modern AI chat apps.
Internally, the server manages metadata, search state, runtime config, sessions,
and permissions.

## Server Workspace Root

The server owns a real folder on disk:

```text
/Users/user/AIWorkspace
/DATA/AIWorkspace
/NAS/AIWorkspace
```

Default layout:

```text
AIWorkspace/
├── Notes/
├── Code/
├── Documents/
├── Attachments/
└── .ai-workspace/
```

The `.ai-workspace` folder is the primary AI Workspace state root:

```text
.ai-workspace/
├── config/
├── sessions/
├── tasks/
├── memory/
├── approvals/
├── decisions/
├── tool-logs/
├── diffs/
└── index/
```

## Current MVP Boundary

The MVP should prove:

- Workspace root initialization
- Notes/Code/Documents/Attachments file tree
- Markdown/text/code open and save
- Basic PDF/raw file delivery
- AI Workspace-owned model/provider/auth config
- AI Workspace-owned session store
- Workspace Agent Engine boundary with task/session/tool logs
- Code task inspect/propose/apply/check/git flow
- Approval inbox
- Clear API contract for live streaming
- Documentation for context routing and search

Do not start with tags, handwritten PDF annotations, full Git UI, or complex
multi-user auth. Those come after the base architecture works.
