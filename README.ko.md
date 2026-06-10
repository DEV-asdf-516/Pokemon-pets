[English](README.md) | **한국어**

# Riolu Pet

LLM으로 구동되는 투명 데스크탑 펫입니다. 포켓몬이 화면을 돌아다니고, 채팅창을 열어 대화할 수 있습니다.

## 요구 사항

- Node.js 18+
- npm
- AI 프로바이더 (Ollama는 로컬에서 API 키 없이 실행 가능; OpenAI / Anthropic / Gemini는 키 필요)

## 설치 및 실행

```bash
npm install
npm start
```

## AI 프로바이더

기본값은 Ollama이며 API 키가 필요 없습니다. 프로바이더를 변경하려면 프로젝트 루트의 `.env` 파일에 해당 키를 추가하고 `config/setting.json`을 수정하세요.

전체 설정 가이드: [docs/AI_PROVIDERS.ko.md](docs/AI_PROVIDERS.ko.md)

## 새 펫 추가하기

애플리케이션 코드를 변경하지 않고 새 캐릭터 팩을 만드는 절차:

[docs/ADDING_POKEMON.ko.md](docs/ADDING_POKEMON.ko.md)

## 아키텍처

런타임 경계 및 확장 포인트: [ARCHITECTURE.ko.md](ARCHITECTURE.ko.md)

## 빌드

```bash
npm run dist:mac   # macOS arm64
npm run dist       # 현재 플랫폼
```
