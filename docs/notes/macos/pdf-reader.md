# macOS PDF 읽기

`MacAnnotatedPDFKitView`가 AppKit `PDFView`를 감싼다. iOS와 같은 vertical
`singlePageContinuous` 모드와 공통 기본 배율 계산을 사용한다.

- 한 page 전체와 이웃 page 일부를 표시한다.
- window 크기가 바뀌면 viewport에 맞춰 기본/최소 배율을 다시 계산한다.
- 최소값 아래로 magnify한 뒤 gesture가 끝나면 반동 없이 `easeOut`으로 복귀한다.
- page sidebar는 toolbar 아래 왼쪽에서 열리고 PDF는 오른쪽 공간에 맞춰 이동한다.
- thumbnail을 누르면 해당 page로 이동한다.

마우스와 trackpad event는 `CodmesMacPDFView`가 처리한다. write mode에서는
stroke, eraser, lasso, object 이동과 resize를 판별하고, 그 외에는 PDFKit 기본
scroll/zoom event로 전달한다.
