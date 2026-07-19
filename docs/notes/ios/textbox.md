# iOS와 iPadOS 텍스트 박스

text tool로 page를 누르면 `PDFAnnotationObject(type: text)`와 inline `UITextView`
overlay를 만든다. 새 빈 draft는 편집을 끝내면 삭제한다.

## 상호작용

- tap: 선택
- double tap: inline 편집
- 선택한 box drag: 이동
- 좌우 handle drag: 너비 조절
- 빈 page tap: 선택 해제

object 이동과 resize는 PDF-level gesture가 먼저 판별한다. 그래야 `UITextView`의
selection gesture나 PDF scroll이 같은 touch를 가져가지 않는다. 이동 중에는
scroll을 잠시 잠그고 handle을 숨긴 뒤 확정 위치에서 다시 만든다.

너비를 수동 조절하면 `metadata.manualWidth=true`를 저장하고 `sizeThatFits`로
wrapped text 높이를 다시 계산한다. content, normalized bbox, font size, color만
공통 annotation에 저장하며 UIKit view 상태는 저장하지 않는다.
