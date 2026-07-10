# Hermes Core Absorption Audit

This document audits the absorption state of the Hermes core runtime inside Codmes, mapping implemented features, gaps, and implementation checklists.

## Feature Mapping Status

| Feature Area | Hermes Core Spec / Requirement | Codmes Implementation State | Status |
| :--- | :--- | :--- | :--- |
| **`config.yaml` 구조** | Storing model default selection & custom provider endpoint definitions. | Preserves nested structures and parses/writes in standard YAML format. | `implemented` |
| **`auth.json` 구조** | Storing multi-credential lists inside `credential_pool`. | Reads/writes credentials inside `$CODMES_WORKSPACE_ROOT/.codmes/config/auth.json`. | `implemented` |
| **Provider Registry** | Canonical provider identifiers with their models and credential mappings. | Defined inside `config-store.mjs` `BUILTIN_PROVIDERS` listing. | `implemented` |
| **Model Selection** | Extracting selected provider/model configurations. | Resolved from current default configuration or prompt arguments. | `implemented` |
| **Default Model 관리** | Scriptable and interactive default model selection. | Supported via `codmes model set-default` and interactive `codmes model`. | `implemented` |
| **Fallback Provider Chain** | Multi-provider fallback chain if defaults are missing. | Supports `fallback_chain` in config.yaml; loops over fallback targets on error with classified conditions (rate limit, auth, network, model/provider unavailable). | `implemented` |
| **Auth Flows** | Dynamic credential pool additions, list checks, and deletions. | Supported via `codmes auth set`, `codmes auth list`, and `codmes auth remove`. | `implemented` |
| **Session Lifecycle** | Create, resume, list, browse, rename, export, prune, and delete. | Fully supported in both CLI (`rename`, `export`, `prune`, `delete`) and TUI browser. | `implemented` |
| **Tool Registry** | Common core tools configuration and executor. | Workspace search, file reader, and directory tree lister are native. | `implemented` |
| **Tools Toggle** | Toggling specific tool activations. | Filters tools using `disabled_tools` list in config.yaml. Toggleable via CLI `codmes tools`. | `implemented` |
| **MCP Server Registry** | Managing Model Context Protocol servers. | Supports `mcp_servers` configuration, commands, and actual stdio JSON-RPC client connection (initialize, tools/list, tools/call). | `implemented` |
| **Skills / Plugins** | Custom bundle plugins and active skill injection. | Natively loaded from `.codmes/skills/`. Supports list, show, enable, disable, add, remove, and dynamic relevance/trigger system prompt injection. | `implemented` |
| **Approvals & Security** | Safe action approval queues, hooks, and execution rules. | Evaluates allowed/denied commands, shell restrictions, path boundaries, and gates MCP tools or destructive tasks via approval polling. | `implemented` |
| **Doctor & Diagnostics** | Diagnostic tests, status outputs, and tracing logs. | Fully supported via `codmes doctor` inspecting all configurations, skills, security policies, and deep MCP server checks. | `implemented` |
| **Prompt Assembly** | Assembling system instructions, file lists, and guidelines. | Dynamic context router joins files, folders, RAG guidelines, and memory. | `implemented` |
| **Websocket & Live API** | Real-time WebSocket connection upgrades and JSON-RPC stream. | Live socket broker upgraded via `websocket-utils.mjs`. | `implemented` |
| **Runtime Event Stream** | Standard turn/token streaming events (`message.delta`, `turn.complete`). | Emits rich token streaming events correctly. | `implemented` |
| **Memory & Rule Injections** | Injection of rules, `.agents`, `AGENTS.md`, and memory guidelines. | Memory directory structure exists, project-scoped memory rule injection is supported. | `partially implemented` |

---

## Implementation Checklists

### Phase 1: Core Lifecycle & Diagnostics (Completed)
- [x] Implement Fallback Provider Chain with recursive retry, condition categorization (rate limit, auth, network, etc.), and `fallback.attempt` events.
- [x] Implement Session extensions: list, rename, export (markdown), prune (empty logs), and delete.
- [x] Add prune, rename, and export to TUI session browser.
- [x] Add Tools Toggle (`codmes tools list/enable/disable`) storing choices in config.yaml.
- [x] Add MCP Server Registry and stdio JSON-RPC client connection (initialize, tools/list, tools/call, timeouts, and process crash handlers).
- [x] Implement `codmes doctor` showing comprehensive workspace, config, auth, and network diagnostics.

### Phase 2: Skills & Security (Completed)
- [x] Add generic approval hooks and security schema to config.yaml.
- [x] Implement skill loading and metadata/instruction parser in `skill-registry.mjs`.
- [x] Integrate dynamic skill prompt injections based on triggers and task type relevance.
- [x] Add `codmes skills` and `codmes security` CLI tools.
- [x] Enforce allowed/denied shell commands, path boundary validations, and MCP execution approvals.
- [x] Set up GitHub Actions CI verification.
- [x] Enhance `codmes doctor --deep` to run live handshake checks on enabled MCP servers.

---

## Test Verification Results

All 48 unit and integration tests successfully pass:
```text
TAP version 13
# Subtest: workspace agent engine resolves context and records task state
ok 1 - workspace agent engine resolves context and records task state
# Subtest: workspace agent engine records live tool events under workspace state
ok 2 - workspace agent engine records live tool events under workspace state
# Subtest: workspace agent engine persists streamed assistant replies into sessions
ok 3 - workspace agent engine persists streamed assistant replies into sessions
# Subtest: workspace agent state creates the unified state directory shape
ok 4 - workspace agent state creates the unified state directory shape
# Subtest: workspace agent state lists task summaries
ok 5 - workspace agent state lists task summaries
# Subtest: workspace agent state records and resolves approval inbox items
ok 6 - workspace agent state records and resolves approval inbox items
# Subtest: parseGitCommand preserves quotes and partitions tokens correctly
ok 7 - parseGitCommand preserves quotes and partitions tokens correctly
# Subtest: LLMRuntime availability follows chat runtime backend availability
ok 8 - LLMRuntime availability follows chat runtime backend availability
# Subtest: normalizePatchResponse handles canonical, array, and write-op forms
ok 9 - normalizePatchResponse handles canonical, array, and write-op forms
# Subtest: code agent runtime inspects a Code project and records artifacts
ok 10 - code agent runtime inspects a Code project and records artifacts
# Subtest: code agent runtime rejects a proposed patch without changing files
ok 11 - code agent runtime rejects a proposed patch without changing files
# Subtest: code agent runtime can run approved checks immediately after applying a patch
ok 12 - code agent runtime can run approved checks immediately after applying a patch
# Subtest: code agent runtime rejects non-Code scopes
ok 13 - code agent runtime rejects non-Code scopes
# Subtest: code agent runtime generates automatic patches using mock LLM server
ok 14 - code agent runtime generates automatic patches using mock LLM server
# Subtest: code agent runtime executes git commands with safety approvals
ok 15 - code agent runtime executes git commands with safety approvals
# Subtest: attaches a short note inline
ok 16 - attaches a short note inline
# Subtest: folder context lists files and recommends RAG
ok 17 - folder context lists files and recommends RAG
# Subtest: pdf context is metadata only
ok 18 - pdf context is metadata only
# Subtest: rejects context path traversal
ok 19 - rejects context path traversal
# Subtest: normalizes workspace-relative paths
ok 20 - normalizes workspace-relative paths
# Subtest: rejects absolute and traversal paths
ok 21 - rejects absolute and traversal paths
# Subtest: resolved paths stay inside workspace root
ok 22 - resolved paths stay inside workspace root
# Subtest: maps root keys to folder names
ok 23 - maps root keys to folder names
# Subtest: renders fenced code with shiki markup
ok 24 - renders fenced code with shiki markup
# Subtest: escapes raw html in markdown
ok 25 - escapes raw html in markdown
# Subtest: drops unsafe link protocols
ok 26 - drops unsafe link protocols
# Subtest: returns complete html document
ok 27 - returns complete html document
# Subtest: renders standalone code documents with shiki
ok 28 - renders standalone code documents with shiki
# Subtest: OpenAI-compatible runtime streams chat completions from Codmes config
ok 29 - OpenAI-compatible runtime streams chat completions from Codmes config
# Subtest: OpenAI-compatible runtime reports setup when no model is selected
ok 30 - OpenAI-compatible runtime reports setup when no model is selected
# Subtest: OpenAI-compatible runtime executes workspace search tool calls
ok 31 - OpenAI-compatible runtime executes workspace search tool calls
# Subtest: OpenAI-compatible runtime executes fallback provider chain on error
ok 32 - OpenAI-compatible runtime executes fallback provider chain on error
# Subtest: OpenAI-compatible runtime filters tools using disabledTools config
ok 33 - OpenAI-compatible runtime filters tools using disabledTools config
# Subtest: OpenAI-compatible runtime exposes MCP tools and executes them via stdio JSON-RPC
ok 34 - OpenAI-compatible runtime exposes MCP tools and executes them via stdio JSON-RPC
# Subtest: McpClient server crash handling and timeout error
ok 35 - McpClient server crash handling and timeout error
# Subtest: OpenAI-compatible runtime fallback conditions separation
ok 36 - OpenAI-compatible runtime fallback conditions separation
# Subtest: SessionRuntime rename, export, and prune
ok 37 - SessionRuntime rename, export, and prune
# Subtest: OpenAI-compatible runtime fallback event condition mapping
ok 38 - OpenAI-compatible runtime fallback event condition mapping
# Subtest: McpClient lifecycle: initialize, list, call, idle-timeout, and logs
ok 39 - McpClient lifecycle: initialize, list, call, idle-timeout, and logs
# Subtest: Skills registry basic operations, validation, and path traversal protection
ok 40 - Skills registry basic operations, validation, and path traversal protection
# Subtest: Security policy evaluator allowed/denied commands and boundaries
ok 41 - Security policy evaluator allowed/denied commands and boundaries
# Subtest: System prompt dynamically includes enabled and relevant skills
ok 42 - System prompt dynamically includes enabled and relevant skills
# Subtest: isDangerousMcpTool heuristics evaluation
ok 43 - isDangerousMcpTool heuristics evaluation
# Subtest: searches workspace text files within scope
ok 44 - searches workspace text files within scope
# Subtest: does not search outside the requested scope
ok 45 - does not search outside the requested scope
# Subtest: reports fallback search status
ok 46 - reports fallback search status
# Subtest: encodes server text frames
ok 47 - encodes server text frames
# Subtest: decodes masked client text frames
ok 48 - decodes masked client text frames
1..48
# tests 48
# suites 0
# pass 48
# fail 0
# cancelled 0
# skipped 0
# todo 0
```
