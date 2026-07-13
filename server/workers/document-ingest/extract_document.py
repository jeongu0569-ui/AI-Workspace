#!/usr/bin/env python3
"""Codmes document extraction worker.

This worker is intentionally dependency-light. It uses Python stdlib first, and
automatically upgrades extraction quality when optional tools are installed:

- LibreOffice/soffice: office and HWP/HWPX/PPT/PPTX -> PDF -> text
- openpyxl/xlrd: spreadsheet extraction
- tesseract + pdftoppm: image/scanned-PDF OCR

The Node server owns scheduling, caching, and indexing. This script only turns
one workspace file into normalized JSON text blocks.
"""

from __future__ import annotations

import argparse
import base64
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET


IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tif", ".tiff", ".heic"}
OFFICE_EXTS = {".doc", ".docx", ".ppt", ".pptx", ".hwp", ".hwpx", ".odt", ".odp"}
SHEET_EXTS = {".xlsx", ".xls"}
SUPPORTED_ZIP_EXTS = {".zip", ".pdf", ".hwpx", ".hwp", ".xlsx", ".xls", ".ppt", ".pptx", ".doc", ".docx", *IMAGE_EXTS}
HWPX_PARA_NS = "{http://www.hancom.co.kr/hwpml/2011/paragraph}"


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract text for Codmes Search.")
    parser.add_argument("--input", required=True)
    parser.add_argument("--relative", default="")
    parser.add_argument("--max-zip-members", type=int, default=int(os.getenv("CODMES_EXTRACT_MAX_ZIP_MEMBERS", "40")))
    parser.add_argument("--max-zip-depth", type=int, default=int(os.getenv("CODMES_EXTRACT_MAX_ZIP_DEPTH", "2")))
    args = parser.parse_args()

    input_path = Path(args.input)
    relative = args.relative or input_path.name
    try:
        result = extract_path(input_path, relative, args)
        print(json.dumps(result, ensure_ascii=False))
        return 0
    except Exception as exc:  # Keep stdout valid JSON for Node callers.
        print(json.dumps({
            "schemaVersion": 1,
            "path": relative,
            "kind": kind_for_path(relative),
            "text": "",
            "blocks": [],
            "warnings": [f"{type(exc).__name__}: {exc}"],
            "extractor": "codmes-document-worker",
        }, ensure_ascii=False))
        return 0


def extract_path(path: Path, relative: str, args: argparse.Namespace) -> dict[str, Any]:
    data = path.read_bytes()
    return extract_bytes(data, relative, args, depth=0)


def extract_bytes(data: bytes, name: str, args: argparse.Namespace, depth: int) -> dict[str, Any]:
    ext = Path(name.lower()).suffix
    warnings: list[str] = []
    blocks: list[dict[str, Any]] = []

    if ext == ".pdf":
        text, pdf_blocks, pdf_warnings = extract_pdf(data, name)
        blocks.extend(pdf_blocks)
        warnings.extend(pdf_warnings)
    elif ext in IMAGE_EXTS:
        text, warning = image_to_text(data, ext)
        if warning:
            warnings.append(warning)
        if text:
            blocks.append(block(name, text, source="ocr", page=None, kind="image"))
    elif ext == ".hwpx":
        text = hwpx_to_text(data)
        if text:
            blocks.append(block(name, text, source="hwpx", page=None, kind="document"))
    elif ext == ".hwp":
        text, warning = office_or_hwp_to_text(data, name)
        if warning:
            warnings.append(warning)
        if text:
            blocks.append(block(name, text, source="office", page=None, kind="document"))
    elif ext in {".docx", ".pptx"}:
        text = openxml_to_text(data, name)
        warning = None
        if not text:
            text, warning = office_to_text(data, name)
        if warning:
            warnings.append(warning)
        if text:
            blocks.append(block(name, text, source="openxml" if warning is None else "office", page=None, kind="document"))
    elif ext in {".doc", ".ppt", ".odt", ".odp"}:
        text, warning = office_to_text(data, name)
        if warning:
            warnings.append(warning)
        if text:
            blocks.append(block(name, text, source="office", page=None, kind="document"))
    elif ext == ".xlsx":
        text, warning = xlsx_to_text(data)
        if warning:
            warnings.append(warning)
        if text:
            blocks.append(block(name, text, source="spreadsheet", page=None, kind="spreadsheet"))
    elif ext == ".xls":
        text, warning = xls_to_text(data)
        if warning:
            warnings.append(warning)
        if text:
            blocks.append(block(name, text, source="spreadsheet", page=None, kind="spreadsheet"))
    elif ext == ".zip":
        text, zip_blocks, zip_warnings = zip_to_text(data, name, args, depth)
        blocks.extend(zip_blocks)
        warnings.extend(zip_warnings)
    else:
        text = data.decode("utf-8", "ignore")
        if text.strip():
            blocks.append(block(name, text, source="text", page=None, kind="file"))

    normalized = normalize_text(text)
    if not blocks and normalized:
        blocks.append(block(name, normalized, source="text", page=None, kind=kind_for_path(name)))

    return {
        "schemaVersion": 1,
        "path": name,
        "kind": kind_for_path(name),
        "text": normalized,
        "blocks": blocks,
        "warnings": warnings,
        "extractor": "codmes-document-worker",
    }


def extract_pdf(data: bytes, name: str) -> tuple[str, list[dict[str, Any]], list[str]]:
    warnings: list[str] = []
    blocks: list[dict[str, Any]] = []
    text = extract_pdf_literals(data)
    page_count = estimate_pdf_pages(data)
    if text:
        blocks.append(block(name, text, source="pdf-text", page=None, kind="pdf", metadata={"pageCount": page_count}))
        return text, blocks, warnings

    ocr_text, ocr_warnings = ocr_pdf_bytes(data)
    warnings.extend(ocr_warnings)
    if ocr_text:
        for page_number, page_text in enumerate(ocr_text, start=1):
            if page_text.strip():
                blocks.append(block(name, page_text, source="ocr", page=page_number, kind="pdf"))
        return "\n\n".join(ocr_text).strip(), blocks, warnings

    return "", blocks, warnings or ["No text layer found and OCR tools were unavailable or returned no text."]


def extract_pdf_literals(data: bytes) -> str:
    raw = data.decode("latin1", "ignore")
    pieces: list[str] = []
    for match in re.finditer(r"\((?:\\.|[^\\)])*\)", raw):
        value = decode_pdf_literal(match.group(0)[1:-1])
        if looks_like_text(value):
            pieces.append(value)
    return normalize_text("\n".join(pieces))


def decode_pdf_literal(value: str) -> str:
    value = (
        value.replace("\\n", "\n")
        .replace("\\r", "\n")
        .replace("\\t", "\t")
        .replace("\\b", "\b")
        .replace("\\f", "\f")
        .replace("\\(", "(")
        .replace("\\)", ")")
        .replace("\\\\", "\\")
    )
    return re.sub(r"\\([0-7]{1,3})", lambda m: chr(int(m.group(1), 8)), value)


def estimate_pdf_pages(data: bytes) -> int | None:
    matches = re.findall(rb"/Type\s*/Page\b", data)
    return len(matches) if matches else None


def ocr_pdf_bytes(data: bytes) -> tuple[list[str], list[str]]:
    warnings: list[str] = []
    pdftoppm = shutil.which("pdftoppm")
    tesseract = shutil.which("tesseract")
    if not pdftoppm or not tesseract:
        return [], ["OCR skipped: pdftoppm and/or tesseract not found."]
    with tempfile.TemporaryDirectory(prefix="codmes-pdf-ocr-") as tmp:
        tmp_path = Path(tmp)
        pdf_path = tmp_path / "input.pdf"
        pdf_path.write_bytes(data)
        prefix = tmp_path / "page"
        result = subprocess.run(
            [pdftoppm, "-png", "-r", os.getenv("CODMES_OCR_DPI", "160"), str(pdf_path), str(prefix)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=int(os.getenv("CODMES_PDF_RENDER_TIMEOUT_SECONDS", "90")),
            check=False,
        )
        if result.returncode != 0:
            return [], [f"pdftoppm failed: {result.stderr.strip() or result.stdout.strip()}"]
        texts: list[str] = []
        for image in sorted(tmp_path.glob("page-*.png")):
            page_text, warning = image_path_to_text(image)
            if warning:
                warnings.append(warning)
            texts.append(page_text)
        return texts, warnings


def image_to_text(data: bytes, ext: str) -> tuple[str, str | None]:
    tesseract = shutil.which("tesseract")
    if not tesseract:
        return "", "OCR skipped: tesseract not found."
    with tempfile.TemporaryDirectory(prefix="codmes-image-ocr-") as tmp:
        image_path = Path(tmp) / f"image{ext if ext != '.heic' else '.png'}"
        image_path.write_bytes(data)
        return image_path_to_text(image_path)


def image_path_to_text(image_path: Path) -> tuple[str, str | None]:
    langs = os.getenv("CODMES_OCR_LANGS", "kor+eng")
    result = subprocess.run(
        [shutil.which("tesseract") or "tesseract", str(image_path), "stdout", "-l", langs],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        timeout=int(os.getenv("CODMES_OCR_TIMEOUT_SECONDS", "60")),
        check=False,
    )
    if result.returncode != 0:
        return "", f"tesseract failed for {image_path.name}: {result.stderr.strip()}"
    return normalize_text(result.stdout), None


def hwpx_to_text(data: bytes) -> str:
    parts: list[str] = []
    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        names = sorted(name for name in zf.namelist() if name.startswith("Contents/section") and name.endswith(".xml"))
        for name in names:
            root = ET.fromstring(zf.read(name))
            for item in root.iter(f"{HWPX_PARA_NS}t"):
                if item.text:
                    parts.append(item.text)
    return normalize_text("\n".join(parts))


def office_or_hwp_to_text(data: bytes, filename: str) -> tuple[str, str | None]:
    text, warning = office_to_text(data, filename)
    if text:
        return text, warning
    fallback = hwp_ole_strings_to_text(data)
    if fallback:
        return fallback, warning
    return "", warning or "HWP extraction failed."


def openxml_to_text(data: bytes, filename: str) -> str:
    ext = Path(filename.lower()).suffix
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as zf:
            if ext == ".docx":
                names = ["word/document.xml"]
            elif ext == ".pptx":
                names = sorted(name for name in zf.namelist() if name.startswith("ppt/slides/slide") and name.endswith(".xml"))
            else:
                return ""
            parts: list[str] = []
            for name in names:
                if name not in zf.namelist():
                    continue
                root = ET.fromstring(zf.read(name))
                texts = [
                    node.text or ""
                    for node in root.iter()
                    if (node.tag.endswith("}t") or node.tag == "t") and node.text
                ]
                if texts:
                    if ext == ".pptx":
                        parts.append(f"[Slide: {Path(name).stem}]\n" + "\n".join(texts))
                    else:
                        parts.append("\n".join(texts))
            return normalize_text("\n\n".join(parts))
    except Exception:
        return ""


def office_to_text(data: bytes, filename: str) -> tuple[str, str | None]:
    soffice = find_soffice()
    if not soffice:
        return "", "LibreOffice/soffice not found."
    suffix = Path(filename).suffix or ".bin"
    with tempfile.TemporaryDirectory(prefix="codmes-office-") as tmp:
        tmp_path = Path(tmp)
        input_path = tmp_path / f"input{suffix}"
        input_path.write_bytes(data)
        out_dir = tmp_path / "out"
        out_dir.mkdir()
        cmd = [
            soffice,
            "--headless",
            "--nologo",
            "--nofirststartwizard",
            "--nodefault",
            "--norestore",
            "--convert-to",
            "pdf",
            input_path.name,
            "--outdir",
            str(out_dir),
        ]
        result = subprocess.run(
            cmd,
            cwd=input_path.parent,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=int(os.getenv("CODMES_LIBREOFFICE_TIMEOUT_SECONDS", "90")),
            check=False,
        )
        if result.returncode != 0:
            return "", f"LibreOffice conversion failed: {result.stderr.strip() or result.stdout.strip()}"
        pdf = out_dir / "input.pdf"
        if not pdf.exists():
            candidates = list(out_dir.glob("*.pdf"))
            pdf = candidates[0] if candidates else pdf
        if not pdf.exists():
            return "", "LibreOffice conversion did not produce a PDF."
        text, _blocks, warnings = extract_pdf(pdf.read_bytes(), filename)
        return text, "; ".join(warnings) if warnings else None


def find_soffice() -> str | None:
    configured = os.getenv("LIBREOFFICE_BIN")
    candidates = [
        configured,
        shutil.which("soffice"),
        shutil.which("libreoffice"),
        "/Applications/LibreOffice.app/Contents/MacOS/soffice",
    ]
    return next((candidate for candidate in candidates if candidate and Path(candidate).exists()), None)


def hwp_ole_strings_to_text(data: bytes) -> str:
    decoded = data.decode("utf-16le", "ignore")
    runs: list[str] = []
    pattern = r"[\uAC00-\uD7A3A-Za-z0-9\s().,/%·\\-:]{3,}"
    for match in re.finditer(pattern, decoded):
        text = " ".join(match.group(0).split())
        if any("가" <= ch <= "힣" for ch in text):
            runs.append(text)
    return normalize_text("\n".join(dict.fromkeys(runs)))


def xlsx_to_text(data: bytes) -> tuple[str, str | None]:
    try:
        import openpyxl  # type: ignore
    except Exception:
        return xlsx_to_text_minimal(data), "openpyxl not found; used minimal XLSX XML extractor."
    workbook = openpyxl.load_workbook(io.BytesIO(data), data_only=True, read_only=True)
    out: list[str] = []
    for sheet in workbook.worksheets:
        out.append(f"[Sheet: {sheet.title}]")
        headers: list[str] | None = None
        rows: list[list[str]] = []
        for row in sheet.iter_rows(values_only=True):
            cells = trim_empty_tail(["" if value is None else str(value).strip() for value in row])
            if any(cell.strip() for cell in cells):
                rows.append(cells)
        for index, row in enumerate(rows):
            if headers is None and looks_like_header(row, rows[index + 1:index + 4]):
                headers = dedupe_headers(row)
                out.append("[표 헤더] " + " | ".join(headers))
                continue
            row_text = " | ".join(cell for cell in row if cell)
            if row_text:
                out.append(("[행] " if headers else "") + row_text)
        out.append(f"[End Sheet: {sheet.title}]")
    return normalize_text("\n".join(out)), None


def xlsx_to_text_minimal(data: bytes) -> str:
    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        shared: list[str] = []
        if "xl/sharedStrings.xml" in zf.namelist():
            root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
            for si in root.iter():
                if si.tag.endswith("}si") or si.tag == "si":
                    text = "".join(t.text or "" for t in si.iter() if t.tag.endswith("}t") or t.tag == "t")
                    shared.append(text)
        parts: list[str] = []
        for name in sorted(n for n in zf.namelist() if n.startswith("xl/worksheets/sheet") and n.endswith(".xml")):
            parts.append(f"[Sheet: {Path(name).stem}]")
            root = ET.fromstring(zf.read(name))
            for row in root.iter():
                if not (row.tag.endswith("}row") or row.tag == "row"):
                    continue
                values: list[str] = []
                for cell in row:
                    if not (cell.tag.endswith("}c") or cell.tag == "c"):
                        continue
                    cell_type = cell.attrib.get("t")
                    value = ""
                    for child in cell:
                        if child.tag.endswith("}v") or child.tag == "v":
                            value = child.text or ""
                    if cell_type == "s" and value.isdigit() and int(value) < len(shared):
                        value = shared[int(value)]
                    if value:
                        values.append(value)
                if values:
                    parts.append(" | ".join(values))
        return normalize_text("\n".join(parts))


def xls_to_text(data: bytes) -> tuple[str, str | None]:
    try:
        import xlrd  # type: ignore
    except Exception:
        return "", "xlrd not found; XLS extraction skipped."
    book = xlrd.open_workbook(file_contents=data)
    out: list[str] = []
    for sheet in book.sheets():
        out.append(f"[Sheet: {sheet.name}]")
        headers: list[str] | None = None
        rows: list[list[str]] = []
        for row_index in range(sheet.nrows):
            cells = trim_empty_tail([
                "" if sheet.cell_value(row_index, col) is None else str(sheet.cell_value(row_index, col)).strip()
                for col in range(sheet.ncols)
            ])
            if any(cell.strip() for cell in cells):
                rows.append(cells)
        for index, row in enumerate(rows):
            if headers is None and looks_like_header(row, rows[index + 1:index + 4]):
                headers = dedupe_headers(row)
                out.append("[표 헤더] " + " | ".join(headers))
                continue
            row_text = " | ".join(cell for cell in row if cell)
            if row_text:
                out.append(("[행] " if headers else "") + row_text)
        out.append(f"[End Sheet: {sheet.name}]")
    return normalize_text("\n".join(out)), None


def zip_to_text(data: bytes, name: str, args: argparse.Namespace, depth: int) -> tuple[str, list[dict[str, Any]], list[str]]:
    if depth > args.max_zip_depth:
        return "", [], ["ZIP depth limit reached."]
    texts: list[str] = []
    blocks: list[dict[str, Any]] = []
    warnings: list[str] = []
    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        members = [item for item in zf.infolist() if not item.is_dir() and "__MACOSX/" not in item.filename and not Path(item.filename).name.startswith(".")]
        handled = 0
        for item in members:
            if handled >= args.max_zip_members:
                warnings.append(f"ZIP member limit reached: {args.max_zip_members}/{len(members)}")
                break
            ext = Path(item.filename.lower()).suffix
            if ext not in SUPPORTED_ZIP_EXTS:
                continue
            handled += 1
            child_name = f"{name}/{item.filename}"
            try:
                extracted = extract_bytes(zf.read(item), child_name, args, depth + 1)
                child_text = extracted.get("text") or ""
                if child_text:
                    labelled = f"[압축 내부 파일: {item.filename}]\n{child_text}"
                    texts.append(labelled)
                    blocks.extend(extracted.get("blocks") or [block(child_name, labelled, source="zip", page=None, kind=kind_for_path(child_name))])
                warnings.extend(extracted.get("warnings") or [])
            except Exception as exc:
                warnings.append(f"{item.filename}: {type(exc).__name__}: {exc}")
    return normalize_text("\n\n".join(texts)), blocks, warnings


def block(path: str, text: str, *, source: str, page: int | None, kind: str, metadata: dict[str, Any] | None = None) -> dict[str, Any]:
    return {
        "path": path,
        "kind": kind,
        "source": source,
        "page": page,
        "text": normalize_text(text),
        "bbox": None,
        "confidence": None,
        "metadata": metadata or {},
    }


def trim_empty_tail(cells: list[str]) -> list[str]:
    end = len(cells)
    while end > 0 and not cells[end - 1].strip():
        end -= 1
    return cells[:end]


def looks_like_header(row: list[str], following: list[list[str]]) -> bool:
    if len([cell for cell in row if cell.strip()]) < 2:
        return False
    if not following:
        return True
    numeric_below = 0
    checked = 0
    for next_row in following:
        for cell in next_row:
            if not cell:
                continue
            checked += 1
            if re.fullmatch(r"[-+]?\d+(?:\.\d+)?", cell.replace(",", "")):
                numeric_below += 1
    return checked == 0 or numeric_below >= max(1, checked // 4)


def dedupe_headers(row: list[str]) -> list[str]:
    seen: dict[str, int] = {}
    headers: list[str] = []
    for index, cell in enumerate(row):
        base = cell.strip() or f"열{index + 1}"
        seen[base] = seen.get(base, 0) + 1
        headers.append(base if seen[base] == 1 else f"{base}_{seen[base]}")
    return headers


def kind_for_path(path: str) -> str:
    ext = Path(path.lower()).suffix
    if ext == ".pdf":
        return "pdf"
    if ext in IMAGE_EXTS:
        return "image"
    if ext in SHEET_EXTS:
        return "spreadsheet"
    if ext in OFFICE_EXTS:
        return "document"
    if ext == ".zip":
        return "archive"
    return "file"


def looks_like_text(value: str) -> bool:
    normalized = re.sub(r"\s+", " ", value or "").strip()
    if len(normalized) < 2:
        return False
    printable = sum(1 for char in normalized if char in "\n\r\t" or (ord(char) >= 32 and ord(char) != 127))
    return printable / max(len(normalized), 1) > 0.8


def normalize_text(text: str) -> str:
    return re.sub(r"\n{3,}", "\n\n", re.sub(r"[ \t]+\n", "\n", str(text or ""))).strip()


if __name__ == "__main__":
    raise SystemExit(main())
