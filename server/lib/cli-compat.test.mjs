import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

test("codmes and legacy CLI aliases expose help", () => {
  const codmes = spawnSync(process.execPath, [path.join(repoRoot, "bin", "codmes.mjs"), "--help"], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(codmes.status, 0);
  assert.match(codmes.stdout, /Codmes CLI/);
  assert.match(codmes.stdout, /codmes serve/);

  const aiw = spawnSync(process.execPath, [path.join(repoRoot, "bin", "aiw.mjs"), "--help"], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, CODMES_SUPPRESS_LEGACY_WARNING: "1" }
  });
  assert.equal(aiw.status, 0);
  assert.match(aiw.stdout, /Codmes CLI/);
});
