import { app, globalShortcut, screen } from 'electron'
import type { Tray } from 'electron'
import { autoUpdater } from 'electron-updater'
import path from 'path'
import fs from 'fs'
import { PetWindowManager } from './window/pet-window-manager'
import { createTray } from './tray'
import { PetScopedStore } from './services/pet-scoped-store'
import { PetRegistry } from './services/pet-registry'
import { seedUserPets } from './services/seed-user-pets'
import { ProviderRegistry } from './ai/provider-registry'
import { AnthropicProvider } from './ai/providers/anthropic-provider'
import { GeminiProvider } from './ai/providers/gemini-provider'
import { OllamaProvider } from './ai/providers/ollama-provider'
import { OpenAIProvider } from './ai/providers/openai-provider'
import { registerIpc } from './ipc/register-ipc'
import type { ChatMessage, PetProfile, Settings } from '../types'

let windowManager: PetWindowManager | null = null
let tray: Tray | null = null

function loadEnvironment(rootDir: string): void {
  const loadEnvFile = (process as unknown as { loadEnvFile?: (p: string) => void }).loadEnvFile
  if (typeof loadEnvFile !== 'function') {
    return
  }
  for (const envPath of [path.join(rootDir, '.env'), path.join(app.getPath('userData'), '.env')]) {
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

  const userSettingPath = path.join(app.getPath('userData'), 'setting.json')
  if (!fs.existsSync(userSettingPath)) {
    fs.copyFileSync(path.join(rootDir, 'config/setting.json'), userSettingPath)
  }
  const settings = JSON.parse(fs.readFileSync(userSettingPath, 'utf8')) as Settings

  const historyStore = new PetScopedStore<ChatMessage[]>(
    path.join(app.getPath('userData'), 'chat_history.json'),
    settings.pet.active,
    [],
    (value): value is ChatMessage[] => Array.isArray(value),
    'riolu',
  )
  const profileStore = new PetScopedStore<PetProfile>(
    path.join(app.getPath('userData'), 'pet_profile.json'),
    settings.pet.active,
    {},
    (value): value is PetProfile => (
      typeof value === 'object'
      && value !== null
      && !Array.isArray(value)
      && ('nickname' in value || Object.keys(value).length === 0)
    ),
    'riolu',
  )
  const userPetsDir = path.join(app.getPath('userData'), 'pets')
  seedUserPets(path.join(rootDir, 'pets'), userPetsDir)
  const petRegistry = new PetRegistry(userPetsDir)
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
  tray = createTray(rootDir, windowManager)

  registerIpc({
    windowManager,
    historyStore,
    profileStore,
    petRegistry,
    providerRegistry,
    settings,
  })

  autoUpdater.checkForUpdatesAndNotify()

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
  tray?.destroy()
  tray = null
  globalShortcut.unregisterAll()
  if (windowManager) {
    windowManager.destroyAll()
  }
})
