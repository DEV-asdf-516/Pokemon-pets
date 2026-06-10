import { clipboard, ipcMain } from 'electron'
import type { PetWindowManager } from '../window/pet-window-manager'
import type { JsonStore } from '../services/json-store'
import type { PetRegistry } from '../services/pet-registry'
import type { ProviderRegistry } from '../ai/provider-registry'
import type { ChatMessage, DragOffset, Settings } from '../../types'

export function registerIpc({
  windowManager,
  historyStore,
  profileStore,
  petRegistry,
  providerRegistry,
  settings,
}: {
  windowManager: PetWindowManager
  historyStore: JsonStore<ChatMessage[]>
  profileStore: JsonStore<Record<string, unknown>>
  petRegistry: PetRegistry
  providerRegistry: ProviderRegistry
  settings: Settings
}): void {
  ipcMain.on('clipboard:write', (_event, text: unknown) => {
    if (typeof text === 'string') {
      clipboard.writeText(text)
    }
  })
  ipcMain.on('window:set-ignore-mouse', (event, ignore: boolean) => {
    windowManager.setIgnoreMouseForSender(event.sender, ignore)
  })
  ipcMain.on('pet:recall', () => {
    windowManager.recallAtCursor()
  })
  ipcMain.on('pet:drag-start', (event, offset: DragOffset) => {
    windowManager.startDrag(event.sender, offset)
  })
  ipcMain.on('pet:drag-stop', () => {
    windowManager.stopDrag()
  })

  ipcMain.handle('history:load', () => historyStore.read())
  ipcMain.handle('history:save', (event, history: ChatMessage[]) => {
    const trimmed = Array.isArray(history) ? history.slice(-50) : []
    const saved = historyStore.write(trimmed)
    if (saved) {
      windowManager.broadcastExcept('history:updated', { history: trimmed }, event.sender)
    }
    return saved
  })
  ipcMain.handle('pet:load-active', () => petRegistry.load(settings.pet.active))
  ipcMain.handle('pet:profile-load', () => profileStore.read())
  ipcMain.handle('pet:nickname-save', (event, nickname: unknown) => {
    const profile = profileStore.read()
    const sanitized = typeof nickname === 'string' ? nickname.trim().slice(0, 20) : ''
    return profileStore.write({ ...profile, nickname: sanitized })
  })
  ipcMain.handle('settings:load', () => settings)

  ipcMain.on('chat:stream', async (event, payload: {
    requestId: string
    provider: string
    model: string
    messages: ChatMessage[]
  }) => {
    const requestId = payload?.requestId
    try {
      const providerId = payload.provider || settings.ai.provider
      const provider = providerRegistry.get(providerId)
      await provider.streamChat(payload, {
        onChunk: (chunk) => {
          event.sender.send('chat:chunk', { requestId, chunk })
        },
      })
      event.sender.send('chat:done', { requestId })
    } catch (error) {
      event.sender.send('chat:error', {
        requestId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  })
}
