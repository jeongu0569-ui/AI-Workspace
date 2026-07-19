# 도형 인식

Codmes는 pen stroke를 그린 뒤 잠시 유지하면 line, polyline, rectangle, triangle,
circle, ellipse 후보를 계산한다. 인식이 통과하면 보정된 points를 가진
`shape:<kind>` stroke로 저장하고 resize handle을 제공한다.

## 구현

- recognizer: `PDFShapeRecognizer.swift`
- exemplar bank: `PDFShapeExemplarBank.swift`
- sample store: `PDFShapeSampleStore.swift`
- replay corpus: `shape-recognition-quickdraw-samples.jsonl`

기하 규칙과 exemplar 결과가 모두 품질 기준을 통과해야 한다. 외부 sample은 앱
runtime에서 내려받지 않고 저장소의 고정 corpus로 replay하여 결과 변화를 검토한다.
샘플을 추가할 때는 expected kind, 원본 points와 source를 보존하고 개인 문서의
실제 필기나 민감한 좌표를 corpus에 넣지 않는다.
