import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createModelTuiLaunch,
  modelConfigHome,
  vendoredModelEntry
} from "./model-config-tui.mjs";

test("vendored model TUI is scoped to Codmes runtime state", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "codmes-model-tui-"));
  const workspaceRoot = path.join(root, "workspace");
  await fs.mkdir(workspaceRoot, { recursive: true });
  const fakePython = path.join(root, "python");
  await fs.writeFile(fakePython, "#!/bin/sh\nexit 0\n", { mode: 0o755 });

  const launch = createModelTuiLaunch({
    repoRoot: "/repo",
    workspaceRoot,
    args: ["--refresh"],
    env: { CODMES_RUNTIME_PYTHON: fakePython }
  });

  assert.equal(launch.command, fakePython);
  assert.deepEqual(launch.args, [vendoredModelEntry("/repo"), "--refresh"]);
  assert.equal(launch.env.HERMES_HOME, modelConfigHome(workspaceRoot));
  assert.match(launch.env.PYTHONPATH, /vendor\/hermes-agent/);
});
