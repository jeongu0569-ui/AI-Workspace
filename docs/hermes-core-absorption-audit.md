# Hermes Core Absorption Audit

This document audits the absorption state of the Hermes core runtime inside AI Workspace, mapping implemented features, gaps, and implementation priorities.

## Feature Mapping Status

| Feature Area | Hermes Core Spec / Requirement | AI Workspace Implementation State | Status |
| :--- | :--- | :--- | :--- |
| **`config.yaml` 구조** | Storing model default selection & custom provider endpoint definitions. | Preserves nested structures and parses/writes in standard YAML format. | `implemented` |
| **`auth.json` 구조** | Storing multi-credential lists inside `credential_pool`. | Reads/writes credentials inside `$AIW_WORKSPACE_ROOT/.ai-workspace/config/auth.json`. | `implemented` |
| **Provider Registry** | Canonical provider identifiers with their models and credential mappings. | Defined inside `config-store.mjs` `BUILTIN_PROVIDERS` listing. | `implemented` |
| **Model Selection** | Extracting selected provider/model configurations. | Resolved from current default configuration or prompt arguments. | `implemented` |
| **Default Model 관리** | Scriptable and interactive default model selection. | Supported via `aiw model set-default` and interactive `aiw model`. | `implemented` |
| **Fallback Provider Chain** | Multi-provider fallback chain if defaults are missing. | Key resolution checks stored configs first, then falls back to environment variables. | `partially implemented` |
| **Auth Flows** | Dynamic credential pool additions, list checks, and deletions. | Supported via `aiw auth set`, `aiw auth list`, and `aiw auth remove`. | `implemented` |
| **Session Lifecycle** | Create, resume, list, browse, rename, export, prune, and delete. | `create`, `resume`, `list`, `browse` (TUI), and `delete` are supported. `rename`, `export`, and `prune` are absent. | `partially implemented` |
| **Tool Registry** | Common core tools configuration and executor. | Workspace search, file reader, and directory tree lister are native. | `implemented` |
| **Tools Toggle** | Toggling specific tool activations. | Tools are statically registered and cannot be toggled off. | `missing` |
| **MCP Server Registry** | Managing Model Context Protocol servers. | No native MCP server manager or connection broker. | `missing` |
| **Skills / Plugins** | Custom bundle plugins and active skill injection. | Built-in guide skill is supported, but arbitrary plugin loading is absent. | `missing` |
| **Approvals & Security** | Safe action approval queues, hooks, and execution rules. | Task approval queue for code patches and git operations is native. Hooks are missing. | `partially implemented` |
| **Doctor & Diagnostics** | Diagnostic tests, status outputs, and tracing logs. | `aiw status` returns basic node info. Doctor CLI diagnostics are missing. | `partially implemented` |
| **Prompt Assembly** | Assembling system instructions, file lists, and guidelines. | Dynamic context router joins files, folders, RAG guidelines, and memory. | `implemented` |
| **Websocket & Live API** | Real-time WebSocket connection upgrades and JSON-RPC stream. | Live socket broker upgraded via `websocket-utils.mjs`. | `implemented` |
| **Runtime Event Stream** | Standard turn/token streaming events (`message.delta`, `turn.complete`). | Emits rich token streaming events correctly. | `implemented` |
| **Memory & Rule Injections** | Injection of rules, `.agents`, `AGENTS.md`, and memory guidelines. | Memory directory structure exists, project-scoped memory rule injection is supported. | `partially implemented` |

---

## Gap Analysis (Missing or Partial Features)

### 1. Fallback Provider Chain
* **Description**: If the primary configured provider throws a rate limit or API key error, the system does not dynamically fall back to another configured provider.
* **Impact**: Lower resilience in automated script runs.

### 2. Session Management Extensions (`rename`, `export`, `prune`)
* **Description**: Users cannot rename sessions via CLI or prune empty/expired sessions.
* **Impact**: Minor UX gap in managing session logs.

### 3. Tools Toggle & MCP Server Registry
* **Description**: Model Context Protocol (MCP) server registration (`mcp add/list/remove`) is missing. Models cannot call external MCP tools.
* **Impact**: Limited capability compared to full Hermes MCP tool integrations.

### 4. Doctor CLI Diagnostics
* **Description**: A `doctor` command to inspect workspace state, check internet endpoints, print loaded config paths, and verify keys is missing.
* **Impact**: Troubleshooting configuration errors is slightly harder.

---

## Next Implementation Priorities

### Phase 1: Core Lifecycle Improvements (High Priority)
1. Implement `aiw session rename <id> <new_title>` and `aiw session prune` to clear empty logs.
2. Build `aiw doctor` diagnostic helper command.

### Phase 2: MCP Integration (Medium Priority)
1. Add MCP server config schema to `config.yaml`.
2. Implement MCP client connector to fetch and execute tools from registered external MCP servers.

### Phase 3: Security & Hooks (Low Priority)
1. Add generic approval hook rules for running arbitrary shell/script checks.
