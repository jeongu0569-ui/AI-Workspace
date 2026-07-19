import { createHash } from "node:crypto";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

export const CODMES_PDF_FORMAT = "codmes-pdf";
export const CODMES_PDF_SCHEMA_VERSION = 1;

const PDF_ENTRY = "document.pdf";
const ANNOTATIONS_ENTRY = "annotations.json";
const MANIFEST_ENTRY = "manifest.json";
const MAX_PACKAGE_BYTES = 250 * 1024 * 1024;
const MAX_UNCOMPRESSED_BYTES = 600 * 1024 * 1024;

export function createCodmesPdfPackage({ pdfData, annotations, title, appVersion = "0.1.0", createdAt = new Date().toISOString() }) {
  const pdf = toBuffer(pdfData, "PDF");
  assertPdf(pdf);
  assertAnnotations(annotations);
  const annotationData = Buffer.from(JSON.stringify(annotations, null, 2) + "\n", "utf8");
  const manifest = {
    format: CODMES_PDF_FORMAT,
    schemaVersion: CODMES_PDF_SCHEMA_VERSION,
    title: normalizedTitle(title),
    createdAt,
    appVersion,
    files: {
      pdf: PDF_ENTRY,
      annotations: ANNOTATIONS_ENTRY
    },
    checksums: {
      [PDF_ENTRY]: sha256(pdf),
      [ANNOTATIONS_ENTRY]: sha256(annotationData)
    }
  };
  const archive = zipSync({
    [MANIFEST_ENTRY]: strToU8(JSON.stringify(manifest, null, 2) + "\n"),
    [PDF_ENTRY]: pdf,
    [ANNOTATIONS_ENTRY]: annotationData
  }, { level: 6 });
  if (archive.byteLength > MAX_PACKAGE_BYTES) invalidPackage("Codmes PDF package is too large.");
  return { data: Buffer.from(archive), manifest };
}

export function readCodmesPdfPackage(packageData) {
  const archive = toBuffer(packageData, "Codmes PDF package");
  if (!archive.length || archive.length > MAX_PACKAGE_BYTES) invalidPackage("Codmes PDF package is empty or too large.");

  let entries;
  const archiveNames = [];
  let declaredBytes = 0;
  let archiveValidationError = "";
  try {
    entries = unzipSync(archive, {
      filter(file) {
        archiveNames.push(file.name);
        declaredBytes += file.originalSize;
        if (declaredBytes > MAX_UNCOMPRESSED_BYTES) {
          archiveValidationError = "Codmes PDF package contents are too large.";
          return false;
        }
        if (![MANIFEST_ENTRY, PDF_ENTRY, ANNOTATIONS_ENTRY].includes(file.name)) {
          archiveValidationError = "Codmes PDF package has an unexpected file structure.";
          return false;
        }
        return true;
      }
    });
  } catch {
    if (archiveValidationError) invalidPackage(archiveValidationError);
    invalidPackage("Codmes PDF package is not a valid ZIP archive.");
  }
  if (archiveValidationError) invalidPackage(archiveValidationError);
  const names = Object.keys(entries);
  if (archiveNames.length !== 3 || names.length !== 3) {
    invalidPackage("Codmes PDF package has an unexpected file structure.");
  }

  let manifest;
  let annotations;
  try {
    manifest = JSON.parse(strFromU8(entries[MANIFEST_ENTRY]));
    annotations = JSON.parse(strFromU8(entries[ANNOTATIONS_ENTRY]));
  } catch {
    invalidPackage("Codmes PDF package metadata is invalid.");
  }
  validateManifest(manifest);

  const pdfData = Buffer.from(entries[PDF_ENTRY]);
  const annotationData = Buffer.from(entries[ANNOTATIONS_ENTRY]);
  assertPdf(pdfData);
  if (sha256(pdfData) !== manifest.checksums[PDF_ENTRY]
      || sha256(annotationData) !== manifest.checksums[ANNOTATIONS_ENTRY]) {
    invalidPackage("Codmes PDF package checksum verification failed.");
  }
  assertAnnotations(annotations);
  return { manifest, pdfData, annotations };
}

function validateManifest(manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    invalidPackage("Codmes PDF manifest is invalid.");
  }
  if (manifest.format !== CODMES_PDF_FORMAT) invalidPackage("This is not a Codmes PDF package.");
  if (manifest.schemaVersion !== CODMES_PDF_SCHEMA_VERSION) {
    invalidPackage(`Unsupported Codmes PDF version: ${manifest.schemaVersion ?? "unknown"}.`);
  }
  if (manifest.files?.pdf !== PDF_ENTRY || manifest.files?.annotations !== ANNOTATIONS_ENTRY) {
    invalidPackage("Codmes PDF manifest file paths are invalid.");
  }
  if (typeof manifest.checksums?.[PDF_ENTRY] !== "string"
      || typeof manifest.checksums?.[ANNOTATIONS_ENTRY] !== "string") {
    invalidPackage("Codmes PDF manifest checksums are missing.");
  }
}

function assertPdf(data) {
  if (!data.subarray(0, 1024).includes(Buffer.from("%PDF-"))) invalidPackage("Codmes PDF package does not contain a valid PDF.");
}

function assertAnnotations(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    invalidPackage("Codmes PDF annotations are invalid.");
  }
}

function normalizedTitle(value) {
  const title = String(value || "document").trim();
  return title || "document";
}

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

function toBuffer(value, label) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  invalidPackage(`${label} data is missing.`);
}

function invalidPackage(message) {
  throw Object.assign(new Error(message), { status: 400 });
}
