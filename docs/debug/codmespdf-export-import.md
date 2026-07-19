# 편집 가능한 Codmes PDF 내보내기와 가져오기

## 왜 새 형식이 필요한가

일반 PDF에는 Codmes에서 작성한 필기, 텍스트 상자, 이미지 객체의 편집 정보가 들어 있지 않다. 필기를 PDF 화면에 합쳐서 저장하면 다른 앱에서도 보이지만, 다시 Codmes로 가져왔을 때 개별 필기를 이동하거나 지울 수 없다.

기존 방식은 PDF와 `.codmes.json` 두 파일을 따로 내보냈다. 사용자가 두 파일을 함께 보관하고 다시 함께 선택해야 하므로 다른 기기로 옮기기 불편하고, 둘 중 하나를 잃어버리기 쉬웠다.

이를 해결하기 위해 PDF와 편집 정보를 하나의 `.codmespdf` 파일로 묶는다.

## 파일 내부 구조

`.codmespdf`는 확장자만 다른 ZIP 파일이다. 내부에는 다음 세 파일만 저장한다.

```text
meeting.codmespdf
├── manifest.json
├── document.pdf
└── annotations.json
```

- `document.pdf`: 선택한 페이지를 포함한 원본 PDF
- `annotations.json`: 필기, 텍스트 상자, 이미지 객체의 편집 데이터
- `manifest.json`: 형식 버전, 제목, 생성 시각, 내부 파일명, SHA-256 체크섬

검색용 추출 결과, 썸네일, OCR, Markdown 색인은 넣지 않는다. 이 데이터는 가져온 기기에서 다시 만들 수 있는 캐시이기 때문이다. 패키지에는 다시 만들 수 없는 원본 PDF와 사용자 편집 정보만 보관한다.

## 내보내기 흐름

1. 사용자가 PDF 화면의 내보내기 메뉴에서 `Export editable Codmes PDF`를 누른다.
2. 페이지 범위가 있으면 해당 페이지만 새 PDF로 만든다.
3. 필기 데이터도 같은 페이지 범위로 자르고 페이지 번호를 새 PDF 기준으로 맞춘다.
4. Apple 클라이언트가 PDF와 필기 JSON을 서버의 `/api/file/export-codmes-pdf`로 보낸다.
5. 서버가 `manifest.json`을 만들고 세 파일을 ZIP으로 묶는다.
6. 클라이언트가 응답을 `.codmespdf` 한 파일로 저장하고 iOS 공유 화면을 연다.

일반 PDF 내보내기는 기존처럼 유지된다. 다른 PDF 앱에서 읽기만 할 파일은 일반 PDF를, 다른 기기의 Codmes에서 계속 편집할 파일은 `.codmespdf`를 선택하면 된다.

## 가져오기 흐름

가져오는 방법은 두 가지다.

1. Notes 왼쪽 사이드바의 종이클립 버튼에서 `.codmespdf`를 선택한다.
2. iPad 파일 앱에서 `.codmespdf`를 눌러 Codmes로 연다.

Apple 클라이언트는 확장자를 확인해 일반 첨부 파일과 Codmes 패키지를 자동으로 구분한다. 별도의 상자 모양 가져오기 버튼은 제거했다.

서버는 파일을 저장하기 전에 다음 순서로 검사한다.

1. 정상적인 ZIP인지 확인한다.
2. 내부 파일이 정확히 세 개인지 확인한다.
3. `format`이 `codmes-pdf`이고 지원하는 `schemaVersion`인지 확인한다.
4. `document.pdf`에 PDF 헤더가 있는지 확인한다.
5. PDF와 필기 JSON의 SHA-256 체크섬이 manifest와 같은지 확인한다.
6. 모든 검사가 끝난 뒤 PDF와 필기를 워크스페이스에 저장한다.
7. 필기의 `documentPath`를 새로 저장된 PDF 경로로 바꾼다.
8. 검색 색인을 새 기기에서 다시 생성한다.

검사에 실패하면 PDF와 필기 모두 저장하지 않는다. 저장 도중 오류가 나도 이번 가져오기에서 만든 PDF와 문서 상태 폴더를 함께 지워 반쪽짜리 문서가 남지 않게 한다.

## 같은 이름의 파일이 있을 때

기존 파일은 덮어쓰지 않는다.

```text
meeting.pdf
meeting 2.pdf
meeting 3.pdf
```

첫 번째 이름이 이미 있으면 서버가 사용 가능한 다음 이름을 자동으로 선택한다. 필기의 `documentPath`도 실제로 선택된 이름으로 기록한다.

## 이전 형식과의 호환성

예전에 내보낸 PDF와 `.codmes.json`을 종이클립에서 함께 선택하는 방식도 계속 지원한다. 새 내보내기는 항상 단일 `.codmespdf`를 사용한다.

## 관련 코드

- 패키지 생성과 검증: `server/lib/codmes-pdf-package.mjs`
- 서버 API와 원자적 복원: `server/index.mjs`
- Apple API 요청: `client/apple/Sources/Codmes/WorkspaceAPI.swift`
- 내보내기 UI와 페이지 범위 처리: `client/apple/Sources/Codmes/PDFWorkspaceView.swift`
- 통합 종이클립 가져오기: `client/apple/Sources/Codmes/FileSectionView.swift`, `WorkspaceStore.swift`
- 파일 앱 연결: `client/apple/Sources/Codmes/CodmesApp.swift`, `client/apple/App/*Info.plist`

## 확인 방법

```bash
node --test server/lib/codmes-pdf-package.test.mjs server/server-api-auth.test.mjs

cd client/apple
xcodebuild -project Codmes.xcodeproj -scheme "Codmes iOS" \
  -sdk iphonesimulator -configuration Debug CODE_SIGNING_ALLOWED=NO build
```

테스트는 정상 왕복, 내용 변조, 지원하지 않는 버전, 잘못된 ZIP, 동명 파일 가져오기, 필기 경로 재작성, 손상 파일 미생성을 확인한다.
