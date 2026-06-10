**English** | [한국어](README.ko.md)

# Riolu Pet

A transparent desktop pet powered by an LLM. Riolu wanders around your screen and you can open a chat window to talk with it.

## Requirements

- Node.js 18+
- npm
- An AI provider (Ollama runs locally with no API key; OpenAI / Anthropic / Gemini require keys)

## Setup

```bash
npm install
npm start
```

## AI provider

Ollama is the default and requires no API key. To switch providers, add the relevant key to `.env` in the project root and update `config/setting.json`.

Full configuration reference: [docs/AI_PROVIDERS.md](docs/AI_PROVIDERS.md)

## Adding a new pet

A reproducible procedure for creating a new character pack without changing application code:

[docs/ADDING_POKEMON.md](docs/ADDING_POKEMON.md)

## Architecture

Runtime boundaries and extension points: [ARCHITECTURE.md](ARCHITECTURE.md)

## Build

```bash
npm run dist:mac   # macOS arm64
npm run dist       # current platform
```
