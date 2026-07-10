# Rename To Codmes

Codmes는 이전에 AI Workspace라는 이름으로 개발되던 프로젝트입니다. 이번 rename의 목적은 제품 이름, CLI, 서버 로그, 기본 상태 디렉터리, 문서 예시를 하나의 이름으로 정리하는 것입니다.

## 새 이름

- 제품명: Codmes
- 저장소명: Codmes
- 기본 CLI: `codmes`
- 서버명: Codmes Server
- 런타임명: Codmes Runtime
- 기본 Workspace 예시: `~/CodmesWorkspace`
- 상태 디렉터리: `<Workspace>/.codmes/`
- 환경 변수 prefix: `CODMES_`

## GitHub 저장소 Rename

문서는 다음 저장소 URL을 기준으로 작성합니다.

```bash
git clone https://github.com/jeongu0569-ui/Codmes.git
cd Codmes
```

로컬 코드 수정만으로 GitHub 저장소 이름은 바뀌지 않습니다. 저장소 소유자는 GitHub에서 직접 변경해야 합니다.

```text
GitHub Repository Settings
-> General
-> Repository name
-> Codmes
```

GitHub는 기존 URL redirect를 제공하지만, README badge와 clone 예시는 최종 이름인 `Codmes`를 기준으로 유지합니다.

## CLI Migration

새 기본 명령은 `codmes`입니다.

```bash
codmes serve
codmes status
codmes doctor
codmes model
codmes provider list
codmes auth list
codmes sessions list
codmes tasks list
codmes approvals list
codmes index status
codmes code create Code/demo "작업 설명"
```

기존 사용자를 위해 `aiw`와 `ai-workspace`는 deprecated alias로 유지합니다. 자동화 스크립트가 즉시 깨지지 않도록 같은 진입점을 사용하지만, 새 문서와 새 스크립트에는 `codmes`를 사용하세요.

## Environment Variables

새 변수는 `CODMES_` prefix를 사용합니다.

```bash
CODMES_WORKSPACE_ROOT="$HOME/CodmesWorkspace"
CODMES_HOST="127.0.0.1"
CODMES_PORT="8787"
CODMES_SERVER_TOKEN="충분히-긴-개인용-토큰"
CODMES_OPENAI_API_KEY="..."
CODMES_OLLAMA_BASE_URL="http://127.0.0.1:11434"
CODMES_LMSTUDIO_BASE_URL="http://127.0.0.1:1234/v1"
CODMES_CUSTOM_BASE_URL="http://127.0.0.1:1234/v1"
CODMES_CUSTOM_API_KEY="..."
```

기존 `AIW_*` 변수는 fallback으로 읽습니다. 새 변수와 기존 변수가 동시에 설정되면 `CODMES_*`가 우선합니다.

## State Directory Migration

새 상태 디렉터리는 `<Workspace>/.codmes/`입니다.

마이그레이션 규칙:

- `.codmes/`가 있으면 그대로 사용합니다.
- `.codmes/`가 없고 `.ai-workspace/`만 있으면 `.codmes/`로 안전하게 rename합니다.
- 둘 다 없으면 `.codmes/`를 새로 만듭니다.
- 둘 다 있으면 자동으로 덮어쓰지 않고 conflict 상태를 보고합니다.

인증 정보와 OAuth token은 `.codmes/config/` 아래에 저장될 수 있습니다. 이 디렉터리를 공개 Git 저장소에 커밋하지 마세요.

## Runtime Bootstrap Migration

새 런타임 디렉터리는 저장소 루트의 `.codmes-runtime/`입니다.

기존 `.aiw-runtime/`만 있으면 bootstrap 과정에서 `.codmes-runtime/`으로 옮깁니다. 이미 `.codmes-runtime/`이 있으면 기존 runtime을 덮어쓰지 않습니다.

## Existing Workspace Paths

문서의 새 기본 예시는 `~/CodmesWorkspace`입니다. 하지만 사용자가 이미 `~/AIWorkspace` 또는 다른 경로를 `CODMES_WORKSPACE_ROOT`나 기존 `AIW_WORKSPACE_ROOT`로 지정했다면 그 경로를 계속 사용할 수 있습니다.

Workspace 데이터 경로는 제품 이름과 독립적으로 명시 설정을 우선합니다.

## Apple App

앱 표시 이름과 Xcode project/scheme은 Codmes 기준으로 변경되었습니다.

```bash
cd client/apple
xcodebuild -project Codmes.xcodeproj -scheme Codmes -destination 'platform=macOS' build
xcodebuild -project Codmes.xcodeproj -scheme 'Codmes iOS' -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
```

Bundle identifier는 자동으로 바꾸지 않습니다. Bundle identifier를 바꾸면 앱 업데이트 연속성, 서명, Keychain 접근에 영향이 있을 수 있습니다.

Keychain service 이름은 기존 사용자 token 보존을 위해 내부적으로 이전 이름을 유지할 수 있습니다. 사용자 화면에는 Codmes로 표시됩니다.

## Rollback

문제가 생기면 먼저 서버를 끄고 Workspace를 백업하세요.

```bash
cp -a "$HOME/CodmesWorkspace" "$HOME/CodmesWorkspace.backup"
```

`.codmes/`가 새로 만들어졌고 이전 `.ai-workspace/`가 별도 백업으로 남아 있다면, 두 디렉터리를 비교한 뒤 수동으로 되돌릴 수 있습니다. 자동 마이그레이션은 기존 데이터를 삭제하지 않는 방향으로 설계되어 있지만, 실제 인증 파일이나 세션 데이터가 있는 Workspace에는 항상 백업 후 작업하세요.

