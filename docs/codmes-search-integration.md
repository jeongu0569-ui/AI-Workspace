# Codmes Search Integration

Codmes Search is a built-in server feature. The assistant sees one official
tool, `codmes_search`.

## Current Path

```text
User question
  -> Codmes Runtime
  -> codmes_search tool
  -> Codmes workspace search
  -> file/note/code/PDF extracted text/conversation results
```

The current implementation uses the native workspace text scan and PDF text
cache. Search configuration is exposed through:

```text
GET  /api/search/config
POST /api/search/config
GET  /api/search/status
POST /api/search
```

Search settings are stored in:

```text
<Workspace>/.codmes/config/search.env
```

## Direction

Codmes should own indexing, query, status, and future semantic search inside
the server. MCP remains available for unrelated external tools, but document
search is not modeled as a required MCP dependency.

Planned Search Runtime layers:

- indexing roots
- include/exclude globs
- file watcher
- extracted PDF text cache
- chunk schema
- embedding provider abstraction
- local SQLite/FTS index
- optional vector index
- query API
- runtime context injection

## Client UX

Apple clients configure Search from `Settings > Search`, not from the MCP
settings page. The MCP settings page is only for optional external tools.

## LLM Tool

The runtime exposes:

```text
codmes_search
```

Use it for broad note, document, PDF, code, and conversation searches.
