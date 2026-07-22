# Codmes 개발 문서

이 폴더에는 현재 코드와 함께 유지해야 하는 문서만 둔다. 완료된 마이그레이션
메모, 일회성 점검 결과, 복제된 API 설명은 Git 기록에서 확인한다.

## 분류

- [제품 범위](product.md)
- [남은 작업](roadmap.md)
- [Chat](chat.md): session, streaming, context와 approval
- [Notes와 PDF](notes.md): file tree, PDF, annotation과 플랫폼별 구현 차이
- [Code](code.md): Code surface와 code agent 흐름
- [Server](server/README.md): architecture, data와 API
- [Client](client/README.md): Apple 앱의 공통 및 플랫폼 구현
- [Search](search/README.md): 사용자 검색, 문서 추출과 LLM 검색
- [UI/UX](ui-ux/README.md): 화면과 interaction 원칙
- [실행과 검증](runbook.md)
- [Debug](debug/README.md): 재발 가능한 문제의 원인과 검증 절차

## 문서 원칙

1. 구현 상태는 코드와 테스트를 기준으로 적는다.
2. 계획은 [roadmap.md](roadmap.md)에만 적고 현행 동작과 섞지 않는다.
3. API의 최종 기준은 `server/index.mjs`, 저장 경로의 최종 기준은
   `server/lib` 구현이다.
4. 기능별 설명 안에서 공통 계약과 플랫폼 UI 차이를 분명히 구분한다.
5. 디버깅 문서는 재발 가능성이 있는 원인과 검증 절차만 보존한다.
