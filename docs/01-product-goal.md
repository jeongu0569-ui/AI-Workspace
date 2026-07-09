# Product Goal

## Goal

Build a server-centered AI Workspace around a Workspace Agent Engine.

This is not an Obsidian plugin and not a standalone chat app. The product should
combine three familiar surfaces:

```text
ChatGPT-like chat
+ Obsidian / GoodNotes-like notes, PDFs, and resources
+ Codex-like coding agent workspace
```

The Workspace Server owns the workspace state, context routing, task history,
and long-running work records. Hermes is the first live model/tool/session
adapter because it already provides sessions, model providers, tool execution,
approvals, and MCP/docsearch. The architecture should still leave room for a
future local/Codex-style code runtime without rewriting the client.

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

The new app should make the Workspace Server and Workspace Agent Engine the
center. Hermes is the first backend adapter, not the only possible runtime.
Clients should fetch only the data they need.

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

The UI feels like Obsidian and VS Code. Internally, the server manages metadata,
search state, Hermes links, and permissions.

## Server Workspace Root

The server owns a real folder on disk:

```text
/Users/user/HermesWorkspace
/DATA/HermesWorkspace
/NAS/HermesWorkspace
```

Default layout:

```text
HermesWorkspace/
├── Notes/
├── Code/
├── Documents/
├── Attachments/
├── .hermes-workspace/
└── .ai-workspace/
```

The `.hermes-workspace` folder is for metadata, index state, thumbnails, and
server-managed cache that already existed in the early MVP.

The `.ai-workspace` folder is the newer agent-engine state root:

```text
.ai-workspace/
├── sessions/
├── tasks/
├── memory/
├── decisions/
├── tool-logs/
├── diffs/
└── index/
```

This is where Hermes-style chat sessions and future Codex-style coding tasks can
share one workspace-owned state layer.

## First MVP Boundary

The first MVP should prove the architecture:

- Workspace root initialization
- Notes/Code file tree
- Markdown/text file open and save
- Basic PDF/raw file delivery
- Hermes sessions/models proxy through the first Hermes adapter
- Workspace Agent Engine boundary with workspace-owned task/session/tool logs
- Clear API contract for future live streaming
- Documentation for context routing and docsearch

Do not start with tags, handwritten PDF annotations, full Git UI, or complex
multi-user auth. Those come after the base architecture works.
