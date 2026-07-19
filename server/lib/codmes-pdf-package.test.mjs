import assert from "node:assert/strict";
import test from "node:test";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import {
  CODMES_PDF_FORMAT,
  CODMES_PDF_SCHEMA_VERSION,
  createCodmesPdfPackage,
  readCodmesPdfPackage
} from "./codmes-pdf-package.mjs";

const pdfData = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n", "utf8");
const annotations = {
  schemaVersion: 2,
  documentPath: "Documents/source.pdf",
  pages: [{ pageIndex: 0, objects: [{ id: "ink-1", type: "ink" }] }],
  objects: [],
  elements: []
};

test("Codmes PDF package round-trips PDF and editable annotations", () => {
  const created = createCodmesPdfPackage({
    pdfData,
    annotations,
    title: "Meeting notes",
    createdAt: "2026-07-19T00:00:00.000Z"
  });
  const restored = readCodmesPdfPackage(created.data);

  assert.equal(restored.manifest.format, CODMES_PDF_FORMAT);
  assert.equal(restored.manifest.schemaVersion, CODMES_PDF_SCHEMA_VERSION);
  assert.equal(restored.manifest.title, "Meeting notes");
  assert.deepEqual(restored.pdfData, pdfData);
  assert.deepEqual(restored.annotations, annotations);
  assert.deepEqual(Object.keys(unzipSync(created.data)).sort(), ["annotations.json", "document.pdf", "manifest.json"]);
});

test("Codmes PDF package rejects changed contents", () => {
  const created = createCodmesPdfPackage({ pdfData, annotations, title: "Changed" });
  const entries = unzipSync(created.data);
  entries["annotations.json"] = strToU8(JSON.stringify({ ...annotations, pages: [] }));
  const changed = zipSync(entries);

  assert.throws(() => readCodmesPdfPackage(changed), /checksum verification failed/i);
});

test("Codmes PDF package rejects unsupported versions before restore", () => {
  const created = createCodmesPdfPackage({ pdfData, annotations, title: "Future" });
  const entries = unzipSync(created.data);
  const manifest = JSON.parse(strFromU8(entries["manifest.json"]));
  manifest.schemaVersion = CODMES_PDF_SCHEMA_VERSION + 1;
  entries["manifest.json"] = strToU8(JSON.stringify(manifest));
  const future = zipSync(entries);

  assert.throws(() => readCodmesPdfPackage(future), /unsupported Codmes PDF version/i);
});

test("Codmes PDF package rejects unrelated ZIP files", () => {
  const unrelated = zipSync({ "notes.txt": strToU8("hello") });
  assert.throws(() => readCodmesPdfPackage(unrelated), /unexpected file structure/i);
});
