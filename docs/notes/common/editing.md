# 필기 편집과 undo/redo

## Eraser

eraser는 stroke 전체만 지우지 않고 지우개 영역과 겹친 구간을 제거한다. 남은
구간은 각각 새 stroke가 된다. 자동 보정 shape를 일부 지우면 원래 handle geometry를
유지할 수 없으므로 일반 pen stroke로 변환한다.

## Lasso

lasso는 stroke와 text/image object를 함께 선택할 수 있다. 선택 상태에는 page,
stroke/object ids, bounds와 options 위치가 들어간다. 이동, 색 변경, text 크기 변경,
삭제는 선택된 id 집합에 적용한다.

## Undo와 redo

- client memory에 최대 80개의 annotation snapshot을 유지한다.
- 편집이 확정될 때 이전 snapshot을 undo stack에 넣고 redo stack을 비운다.
- undo/redo 결과도 일반 편집과 동일하게 서버에 저장한다.
- 앱 재실행 후에는 history를 복원하지 않고 마지막 저장 결과부터 시작한다.

live stroke point, selection handle 이동 중간값처럼 아직 확정되지 않은 UI 상태는
history에 넣지 않는다.
