# Notes와 PDF 문서

Notes 문서는 플랫폼 공통 계약과 플랫폼별 UI 구현을 분리한다.

## Common (공통)

- [구조와 파일 종류](common/overview.md)
- [PDF annotation 형식](common/pdf-annotations.md)
- [저장, 이동, 삭제와 검색 연동](common/sync-and-search.md)
- [편집 가능한 Codmes PDF 내보내기/가져오기](common/codmespdf.md)
- [필기 편집과 undo/redo](common/editing.md)
- [도형 인식](common/shape-recognition.md)

## iOS와 iPadOS

- [PDF 읽기와 페이지 이동](ios/pdf-reader.md)
- [텍스트 박스](ios/textbox.md)

## macOS

- [PDF 읽기와 페이지 이동](macos/pdf-reader.md)
- [텍스트 박스](macos/textbox.md)

## 코드 위치

- PDF UI와 입력: `client/apple/Sources/Codmes/PDFWorkspaceView.swift`
- annotation model: `client/apple/Sources/Codmes/Models.swift`
- 파일 트리: `client/apple/Sources/Codmes/FileSectionView.swift`
- API client: `client/apple/Sources/Codmes/WorkspaceAPI.swift`
- annotation/파일 API: `server/index.mjs`
- 문서별 상태: `server/lib/document-ingest.mjs`
- 검색: `server/lib/search-service.mjs`
