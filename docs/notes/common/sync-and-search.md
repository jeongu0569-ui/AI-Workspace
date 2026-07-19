# Annotation 동기화와 검색

## 문서 lifecycle

서버 API를 통한 파일 작업은 PDF와 문서 상태를 함께 처리한다.

- move/rename: 문서 상태 폴더와 manifest의 source path 갱신
- copy: 새 path hash를 가진 상태 폴더로 annotation 복사
- delete: 문서 상태와 검색 항목 제거
- PDF page 삽입: binary 교체, annotation page index 조정, 문서 재색인

이 규칙 때문에 annotation과 extraction을 사용자 PDF 옆에 흩어 놓지 않고 하나의
문서 상태 폴더에 둔다.

## 추출 상태

```text
.codmes/documents/<document-key>/
|- annotations.json
|- manifest.json
`- index/
   |- extraction.json
   |- content.md
   `- annotation-ocr/
```

`extraction.json`은 page, bbox, source 등 구조화된 검색 metadata를 보존한다.
`content.md`는 표를 포함한 사람이 읽기 쉬운 추출 결과다. 현재 검색 index는
구조화 JSON을 사용하며 `content.md`는 향후 RAG 또는 점검에 사용할 수 있는 파생
파일이다. 즉 Markdown을 생성한다고 해서 현재 LLM이 그 파일을 직접 읽는 것은
아니다.

## 검색에 포함되는 annotation

- text object: `annotation-text`
- OCR text가 있는 image object: `annotation-image-ocr`
- PDF 원문: `pdf-text` 또는 문서 extractor가 만든 block
- VLM으로 읽은 page image: `vlm-ocr`

image content hash가 같으면 OCR cache를 재사용한다. 위치만 이동하거나 크기를
바꾼 경우 OCR을 다시 하지 않고 page/bbox metadata만 갱신한다.

handwriting `inkStrokes`는 현재 OCR하지 않으므로 검색 대상이 아니다.
