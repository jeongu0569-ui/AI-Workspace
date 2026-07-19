# iOS와 iPadOS PDF 읽기

## 표시

`AnnotatedPDFKitView`가 UIKit `PDFView`를 감싼다. 표시 모드는 vertical
`singlePageContinuous`이며 page 사이에 작은 간격을 둔다.

초기 읽기 배율은 고정 숫자가 아니라 viewport와 현재 PDF page 크기로 계산한다.
page 높이 약 88%, 너비 최대 약 94% 안에서 전체 page가 잘리지 않는 작은 값을
선택한다. 첫 page에서는 다음 page가, 중간 page에서는 위아래 page가 일부 보인다.

화면 회전이나 Split View처럼 viewport가 바뀌면 새 기본 배율을 계산하고 현재
page를 다시 중앙에 맞춘다.

## 최소 축소 배율

기본 읽기 배율이 사용자가 머무를 수 있는 최소값이다. pinch 중에는 확인을 위해
그보다 조금 더 축소할 수 있지만 손을 놓으면 UIKit의 고무줄 반동 없이 짧은
`easeInOut` 보간으로 기본 배율에 복귀한다.

## Page sidebar

상단 왼쪽 thumbnail icon을 누르면 toolbar 아래에서 page sidebar가 열린다.
iPhone은 overlay로 표시하고, iPad에서는 PDF canvas도 오른쪽 가용 공간 쪽으로
이동한다. thumbnail은 화면 너비에 맞춰 1열 또는 2열을 사용한다. page를 누르면
해당 page가 중앙에 오고 sidebar 선택 상태가 갱신된다.

## 입력 정책

- iPad: Apple Pencil은 필기, finger는 기본적으로 scroll/zoom
- iPhone: write mode에서 한 finger 필기, 두 finger scroll/zoom
- read mode: PDFKit 기본 navigation 사용

text/image/shape handle과 선택 gesture가 시작된 경우 PDF scroll보다 object 편집을
우선한다.
