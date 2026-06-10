import type { ChatMessage } from './chat.js'

export interface StreamRequest {
  messages: ChatMessage[]
  model: string
}

export interface StreamHandlers {
  onChunk: (chunk: string) => void
}

export interface Provider {
  readonly id: string
  streamChat(request: StreamRequest, handlers: StreamHandlers): Promise<void>
}

export interface OllamaConfig {
  baseUrl: string
  model: string
  options?: Record<string, unknown>
}

export interface OpenAIConfig {
  baseUrl: string
  apiKeyEnv: string
  model: string
  maxOutputTokens: number
  temperature: number
}

export interface AnthropicConfig {
  baseUrl: string
  apiKeyEnv: string
  model: string
  maxOutputTokens: number
  temperature: number
  apiVersion: string
}

export interface GeminiConfig {
  baseUrl: string
  apiKeyEnv: string
  model: string
  maxOutputTokens: number
  temperature: number
}

export interface AiSettings {
  provider: string
  ollama: OllamaConfig
  openai: OpenAIConfig
  anthropic: AnthropicConfig
  gemini: GeminiConfig
}
