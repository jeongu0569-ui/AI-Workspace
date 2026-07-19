# 편집 가능한 Codmes PDF

일반 PDF export는 필기를 page에 평탄화하므로 다른 기기에서 stroke, text box,
image object를 다시 편집할 수 없다. Codmes는 `.codmespdf` package로 원본 PDF와
annotation을 함께 이동한다.

## 내부 형식

`.codmespdf`는 다음 세 파일만 포함하는 ZIP container다.

```text
manifest.json
document.pdf
annotations.json
```

manifest에는 format/schema version, 원래 이름과 각 entry checksum이 있다.
가져올 때 entry 목록, 크기, PDF signature, JSON schema, checksum을 모두 검증한다.

## 내보내기

Apple 앱이 server export API를 호출하면 서버가 Workspace의 PDF와 최신
`annotations.json`을 package로 만든다. Share sheet 또는 macOS save flow로 다른
기기에 전달할 수 있다.

## 가져오기

Apple 앱에서 `.codmespdf`를 열거나 첨부하면 server import API가 package를
검증한 후 PDF와 문서별 annotation 상태를 함께 생성한다. 같은 이름이 있으면
기존 파일을 덮어쓰지 않고 충돌하지 않는 이름을 선택한다. 중간 단계가 실패하면
이번 import에서 만든 파일과 상태를 함께 정리한다.

일반 ZIP의 확장자만 바꾼 파일과 지원하지 않는 미래 schema는 거부한다.
