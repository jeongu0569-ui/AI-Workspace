# External Search And RAG Design

Codmes treats broad document search as a server-side integration point, not as an app-internal OCR/vector engine. Clients should not upload large folders or PDFs into a chat prompt. They should send the user's scope and intent, then the server decides whether to inline small context, use Workspace text scan, or call an external search tool such as codmes-search.

## Goals

- Keep Notes, Documents, PDFs, and Code searchable from one workspace root.
- Support a local text/PDF scan fallback.
- Let runtime prompts receive compact search context instead of raw folder dumps.
- Keep Codmes Search as the recommended semantic RAG path when users need indexed document search.
- Avoid duplicating OCR, embedding generation, vector DB storage, and re-indexing logic inside the app.

## Scope Decisions

- No built-in OCR engine for scanned PDFs.
- No built-in embedding model runner.
- No built-in vector database or app-owned semantic index.
- Text-layer PDFs, Markdown, code, and text documents remain searchable through existing extraction and scan paths.
- External tools may provide OCR/vector/RAG as server-side capabilities.

## Runtime Context Injection

The OpenAI-compatible runtime accepts structured context fields:

- `context.workspaceContext.searchResults`

These are rendered into the system/context message as compact “Search results context” sections. This keeps chat history cleaner than pasting entire folder contents.

## Query Flow

1. Client sends a user request and workspace scope.
2. Context router marks broad scopes with `ragRecommended`.
3. Runtime/model can call `workspace_search` or a configured Codmes Search tool.
4. Search results are attached to `workspaceContext.searchResults`.
5. Model answers using only the compact retrieved context.

## PDF Text

First pass implemented:

- PDF metadata appears under `GET /api/file/metadata`.
- Text-layer extraction utility caches text under `.codmes/index/pdf-text/`.
- Workspace scan search can search extracted PDF text.

Planned:

- More robust PDF parsing for compressed streams.
- Per-page chunking and page-level citation metadata.
- Better UI for external search/index status.
