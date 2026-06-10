import { contextBridge, ipcRenderer } from 'electron'
import type { ChatMessage, DragOffset, PetDefinition, PetProfile, PetState, Settings } from '../types'

function subscribe<T>(channel: string, listener: (payload: T) => void): () => void {
  const wrapped = (_event: Electron.IpcRendererEvent, payload: T): void => listener(payload)
  ipcRenderer.on(channel, wrapped)
  return () => ipcRenderer.removeListener(channel, wrapped)
}

contextBridge.exposeInMainWorld('petAPI', {
  clipboard: {
    writeText: (text: string): void => {
      ipcRenderer.send('clipboard:write', text)
    },
  },
  window: {
    setIgnoreMouse: (ignore: boolean): void => {
      ipcRenderer.send('window:set-ignore-mouse', ignore)
    },
  },
  history: {
    load: (): Promise<ChatMessage[]> => ipcRenderer.invoke('history:load'),
    save: (history: ChatMessage[]): Promise<boolean> => ipcRenderer.invoke('history:save', history),
    onUpdated: (listener: (payload: { history: ChatMessage[] }) => void) => subscribe('history:updated', listener),
  },
  pet: {
    loadActive: (): Promise<PetDefinition> => ipcRenderer.invoke('pet:load-active'),
    loadProfile: (): Promise<PetProfile> => ipcRenderer.invoke('pet:profile-load'),
    saveNickname: (nickname: string): Promise<boolean> => ipcRenderer.invoke('pet:nickname-save', nickname),
    onRecall: (listener: (position: { x: number; y: number }) => void) => subscribe('pet:recall', listener),
    onSetActive: (listener: (state: PetState) => void) => subscribe('pet:set-active', listener),
    startDrag: (offset: DragOffset): void => {
      ipcRenderer.send('pet:drag-start', offset)
    },
    stopDrag: (): void => {
      ipcRenderer.send('pet:drag-stop')
    },
    onDragPosition: (listener: (position: { x: number; y: number; dragging: boolean }) => void) => subscribe('pet:drag-position', listener),
    onDragStop: (listener: () => void) => subscribe('pet:drag-stop', listener),
  },
  settings: {
    load: (): Promise<Settings> => ipcRenderer.invoke('settings:load'),
  },
  chat: {
    stream: (payload: {
      requestId: string
      provider: string
      model: string
      messages: ChatMessage[]
    }): void => {
      ipcRenderer.send('chat:stream', payload)
    },
    onChunk: (listener: (payload: { requestId: string; chunk: string }) => void) => subscribe('chat:chunk', listener),
    onDone: (listener: (payload: { requestId: string }) => void) => subscribe('chat:done', listener),
    onError: (listener: (payload: { requestId: string; error: string }) => void) => subscribe('chat:error', listener),
  },
})
