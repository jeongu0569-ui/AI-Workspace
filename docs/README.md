# Codmes 개발 문서

이 폴더에는 현재 코드와 함께 유지해야 하는 문서만 둔다. 완료된 마이그레이션
메모, 일회성 점검 결과, 복제된 API 설명은 Git 기록에서 확인한다.

## 시작점

- [제품 범위](product.md)
- [아키텍처](architecture.md)
- [데이터와 저장 경로](data-model.md)
- [HTTP 및 WebSocket API](api-contract.md)
- [Apple 클라이언트](apple-client.md)
- [실행과 검증](runbook.md)
- [남은 작업](roadmap.md)

## 기능별 문서

- [Notes와 PDF](notes/README.md)
  - `common`: iOS와 macOS가 공유하는 데이터 및 동작
  - `ios`: iPhone과 iPad 전용 UI 및 입력 처리
  - `macos`: macOS 전용 UI 및 입력 처리
- [Search](search/README.md)
- [문제 해결 기록](debug/)

## 문서 원칙

1. 구현 상태는 코드와 테스트를 기준으로 적는다.
2. 계획은 [roadmap.md](roadmap.md)에만 적고 현행 동작과 섞지 않는다.
3. API의 최종 기준은 `server/index.mjs`, 저장 경로의 최종 기준은
   `server/lib` 구현이다.
4. 플랫폼 공통 계약과 플랫폼 UI 구현을 분리한다.
5. 디버깅 문서는 재발 가능성이 있는 원인과 검증 절차만 보존한다.
