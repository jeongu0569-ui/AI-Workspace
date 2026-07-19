# iPad에서 PDF 이동 후 검색 키보드가 닫히는 문제

## 문제 요약

iPad에서 아래 순서로 앱을 사용하면 두 번째 검색 중 키보드가 갑자기
내려가는 문제가 있었다.

1. 검색을 열고 첫 번째 검색어를 입력한다.
2. 검색 결과의 PDF 미리보기 페이지를 선택한다.
3. PDF 화면으로 이동한 뒤 검색을 다시 연다.
4. 검색창을 누르고 글자를 입력한다.
5. 검색창의 포커스가 풀리면서 키보드가 내려간다.

첫 번째 검색은 정상이고 PDF를 연 뒤의 두 번째 검색에서만 발생한다는
점이 원인을 찾는 중요한 단서였다.

## 먼저 알아둘 개념: First Responder

iOS에는 `firstResponder`라는 개념이 있다. 쉽게 말하면 현재 키보드 입력을
받을 권한을 가진 화면 요소다.

- 검색창이 `firstResponder`이면 입력한 글자가 검색창에 들어간다.
- PDF 안의 텍스트 편집기가 `firstResponder`이면 입력한 글자가 PDF
  텍스트에 들어간다.
- 한 번에 하나의 화면 요소만 이 권한을 가질 수 있다.

어떤 뷰가 `becomeFirstResponder()`를 호출하면 기존에 입력받던 뷰는
권한을 잃는다. 검색창이 이 권한을 잃으면 iPadOS는 더 이상 검색창에
키보드가 필요하지 않다고 판단해 키보드를 내릴 수 있다.

## 실제 원인

PDF 화면은 [PDFWorkspaceView.swift](../../client/apple/Sources/Codmes/PDFWorkspaceView.swift)의
`AnnotatedPDFKitView`를 통해 UIKit의 `PDFView`와 PencilKit의
`PKCanvasView`를 사용한다.

문제가 있던 코드는 PDF 도구를 적용할 때 펜 또는 지우개 캔버스에 매번
포커스를 요청했다.

```swift
case .pen:
    canvas.tool = PKInkingTool(...)
    canvas.becomeFirstResponder()
case .eraser:
    canvas.tool = PKEraserTool(...)
    canvas.becomeFirstResponder()
```

이 코드만 보면 PDF를 사용하는 동안에는 자연스러워 보인다. 하지만
`applyTool(to:)`은 사용자가 PDF를 직접 누를 때만 실행되는 함수가 아니다.
SwiftUI가 UIKit 뷰를 동기화하는 `updateUIView`에서도 호출된다.

두 번째 검색에서 발생한 순서는 다음과 같다.

1. PDF 검색 결과를 열어 PDF 화면이 메인 화면에 남는다.
2. 그 위에 검색 화면이 `fullScreenCover`로 표시된다.
3. 사용자가 검색창을 누르면 검색창이 `firstResponder`가 되고 키보드가
   열린다.
4. 글자를 입력하면 실시간 검색 상태인 `WorkspaceStore`가 변경된다.
5. `WorkspaceStore`를 관찰하는 뒤쪽 PDF 화면도 다시 갱신된다.
6. PDF의 `updateUIView`가 도구 설정을 다시 적용한다.
7. 화면 뒤에 가려진 `PKCanvasView`가 `becomeFirstResponder()`를 호출한다.
8. 검색창이 입력 권한을 잃고 키보드가 내려간다.

첫 번째 검색에서는 아직 PDF 화면이 뒤에 없으므로 포커스를 빼앗을
`PKCanvasView`도 없다. 그래서 PDF를 한 번 연 뒤부터 문제가 나타났다.

## 해결 방법

PDF의 펜 입력은 PencilKit 캔버스 자체의 입력 처리 대신
`PDFImmediateDrawingGestureRecognizer`라는 커스텀 제스처가 담당한다.
따라서 펜과 지우개 도구를 설정하기 위해 `PKCanvasView`가 키보드 입력
권한까지 가질 필요가 없었다.

수정 후에는 도구만 설정하고 캔버스에 포커스를 요청하지 않는다. 이전
상태에서 캔버스가 포커스를 가지고 있다면 명시적으로 해제한다.

```swift
private func applyTool(to canvas: PKCanvasView) {
    canvas.isUserInteractionEnabled = false

    switch tool {
    case .pen:
        canvas.tool = PKInkingTool(...)
    case .eraser:
        canvas.tool = PKEraserTool(...)
    case .lasso:
        canvas.tool = PKLassoTool()
    case .text:
        break
    }

    if canvas.isFirstResponder {
        canvas.resignFirstResponder()
    }
}
```

이제 검색 상태가 변경되어 뒤쪽 PDF의 `updateUIView`가 실행되더라도
PDF 캔버스는 검색창의 포커스를 빼앗지 않는다.

## 왜 이 수정이 PDF 필기를 망가뜨리지 않는가

현재 PDF 필기 입력은 다음 흐름으로 처리된다.

1. `PDFImmediateDrawingGestureRecognizer`가 Apple Pencil 또는 터치 이동을
   감지한다.
2. 진행 중인 획을 PDF 위의 드로잉 오버레이에 표시한다.
3. 입력이 끝나면 좌표를 PDF 페이지 좌표로 변환한다.
4. 완성된 획을 주석 데이터로 저장한다.

이 과정에는 `PKCanvasView.becomeFirstResponder()`가 필요하지 않다. 즉,
불필요한 키보드 포커스 요청만 제거했고 실제 필기 이벤트 경로는 변경하지
않았다.

## 검증 방법

수정 후 다음 항목을 확인한다.

- 첫 검색에서 검색어를 계속 입력해도 키보드가 유지된다.
- PDF 미리보기 페이지를 연 뒤 두 번째 검색에서도 키보드가 유지된다.
- 검색 결과가 실시간으로 갱신될 때도 검색창 포커스가 유지된다.
- PDF 읽기 모드에서 스크롤과 확대/축소가 정상 동작한다.
- PDF 필기 모드에서 펜, 지우개, 올가미가 정상 동작한다.
- PDF 텍스트 도구는 편집할 때 정상적으로 키보드를 연다.

코드 수준에서는 아래 빌드로 iOS와 macOS 컴파일을 확인했다.

```bash
xcodebuild -project client/apple/Codmes.xcodeproj \
  -scheme "Codmes iOS" \
  -configuration Debug \
  -destination "generic/platform=iOS Simulator" \
  CODE_SIGNING_ALLOWED=NO build

swift build --package-path client/apple
```

## 비슷한 문제를 디버깅할 때 확인할 것

키보드가 예상치 못하게 내려가면 키보드 코드만 찾지 말고 포커스를
가져가는 코드를 함께 확인해야 한다.

```bash
rg "becomeFirstResponder|resignFirstResponder|FocusState|focused" client/apple
```

특히 `UIViewRepresentable.updateUIView` 안에서 아래 동작을 반복하지 않는지
확인한다.

- `becomeFirstResponder()` 호출
- 현재 입력 중인 뷰와 관계없는 `resignFirstResponder()` 호출
- 입력 뷰를 조건에 따라 새 뷰로 교체하는 코드
- 검색 결과나 네트워크 응답 때마다 전체 화면을 갱신하는 상태 변경

화면에 보이지 않는 뷰도 SwiftUI 상태 변경에 따라 업데이트될 수 있다.
따라서 포커스 변경처럼 사용자 입력에 직접 영향을 주는 작업은
`updateUIView`에서 무조건 실행하지 말고, 실제로 포커스가 필요한 순간인지
조건을 명확하게 확인해야 한다.
