# 대용량 PDF sidebar thumbnail 지연 문제

## 증상

수백 page PDF에서 main PDF는 1 page에 둔 채 sidebar를 300 page 부근까지 빠르게
scroll하면 thumbnail이 1분 이상 흰 배경으로 남았다. sidebar를 닫았다 다시 열면
뒤늦게 표시되기도 했다.

## 원인

핵심 문제는 server render 속도보다 request 시작 위치였다. thumbnail cell마다
`.task`를 두어 loading을 시작했기 때문에 빠른 scroll 중 생성과 재사용이 반복되면
현재 visible cell의 request가 늦게 시작되거나 이전 page 작업 뒤에서 기다렸다.

또한 local 원본 PDF와 remote streaming PDF의 thumbnail 경로가 달랐다. 초기 수정은
remote request만 개선해, 실제 iPad에 원본이 local cache로 남아 있던 테스트에서는
사용감이 달라지지 않았다.

## 수정

1. sidebar가 visible page를 한곳에서 수집하도록 바꿨다.
2. visible range 중앙 page를 먼저 처리하고 나머지 visible page와 앞뒤 2 page를
   이어서 요청한다.
3. scroll 위치가 크게 바뀌면 오래된 대기 작업을 취소한다.
4. local PDFKit render와 remote server thumbnail 모두 같은 scheduler를 사용한다.
5. server는 연결이 끊기면 Python renderer를 중단하고, 완성 파일만 cache에 남긴다.

즉, main PDF current page가 1이어도 sidebar가 300 page를 보고 있다면 300 page
주변 thumbnail부터 만들어진다.

## 확인 방법

1. 500MB 안팎의 수백 page PDF를 iPad Simulator 또는 실제 iPad에서 연다.
2. main PDF는 첫 page에 둔 채 page sidebar를 연다.
3. sidebar를 300 page 부근으로 빠르게 scroll한다.
4. 현재 화면 중앙 thumbnail부터 loading되는지 확인한다.
5. 위아래로 다시 빠르게 이동해 이전 위치의 request가 새 위치를 막지 않는지
   확인한다.

테스트할 때 원본 PDF가 local cache에 있는지 remote streaming 중인지도 함께
확인해야 한다. 두 경로 모두 같은 visible-range 우선순위를 따라야 한다.
