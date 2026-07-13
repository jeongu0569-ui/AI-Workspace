import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  extractAndCacheDocument,
  getDocumentIngestMetadata,
  isDocumentIngestFile
} from "./document-ingest.mjs";

const execFileAsync = promisify(execFile);

test("document ingest extracts and caches PDF text through the worker", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "document-ingest-"));
  await fs.mkdir(path.join(root, "Documents"), { recursive: true });
  const pdfPath = path.join(root, "Documents", "manual.pdf");
  await fs.writeFile(
    pdfPath,
    "%PDF-1.4\n1 0 obj << /Type /Page >> endobj\nBT (codmes document ingest marker) Tj ET\n%%EOF",
    "latin1"
  );

  assert.equal(isDocumentIngestFile("Documents/manual.pdf"), true);

  const first = await extractAndCacheDocument(root, pdfPath, "Documents/manual.pdf");
  assert.equal(first.kind, "pdf");
  assert.match(first.text, /codmes document ingest marker/i);
  assert.equal(first.blocks.length, 1);
  assert.equal(first.blocks[0].source, "pdf-text");

  const metadata = await getDocumentIngestMetadata(root, pdfPath, "Documents/manual.pdf");
  assert.equal(metadata.cached, true);
  assert.equal(metadata.blockCount, 1);
  assert.ok(metadata.textLength > 0);

  const second = await extractAndCacheDocument(root, pdfPath, "Documents/manual.pdf");
  assert.deepEqual(second.text, first.text);
});

test("document ingest extracts DOCX text without LibreOffice through OpenXML fallback", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "document-ingest-docx-"));
  await fs.mkdir(path.join(root, "Documents"), { recursive: true });
  const docxPath = path.join(root, "Documents", "sample.docx");
  await createMinimalDocx(docxPath, "codmes openxml fallback marker");

  const result = await extractAndCacheDocument(root, docxPath, "Documents/sample.docx");
  assert.equal(result.kind, "document");
  assert.match(result.text, /codmes openxml fallback marker/i);
  assert.equal(result.blocks[0].source, "openxml");
});

test("document ingest worker parses Tesseract TSV into OCR blocks with bbox", async () => {
  const script = `
import importlib.util, json, sys
module_path = sys.argv[1]
tsv = sys.argv[2]
spec = importlib.util.spec_from_file_location("codmes_extract_document", module_path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
blocks = mod.parse_tesseract_tsv(tsv, path="Documents/scan.pdf", page=2, kind="pdf", image_width=1000, image_height=2000)
print(json.dumps(blocks, ensure_ascii=False))
`;
  const tsv = [
    "level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext",
    "5\t1\t1\t1\t1\t1\t100\t200\t60\t20\t96\tHello",
    "5\t1\t1\t1\t1\t2\t170\t202\t80\t18\t94\tCodmes",
    "5\t1\t1\t1\t2\t1\t100\t260\t40\t20\t90\tNext"
  ].join("\n");
  const { stdout } = await execFileAsync("python3", [
    "-c",
    script,
    path.resolve("server/workers/document-ingest/extract_document.py"),
    tsv
  ]);
  const blocks = JSON.parse(stdout);
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].text, "Hello Codmes");
  assert.equal(blocks[0].page, 2);
  assert.equal(blocks[0].bbox.x, 100);
  assert.equal(blocks[0].bbox.y, 200);
  assert.equal(blocks[0].bbox.width, 150);
  assert.equal(blocks[0].bbox.height, 20);
  assert.equal(blocks[0].bbox.normalized.x, 0.1);
  assert.equal(blocks[0].source, "ocr");
  assert.equal(blocks[0].confidence, 95);
});

async function createMinimalDocx(filePath, text) {
  const script = `
import zipfile, sys
path, text = sys.argv[1], sys.argv[2]
xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body><w:p><w:r><w:t>''' + text + '''</w:t></w:r></w:p></w:body>
</w:document>'''
with zipfile.ZipFile(path, "w") as z:
    z.writestr("[Content_Types].xml", '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>')
    z.writestr("word/document.xml", xml)
`;
  await execFileAsync("python3", ["-c", script, filePath, text]);
}
