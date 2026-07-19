# 제품 범위

Codmes는 서버가 소유하는 하나의 Workspace에서 채팅, 노트, PDF, 검색, 코드
작업을 함께 다루는 애플리케이션이다. Apple 앱은 Workspace 파일을 직접
마운트하지 않고 Codmes Server API를 사용하는 클라이언트다.

## 현재 제공 범위

- `Chat`: 세션, 모델 선택, 스트리밍 응답, 도구 실행과 승인
- `Notes`: 트리형 파일 탐색기, Markdown 편집, 첨부파일, PDF 열람과 필기
- `Code`: 소스 탐색과 편집, 코드 작업, 패치, 검사, 제한된 Git 명령
- `Search`: 파일명과 본문, PDF/Office 추출 내용, 대화 검색
- `Runtime`: provider/model/auth 설정, MCP, skills, security policy

## 소유권 원칙

- 사용자 파일은 `<Workspace>/Notes`, `Code`, `Documents`, `Attachments`에 둔다.
- 앱 상태는 `<Workspace>/.codmes`에 둔다.
- 클라이언트에는 Workspace 절대 경로를 노출하지 않는다.
- 파일 이동, 복사, 삭제 시 문서별 필기와 추출 상태도 서버가 함께 처리한다.
- 작은 현재 파일은 직접 읽고, 큰 문서나 넓은 범위는 검색 결과만 문맥에 넣는다.

## 현재 경계

- Apple 클라이언트는 macOS, iPhone, iPad를 지원한다.
- Windows와 Android용 PDF 필기 UI는 없지만 공통 annotation JSON은 플랫폼에
  종속되지 않게 설계되어 있다.
- 검색은 텍스트 기반 chunk 검색이다. embedding 설정은 저장하지만 벡터 생성과
  semantic ranking은 아직 구현되지 않았다.
- 필기 stroke는 검색 가능한 텍스트로 변환하지 않는다.
- Code 화면은 완전한 IDE, 디버거 또는 로컬 기기 터미널을 제공하지 않는다.
