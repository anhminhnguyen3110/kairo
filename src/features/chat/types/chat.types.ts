import type { AttachmentMeta, LlmProvider } from '@/types';

export type StreamingStatus = 'idle' | 'streaming' | 'saving' | 'error';

export interface StreamingToolEvent {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: unknown;
  status: 'pending' | 'done';
}

export interface PendingMessage {
  content: string;
  attachments: AttachmentMeta[];
  fileIds?: number[];
}

export interface SendOptions {
  threadId?: number;
  message: string;
  onNewThread?: (threadId: number) => void;
  files?: File[];
  fileIds?: number[];
}

export interface SendMessagePayload {
  threadId?: number;
  message: string;
  stream?: boolean;
}

export interface ModelInfo {
  id: string;
  owned_by?: string;
}

export interface ProviderModels {
  provider: LlmProvider;
  label: string;
  configured: boolean;
  models: ModelInfo[];
}

export interface ModelSelection {
  provider: LlmProvider;
  model: string;
  providerLabel: string;
}

export interface TavilyResult {
  title?: string;
  url?: string;
  content?: string;
  score?: number;
}

export interface TavilyResponse {
  query?: string;
  results?: TavilyResult[];
  answer?: string;
}
