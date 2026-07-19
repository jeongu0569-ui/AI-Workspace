# Notes 공통 구조

## 지원 파일

- Markdown과 text: 읽기, 편집, 저장
- PDF: 읽기, 페이지 이동, 필기와 text/image object 편집
- 이미지와 일반 문서: 첨부, 미리보기 또는 metadata 표시
- `.codmespdf`: PDF와 편집 가능한 annotation을 한 파일로 이동

Notes 파일은 기본적으로 `<Workspace>/Notes`에 둔다. 필기와 index를 Notes 안의
숨김 폴더에 섞지 않고 `<Workspace>/.codmes/documents/<document-key>`에 모은다.

## 파일 탐색기

Apple 앱은 전체 계층을 재귀 tree로 표시한다. 폴더는 같은 화면에서 여러 개를
펼칠 수 있고 펼침 상태가 유지된다. 선택한 파일은 강조한다. context menu는
copy, rename, delete 등을 제공하며 여러 항목을 선택해 한 번에 처리할 수 있다.
파일을 폴더 위로 drag and drop하면 서버의 move API를 호출한다.

## PDF 편집 도구

- pen과 eraser
- lasso 선택과 이동
- 선, 꺾은선, 사각형, 삼각형, 원, 타원 자동 보정
- text box
- image object
- annotation inspector
- undo와 redo
- annotated PDF 및 editable Codmes PDF export
- 다른 PDF page 삽입

공통 데이터는 Apple view나 gesture 객체를 저장하지 않는다. 모든 위치는 PDF
page 기준 좌표로 변환해 다른 화면 크기에서도 동일하게 보이도록 한다.
