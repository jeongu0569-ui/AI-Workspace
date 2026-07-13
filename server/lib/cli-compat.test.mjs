import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

test("codmes CLI exposes help", () => {
  const codmes = spawnSync(process.execPath, [path.join(repoRoot, "bin", "codmes.mjs"), "--help"], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(codmes.status, 0);
  assert.match(codmes.stdout, /Codmes CLI/);
  assert.match(codmes.stdout, /codmes serve/);
});
