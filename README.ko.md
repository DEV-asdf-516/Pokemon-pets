[English](README.md) | **한국어**

# Pokemon Pet

LLM으로 구동되는 투명 데스크탑 펫입니다. 포켓몬이 화면을 돌아다니고, 채팅창을 열어 대화할 수 있습니다.

## 기능

- **자유 이동:** 포켓몬이 화면을 혼자 돌아다닙니다!
- **채팅:** 포켓몬을 클릭하면 대화 가능한 채팅창이 열립니다.
- **혼잣말:** 아무 동작도 하지 않는 경우, 사용자에게 먼저 말을 걸기도 합니다. `pet.json`의 `idlePhrases`에 원하는 문구를 추가하세요.
- **드래그 앤 드롭:**  포켓몬을 드래그 할 수 있습니다.
- **소환 단축키:** 어느 앱에서나 `Ctrl+Shift+R` (macOS는 `Cmd+Shift+R`)을 누르면 커서 위치로 소환
- **닉네임 변경:**  채팅창 타이틀바의 이름을 클릭하면 닉네임을 설정할 수 있습니다.
- **대화 기록 저장:** 채팅 내역이 로컬에 저장됩니다.
- **메시지 메뉴:** 메시지를 우클릭하면 복사·삭제·재전송이 가능합니다.

## 요구 사항

- Node.js 18+
- npm
- AI 프로바이더 (Ollama는 / OpenAI / Anthropic / Gemini 중 택 일)

## 설치 및 실행

```bash
npm install
npm start
```

## AI 프로바이더

기본값은 Ollama라서 API 키가 필요 없습니다. 

다른 프로바이더로 바꾸려면 프로젝트 루트의 `.env` 파일에 키를 넣고 설정 파일을 수정하세요.

첫 실행 시 `config/setting.json`이 아래 경로로 복사됩니다. 설치 후에는 이 파일을 직접 편집하세요.

| 플랫폼 | 경로 |
|---|---|
| macOS | `~/Library/Application Support/Pokemon Pet/setting.json` |
| Windows | `%APPDATA%\Pokemon Pet\setting.json` |
| Linux | `~/.config/Pokemon Pet/setting.json` |

전체 설정 가이드: [docs/AI_PROVIDERS.ko.md](docs/AI_PROVIDERS.ko.md)

## 새로운 포켓몬 추가하기

새 포켓몬을 추가하는 방법:

[docs/ADDING_POKEMON.ko.md](docs/ADDING_POKEMON.ko.md)

## 아키텍처

런타임 경계와 확장 포인트: [ARCHITECTURE.ko.md](ARCHITECTURE.ko.md)

## 빌드

```bash
npm run dist:mac   # macOS arm64
npm run dist       # 현재 플랫폼
```

## 참고 사항
- 기본 제공 펫은 현재 리오르 하나입니다.
- 바이브 코딩입니다.
- Claude와 OpenAI 프로바이더는 아직 충분히 테스트하지 못했습니다. 문제가 생기면 이슈로 알려 주세요.

## 면책 조항

포켓몬 및 관련 이름·이미지·사운드의 저작권은 Nintendo / Creatures Inc. / GAME FREAK inc.에 있습니다. 이 프로젝트는 비공식 팬 제작물이며 Nintendo 또는 The Pokémon Company와 일체 관련이 없습니다. 사용된 모든 포켓몬 에셋의 권리는 해당 저작권자에게 있습니다.