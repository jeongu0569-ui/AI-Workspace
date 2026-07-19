# Search 문서

- [현재 검색 구조](search-runtime.md)

Codmes에는 목적이 다른 두 검색 흐름이 있다.

- 사용자 전역 검색: 파일을 찾고 PDF page로 이동하기 위한 UI 검색
- runtime 검색: LLM이 필요한 작은 chunk를 가져오는 `codmes_search`

현재 둘 다 text index를 사용한다. embedding 설정은 보존되지만 vector 검색은
아직 구현되지 않았다.
