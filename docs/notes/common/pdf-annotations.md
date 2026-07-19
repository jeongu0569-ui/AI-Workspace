# PDF annotation 형식

## 저장 위치와 API

```text
GET /api/file/annotations?path=Notes/example.pdf
PUT /api/file/annotations?path=Notes/example.pdf

<Workspace>/.codmes/documents/example--<path-hash>/annotations.json
```

서버는 이전 버전의 annotation 경로를 읽을 때 현재 문서 폴더로 이전한다.

## 문서 구조

```text
PDFAnnotationDocument
|- schemaVersion
|- documentPath
|- updatedAt
|- pages[]
|- objects[]
`- elements[]
```

- `pageIndex`는 0부터 시작한다.
- `inkStrokes`는 portable stroke의 기준 형식이다.
- `inkDataBase64`는 과거 PencilKit 상태를 읽기 위한 호환 field다.
- `objects`는 text와 image object를 저장한다.
- `elements`는 stroke, shape, text, image를 표현하는 공통 element model이다.

## Stroke

각 stroke에는 안정적인 id, tool, color, width, opacity와 points가 있다. point의
`x`, `y`는 page 좌상단 기준 0...1 정규화 좌표이며 pressure와 time offset은
선택값이다. 자동 보정 도형은 `shape:<kind>` tool과 보정된 points로 저장한다.

## Text와 image object

공통 field:

- `id`, `type`, `pageIndex`
- `bbox`: page-relative normalized rectangle
- `text`: text 내용 또는 OCR text
- `dataBase64`: image payload
- `metadata`: font, color, MIME type, filename, OCR 및 편집 hint

UIKit/AppKit view는 이 데이터에서 매번 만들어지는 표현 계층이다. view frame이나
gesture 상태는 저장하지 않는다.

## 저장 정책

빠른 연속 편집은 client에서 debounce한 뒤 현재 annotation 문서 전체를 PUT한다.
서버는 현재 결과만 저장하며 undo history, selection handle, 작성 중 preview는
저장하지 않는다.
