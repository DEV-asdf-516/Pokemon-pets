import { app, globalShortcut, screen } from 'electron'
import path from 'path'
import fs from 'fs'
import { PetWindowManager } from './window/pet-window-manager'
import { JsonStore } from './services/json-store'
import { PetRegistry } from './services/pet-registry'
import { ProviderRegistry } from './ai/provider-registry'
import { AnthropicProvider } from './ai/providers/anthropic-provider'
import { GeminiProvider } from './ai/providers/gemini-provider'
import { OllamaProvider } from './ai/providers/ollama-provider'
import { OpenAIProvider } from './ai/providers/openai-provider'
import { registerIpc } from './ipc/register-ipc'
import type { ChatMessage, Settings } from '../types'

let windowManager: PetWindowManager | null = null

function loadEnvironment(rootDir: string): void {
  const envPath = path.join(rootDir, '.env')
  const loadEnvFile = (process as unknown as { loadEnvFile?: (p: string) => void }).loadEnvFile
  if (typeof loadEnvFile === 'function') {
    try {
      loadEnvFile(envPath)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error
      }
    }
  }
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
}

app.on('second-instance', () => {
  if (windowManager) {
    windowManager.showActive()
  }
})

app.whenReady().then(() => {
  const rootDir = path.resolve(__dirname, '../..')
  loadEnvironment(rootDir)
  const settings = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'config/setting.json'), 'utf8'),
  ) as Settings

  const historyStore = new JsonStore<ChatMessage[]>(
    path.join(app.getPath('userData'), 'chat_history.json'),
    [],
  )
  const profileStore = new JsonStore<Record<string, unknown>>(
    path.join(app.getPath('userData'), 'pet_profile.json'),
    {},
  )
  const petRegistry = new PetRegistry(path.join(rootDir, 'pets'))
  const providerRegistry = new ProviderRegistry()

  providerRegistry.register(new OllamaProvider(settings.ai.ollama))
  providerRegistry.register(new OpenAIProvider(settings.ai.openai))
  providerRegistry.register(new AnthropicProvider(settings.ai.anthropic))
  providerRegistry.register(new GeminiProvider(settings.ai.gemini))

  if (process.platform === 'darwin') {
    app.dock?.hide()
  }
  windowManager = new PetWindowManager(
    rootDir,
    path.join(rootDir, 'build/preload/index.js'),
  )
  windowManager.createAll()

  registerIpc({
    windowManager,
    historyStore,
    profileStore,
    petRegistry,
    providerRegistry,
    settings,
  })

  globalShortcut.register('CommandOrControl+Shift+R', () => {
    if (windowManager) {
      windowManager.recallAtCursor()
    }
  })

  const syncWindows = (): void => {
    if (windowManager) {
      windowManager.syncDisplays()
    }
  }
  screen.on('display-added', syncWindows)
  screen.on('display-removed', syncWindows)
  screen.on('display-metrics-changed', syncWindows)
})

app.on('window-all-closed', () => app.quit())
app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  if (windowManager) {
    windowManager.destroyAll()
  }
})
