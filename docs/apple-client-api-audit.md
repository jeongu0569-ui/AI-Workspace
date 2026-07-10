# Apple Client API Audit

Target file:

```text
client/apple/Sources/Codmes/WorkspaceAPI.swift
```

The Apple client should talk only to Codmes Server. It should not know
about external runtime dashboards, cookies, local filesystem paths, or provider
credentials.

## Connection And Auth

| Swift surface | Server API | Status | Notes |
|---|---|---:|---|
| `WorkspaceStore.serverURLText` | base URL | implemented | Saved in `UserDefaults`. |
| `WorkspaceStore.serverAuthToken` | `Authorization: Bearer` / `?token=` | implemented | Saved in `UserDefaults` for now; Keychain should replace this later. |
| `WorkspaceAPI.health()` | `GET /api/health` | implemented | Public; returns `authRequired`. |
| `WorkspaceAPI.workspace()` | `GET /api/workspace` | implemented | Requires token when configured. |
| `LiveChatClient.connect()` | `WS /api/live?token=...` | implemented | Token is sent as query parameter for WebSocket compatibility. |

## Workspace Files

| Swift method | Server endpoint | Status | Notes |
|---|---|---:|---|
| `tree(root:path:)` | `GET /api/tree` | implemented | Used by Notes/Code browsers. |
| `file(path:)` | `GET /api/file` | implemented | Text/markdown/code preview and edit. |
| `rawURL(path:)` | `GET /api/raw` | implemented | Adds `token` query when configured. |
| `downloadRawFile(path:name:)` | `GET /api/raw` | implemented | Adds Bearer header and stores temp preview file. |
| `writeFile(path:content:)` | `PUT /api/file` | implemented | Text save. |
| `createFile(path:content:)` | `POST /api/file` | implemented | Notes/Code creation. |
| `createFolder(path:)` | `POST /api/folder` | implemented | Notes/Code creation. |
| `movePath(from:to:)` | `PATCH /api/file/move` | implemented | Move/rename. |
| `copyPath(from:to:)` | `POST /api/file/copy` | implemented | Copy. |
| `deletePath(path:)` | `DELETE /api/file` | implemented | Delete. |

Missing client use:

```text
GET /api/file/metadata
```

This can later power file info panels, PDF metadata, and indexing state badges.

## Uploads

| Swift method | Server endpoint | Status | Notes |
|---|---|---:|---|
| `uploadFile(path:data:)` | `POST /api/file/upload` | implemented | Small files. |
| `startChunkedUpload(path:size:)` | `POST /api/file/upload/start` | implemented | Large files. |
| `uploadChunk(uploadId:offset:data:)` | `POST /api/file/upload/chunk` | implemented | Large files. |
| `completeChunkedUpload(uploadId:)` | `POST /api/file/upload/complete` | implemented | Large files. |
| `cancelChunkedUpload(uploadId:)` | `POST /api/file/upload/cancel` | implemented | Failure cleanup. |

## Rendering

| Swift method | Server endpoint | Status | Notes |
|---|---|---:|---|
| `renderMarkdown(markdown:)` | `POST /api/render/markdown` | implemented | WKWebView rich Markdown path. |
| `renderCode(code:language:)` | `POST /api/render/code` | implemented | Shiki-backed code view. |

## Search And Index

| Swift method | Server endpoint | Status | Notes |
|---|---|---:|---|
| `search(query:scopePath:)` | `POST /api/search` | implemented | Current Search tab. |

Missing client use:

```text
GET  /api/search/status
GET  /api/index/status
POST /api/index/rebuild
```

These should later appear in a search/index status panel.

## Tasks And Approvals

| Swift method | Server endpoint | Status | Notes |
|---|---|---:|---|
| `agentTasks(type:limit:)` | `GET /api/agent/tasks` | implemented | Code Agent panel. |
| `agentTask(id:)` | `GET /api/agent/tasks/:id` | implemented | Code Agent detail. |
| `approvals(status:limit:)` | `GET /api/agent/approvals` | implemented | Approval inbox. |
| `respondToApproval(...)` | `POST /api/agent/approvals/:id/respond` | implemented | Patch/check/runtime approval. |

Missing client use:

```text
POST /api/agent/tasks/:id/resume
POST /api/agent/tasks/:id/cancel
```

The server supports these. The Apple approval inbox should eventually expose a
cancel action for `approval_required` tasks and show task resume state.

## Code Tasks

| Swift method | Server endpoint | Status | Notes |
|---|---|---:|---|
| `createCodeTask(scopePath:instruction:)` | `POST /api/agent/code-task` | implemented | Inspect task. |
| `applyCodePatch(taskId:proposalId:)` | `POST /api/agent/code-task/:id/patches/:proposalId/apply` | implemented | Approved apply. |
| `rejectCodePatch(taskId:proposalId:)` | `POST /api/agent/code-task/:id/patches/:proposalId/reject` | implemented | Reject proposal. |
| `runCodeChecks(taskId:)` | `POST /api/agent/code-task/:id/checks` | implemented | Approved checks. |

Missing client use:

```text
POST /api/agent/code-task/:id/patches
POST /api/agent/code-task/:id/patches/generate
POST /api/agent/code-task/:id/git
```

The server already has these. The client currently focuses on existing proposal
approval/apply/check primitives.

## Models And Sessions

| Swift method | Server endpoint | Status | Notes |
|---|---|---:|---|
| `hermesModelOptions()` | `GET /api/models` | implemented | Name is legacy; it now targets Codmes runtime. |
| `hermesSessions()` | `GET /api/sessions` | implemented | Name is legacy; should be renamed later. |
| `hermesSessionMessages(sessionId:)` | `GET /api/sessions/:id/messages` | implemented | History loading. |
| `deleteHermesSession(sessionId:)` | `DELETE /api/sessions/:id` | implemented | History management. |

Naming debt:

```text
HermesModelOption
HermesSessionSummary
hermesModelOptions()
hermesSessions()
```

These symbols are product-era leftovers. They should be renamed to
`WorkspaceModelOption`, `WorkspaceSessionSummary`, `workspaceModelOptions()`,
and `workspaceSessions()` when the next client cleanup pass is safe.

## Live Commands

`LiveChatClient` uses:

```text
connect
session.create
session.resume
prompt.submit
approval.respond
config.accessMode
config.reasoning
```

Server-supported but not yet used directly by the Apple client:

```text
approval.inbox.list
approval.inbox.show
approval.inbox.respond
task.resume
task.cancel
code.task.create
code.checks.run
code.patch.propose
code.patch.apply
code.patch.reject
```

The client currently uses HTTP for approval/code task management and WebSocket
for chat.

## Management APIs

Implemented on the server but not yet surfaced in the Apple client:

```text
GET/POST /api/security
GET/POST/DELETE /api/mcp
GET/POST /api/skills
GET /api/doctor
```

Recommended client order:

1. Add a read-only Diagnostics panel using `/api/doctor`.
2. Add Search/Index status using `/api/index/status`.
3. Add task cancel in the approval inbox.
4. Add security/MCP/skills management only after the base UX is stable.
