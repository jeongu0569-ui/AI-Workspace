# macOS 텍스트 박스

macOS는 공통 `PDFAnnotationObject`를 `MacPDFTextView` (`NSTextView`) overlay로
표현한다. text tool로 page를 클릭하면 draft object를 만들고 바로 편집을 시작한다.
빈 상태로 편집을 끝내면 draft를 삭제한다.

## 상호작용

- click: 선택
- double click 또는 edit command: inline 편집
- 선택한 object drag: 이동
- 좌우 handle drag: 너비 조절

resize와 move hit test는 `CodmesMacPDFView`가 먼저 처리한다. `NSTextView`와 PDF
scroll이 drag를 선점하는 문제를 피하기 위해서다. 수동 너비는
`metadata.manualWidth`, text 높이는 AppKit text layout 측정값으로 갱신한다.

AppKit-specific selection과 responder 상태는 저장하지 않는다. content, bbox,
font size, color, draft/manual-width metadata만 공통 annotation에 반영한다.
