# Run Commands

## Server

```bash
cd /Users/user/Desktop/AI-Workspace-on-hermes

AIW_WORKSPACE_ROOT="$HOME/AIWorkspace" \
AIW_HOST="127.0.0.1" \
AIW_PORT="8787" \
aiw serve
```

Equivalent development command:

```bash
AIW_WORKSPACE_ROOT="$HOME/AIWorkspace" npm start
```

For iPhone/iPad testing over Tailscale or LAN:

```bash
AIW_WORKSPACE_ROOT="$HOME/AIWorkspace" \
AIW_HOST="0.0.0.0" \
AIW_PORT="8787" \
aiw serve
```

Then connect the app to:

```text
http://<server-ip-or-tailscale-ip>:8787
```

## Status

```bash
aiw status
aiw status --json
curl http://127.0.0.1:8787/api/workspace
```

Expected runtime fields:

```json
{
  "runtime": {
    "status": "ok",
    "owner": "ai-workspace",
    "configPath": ".ai-workspace/config"
  }
}
```

## Models / Providers / Auth

```bash
aiw provider list
aiw model list
aiw model set-default openai-api gpt-5.4-mini
aiw auth list
aiw auth set openai-api OPENAI_API_KEY sk-...
```

Credential config is stored under:

```text
<workspace>/.ai-workspace/config/credentials.json
```

Runtime config is stored under:

```text
<workspace>/.ai-workspace/config/runtime.json
```

Environment variables with the `AIW_` prefix are also detected where relevant:

```bash
export AIW_OPENAI_API_KEY="sk-..."
export AIW_OLLAMA_BASE_URL="http://127.0.0.1:11434"
export AIW_LMSTUDIO_BASE_URL="http://127.0.0.1:1234/v1"
```

## Workspace APIs

```bash
curl http://127.0.0.1:8787/api/tree?root=notes
curl http://127.0.0.1:8787/api/models
curl http://127.0.0.1:8787/api/sessions
```

Create a session:

```bash
curl -X POST http://127.0.0.1:8787/api/sessions \
  -H 'content-type: application/json' \
  -d '{"title":"Test session","model":"gpt-5.4-mini"}'
```

## Code Tasks

```bash
aiw code create Code/demo-app "change the greeting"
aiw code list
aiw approvals list
```

Manual patch proposal:

```bash
aiw code patch <taskId> \
  --path src/index.js \
  --find "return 'hello';" \
  --replace "return 'hello workspace';"
```

Apply after approval:

```bash
aiw code apply <taskId> <proposalId> --check --command "npm test"
```

## Apple Client

```bash
cd /Users/user/Desktop/AI-Workspace-on-hermes/client/apple
swift run AIWorkspace
```

In the app settings, set the server URL to:

```text
http://127.0.0.1:8787
```

For iPhone/iPad, use the Mac server's LAN or Tailscale address.

## Logs

For a background server:

```bash
cd /Users/user/Desktop/AI-Workspace-on-hermes

AIW_WORKSPACE_ROOT="$HOME/AIWorkspace" \
AIW_HOST="0.0.0.0" \
AIW_PORT="8787" \
node server/index.mjs > /tmp/ai-workspace.log 2>&1 &

echo $! > /tmp/ai-workspace.pid
tail -f /tmp/ai-workspace.log
```

Stop it:

```bash
kill "$(cat /tmp/ai-workspace.pid)"
```
