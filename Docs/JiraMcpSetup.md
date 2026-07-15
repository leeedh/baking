# Jira MCP 연결 가이드

새 PC(Windows / macOS)에서 이 저장소를 클론했을 때 **Jira MCP(mcp-atlassian)를 연결하는 방법**과,
연결이 안 될 때 반드시 알아야 할 함정들을 정리한 문서입니다.

---

## 1. 빠른 시작 (3단계)

```bash
# ① uv 설치 (uvx 명령이 PATH에 있어야 함)
#    macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh
#    Windows (PowerShell)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

# ② .env.local 생성 후 JIRA_* 3개 값 채우기
cp .env.sample .env.local

# ③ Claude Code를 "완전히 종료 후 재시작"  ← 새 터미널에서 다시 실행
```

재시작 후 Claude Code에서 `/mcp` 를 실행해 `mcp-atlassian` 이 **connected** 인지 확인하면 끝입니다.

---

## 2. 이 문서가 필요한 이유 — 핵심 함정 ⚠️

> **Claude Code는 `.env.local` 파일을 자동으로 읽지 않습니다.**

과거 `.mcp.json`은 아래처럼 `${VAR}` 치환에 의존했습니다.

```jsonc
// ❌ 과거 설정 — 동작하지 않았음
"mcp-atlassian": {
  "command": "C:\\Users\\ldh\\.local\\bin\\uvx.exe",   // Windows 전용 절대경로
  "args": ["mcp-atlassian"],
  "env": {
    "JIRA_URL": "${JIRA_URL}",          // ← Claude Code "프로세스의 환경변수"에서만 치환됨
    "JIRA_USERNAME": "${JIRA_USERNAME}",//   .env.local 파일은 쳐다보지도 않음
    "JIRA_API_TOKEN": "${JIRA_API_TOKEN}"
  }
}
```

`.env.local`에 값이 멀쩡히 들어있어도, 그 값은 **셸 환경변수로 export된 적이 없으므로** `${JIRA_URL}`은 빈 문자열로 치환됩니다.

**가장 악질적인 부분은 실패 방식입니다:**

| 기대 | 실제 |
|---|---|
| `401 Unauthorized` 같은 인증 에러 | **조용히 빈 배열 `[]` 반환** |

즉 `jira_search_projects("dessert")` 를 호출하면 에러 없이 `[]`가 돌아옵니다.
"프로젝트가 없나 보다"라고 오해하기 딱 좋습니다. **빈 배열이 나오면 자격증명 미주입을 먼저 의심하세요.**

---

## 3. 현재 설정 (`.mcp.json`)

```json
"mcp-atlassian": {
  "command": "uvx",
  "args": ["mcp-atlassian", "--env-file", ".env.local"]
}
```

`mcp-atlassian`이 제공하는 **`--env-file` 옵션으로 `.env.local`을 직접 읽게** 한 것이 핵심입니다.

이 형태를 고른 이유:

- **`uvx` (절대경로 아님)** → Windows / macOS 어디서든 동작. 머신마다 `.mcp.json`을 수정할 필요 없음
- **`--env-file`** → `.env.local`이 **유일한 시크릿 저장소**. 토큰을 다른 파일에 복사해 둘 필요가 없어, 토큰 교체 시 한 곳만 고치면 됨
- **추가 의존성 없음** → node / `dotenv-cli` 래핑 같은 것이 필요 없음
- `.mcp.json`은 **커밋되는 파일**이므로 시크릿이 절대 들어가서는 안 됨 → 이 설정에는 값이 하나도 없음

> `.env.local` 경로는 **프로젝트 루트 기준 상대경로**입니다. MCP 서버가 프로젝트 루트를 작업 디렉터리로 기동되기 때문에 그대로 동작합니다.

---

## 4. 사전 요구사항: `uv` / `uvx`

`.mcp.json`이 `uvx`를 호출하므로 **`uvx`가 PATH에 있어야** 합니다.

```bash
uvx --version   # 확인
```

설치 위치는 macOS `~/.local/bin`, Windows `%USERPROFILE%\.local\bin` 입니다.

> ### ⚠️ 가장 흔한 함정: PATH 갱신은 재시작이 필요합니다
>
> `uv`를 방금 설치했다면, **이미 떠 있는 터미널과 Claude Code 프로세스는 옛날 PATH를 그대로 들고 있습니다.**
> 설치 디렉터리가 사용자 PATH에 정상 등록돼 있어도 `uvx: not found`가 납니다.
> → **터미널과 Claude Code를 완전히 종료했다가 다시 여세요.**

---

## 5. 환경변수 설정 (`.env.local`)

```ini
JIRA_URL=https://<your-site>.atlassian.net
JIRA_USERNAME=<Atlassian 계정 이메일>
JIRA_API_TOKEN=<API 토큰>
```

- **API 토큰 발급:** https://id.atlassian.com/manage-profile/security/api-tokens
- 토큰은 **발급 직후 한 번만** 표시됩니다. 놓쳤다면 새로 발급하세요.
- `JIRA_URL`은 `/` 없이, `https://` 포함한 사이트 루트까지만 적습니다.
- `.env.local`은 `.gitignore`의 `.env*` 규칙으로 **커밋이 차단**돼 있습니다. 안심하고 실제 값을 넣으세요.
- 시작점은 `.env.sample`을 복사하는 것입니다. (Supabase, TossPayments 등 다른 변수도 함께 들어 있습니다)

---

## 6. 연결 확인

1. **Claude Code 완전 재시작.** MCP 서버는 기동 시점에 한 번만 환경을 읽으므로, `.env.local`을 고쳤다면 재시작이 필수입니다.
2. `/mcp` → `mcp-atlassian` 상태가 **connected** 인지 확인
3. Claude에게 프로젝트 목록 조회를 시켜보고, 아래 "프로젝트 정보"와 일치하는지 확인

### MCP 없이 자격증명만 먼저 검증하고 싶다면

MCP 연결 문제인지 토큰 문제인지 분리하는 데 유용합니다.

**macOS / Linux**
```bash
set -a && . ./.env.local && set +a
curl -s -u "$JIRA_USERNAME:$JIRA_API_TOKEN" \
  -H "Accept: application/json" \
  "$JIRA_URL/rest/api/3/project/search" | jq '.values[] | {key, name}'
```

**Windows (PowerShell)**
```powershell
$e = @{}; Get-Content .env.local | Where-Object { $_ -match '^\s*JIRA_\w+\s*=' } | ForEach-Object {
  $kv = $_ -split '=', 2; $e[$kv[0].Trim()] = $kv[1].Trim()
}
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("$($e.JIRA_USERNAME):$($e.JIRA_API_TOKEN)"))
$r = Invoke-RestMethod -Uri "$($e.JIRA_URL)/rest/api/3/project/search" -Headers @{ Authorization = "Basic $b64" }
$r.values | ForEach-Object { "[$($_.key)] $($_.name)" }
```

서버 기동 로그를 직접 보고 싶다면:

```bash
uvx mcp-atlassian --env-file .env.local -v
```

정상이면 다음 두 줄이 보입니다. (stdio 서버라 그대로 대기 상태가 됩니다 — `Ctrl+C`로 종료)

```
INFO - mcp-atlassian.utils.environment - Using Jira Cloud Basic Authentication (API Token)
INFO - mcp-atlassian.server.main - Jira configuration loaded and authentication is configured.
```

---

## 7. 프로젝트 정보

| 항목 | 값 |
|---|---|
| Jira 사이트 | `https://ldhl4468.atlassian.net` |
| 프로젝트 이름 | **dessert Class** |
| 프로젝트 키 | **`DC`** |
| 이슈 수 | 0개 (2026-07-14 기준 — 빈 프로젝트) |

- JQL 예시: `project = DC ORDER BY created DESC`
- `Docs/jira-backlog-dessert-class.csv` 는 **아직 Jira에 등록되지 않은** 백로그 초안입니다.

---

## 8. 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| 조회 결과가 에러 없이 **빈 배열 `[]`** | 자격증명이 빈 값으로 주입됨 | `.env.local`의 `JIRA_*` 3개 확인 → **Claude Code 재시작** |
| MCP 서버가 `failed`, `uvx: not found` | `uvx`가 PATH에 없음 | `uv` 설치 → **터미널 + Claude Code 완전 재시작** (§4 참고) |
| `401 Unauthorized` | 토큰 만료/오타, 또는 `JIRA_USERNAME`이 이메일이 아님 | 토큰 재발급, 이메일 주소 확인 |
| `403 Forbidden` | 계정에 해당 프로젝트 권한 없음 | Jira에서 권한 확인 |
| `.env.local`을 고쳤는데 반영 안 됨 | MCP 서버는 **기동 시 1회만** 환경을 읽음 | Claude Code 재시작 |
| 자격증명은 맞는데 프로젝트가 안 보임 | 다른 Atlassian 사이트에 로그인한 토큰 | `JIRA_URL`이 맞는 사이트인지 확인 |

---

## 9. 참고: 채택하지 않은 대안들

| 방식 | 왜 채택하지 않았나 |
|---|---|
| `.claude/settings.local.json`의 `env` 블록에 값 복사 | 동작은 하지만 **토큰이 두 곳에 중복 저장**됨. 교체 시 양쪽을 고쳐야 하고, 한쪽을 놓치면 원인 찾기 어려움 |
| OS 사용자 환경변수 (`setx` / `~/.zshrc` export) | 동작하지만 **시크릿이 OS 전역**에 남고, 프로젝트 단위로 격리되지 않음. 새 PC마다 별도 설정 필요 |
| `npx dotenv-cli`로 래핑 | 동작하지만 **node + dotenv-cli 의존성**이 늘고 서버 기동이 느려짐. `mcp-atlassian`이 `--env-file`을 이미 지원하므로 불필요 |

세 방식 모두 `.env.local`을 단일 시크릿 저장소로 유지하는 현재 방식보다 나은 점이 없습니다.
