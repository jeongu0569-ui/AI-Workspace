# 실행과 검증

## 요구사항

- Node.js 22 이상
- npm
- 문서 추출 bootstrap용 Python 3.11~3.13
- Apple 앱 빌드용 Xcode

## 설치

```bash
npm install
npm link
npm run runtime:bootstrap
```

## 서버

기본 Workspace는 `~/CodmesWorkspace`, 기본 주소는 `127.0.0.1:8787`이다.

```bash
codmes serve
codmes serve --host 0.0.0.0 --port 8787 --root ~/CodmesWorkspace
```

환경 변수도 사용할 수 있다.

```bash
CODMES_WORKSPACE_ROOT="$HOME/CodmesWorkspace" \
CODMES_HOST="0.0.0.0" \
CODMES_PORT="8787" \
npm start
```

상태 확인:

```bash
codmes status
curl http://127.0.0.1:8787/api/health
curl http://127.0.0.1:8787/api/workspace
```

## 모델과 진단

```bash
codmes model
codmes model list
codmes provider list
codmes auth list
codmes doctor --deep
```

## 검색

```bash
codmes index status
codmes index search "query"
curl -X POST http://127.0.0.1:8787/api/index/rebuild
```

## 서버 검사

```bash
npm run check
```

이 명령은 JavaScript 문법 검사와 `server/**/*.test.mjs` 테스트를 실행한다.

## Apple 앱 빌드

```bash
xcodebuild \
  -project client/apple/Codmes.xcodeproj \
  -scheme "Codmes iOS" \
  -configuration Debug \
  -destination 'platform=iOS Simulator,name=iPad (A16)' \
  build CODE_SIGNING_ALLOWED=NO

xcodebuild \
  -project client/apple/Codmes.xcodeproj \
  -scheme Codmes \
  -configuration Debug \
  -destination 'platform=macOS' \
  build CODE_SIGNING_ALLOWED=NO
```

Simulator 이름은 설치된 Xcode runtime에 따라 다를 수 있다. 실제 기기에서
접속할 때는 앱 설정의 Server URL에 Mac의 LAN 또는 Tailscale 주소를 사용한다.
