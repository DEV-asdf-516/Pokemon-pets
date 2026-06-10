**English** | [한국어](README.ko.md)

# Pokemon Pet

A transparent desktop pet powered by an LLM. Your Pokémon wanders around your screen and you can open a chat window to talk with it.

## Features

- **Free roaming:** The pet wanders around your screen on its own!
- **Chat:** Click the pet to open a chat window.
- **Idle chatter:** When idle, the pet will speak up on its own. Add custom lines to `idlePhrases` in `pet.json`.
- **Drag and drop:** You can drag the pet anywhere on screen.
- **Summon shortcut:** Press `Ctrl+Shift+R` (or `Cmd+Shift+R` on macOS) from any app to teleport the pet to your cursor.
- **Nickname:** Click the name in the chat titlebar to set a nickname.
- **Chat history:** Chat history is saved locally.
- **Message menu:** Right-click any message to copy, delete, or resend.

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

Ollama is the default and requires no API key. To switch providers, add the relevant key to `.env` in the project root and update your settings file.

On first launch the app copies `config/setting.json` to a user-writable location. If you need an API key (OpenAI / Anthropic / Gemini), also place a `.env` file in the same folder.

| Platform | Folder |
|---|---|
| macOS | `~/Library/Application Support/Pokemon Pet/` |
| Windows | `%APPDATA%\Pokemon Pet\` |
| Linux | `~/.config/Pokemon Pet/` |

Files: `setting.json` (provider/model config), `.env` (API keys, optional)

Full configuration reference: [docs/AI_PROVIDERS.md](docs/AI_PROVIDERS.md)

## Adding a new pet

How to add a new Pokémon:

[docs/ADDING_POKEMON.md](docs/ADDING_POKEMON.md)

## Architecture

Runtime boundaries and extension points: [ARCHITECTURE.md](ARCHITECTURE.md)

## Build

```bash
npm run dist:mac   # macOS arm64
npm run dist       # current platform
```

## Notes

- Only Riolu is included by default.
- Vibe-coded.
- The Claude and OpenAI providers have not been thoroughly tested. Please report any issues.

## Disclaimer

Pokémon and all related names, images, and sounds are trademarks of and © Nintendo / Creatures Inc. / GAME FREAK inc. This project is an unofficial fan work and is not affiliated with, endorsed by, or connected to Nintendo or The Pokémon Company in any way. All Pokémon assets used in this project are the property of their respective owners.
