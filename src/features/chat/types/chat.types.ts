import type { AttachmentMeta, LlmProvider } from '@/types';

// ─── Streaming ────────────────────────────────────────────────────────────────

export type StreamingStatus = 'idle' | 'streaming' | 'error';

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

// ─── Send / API ───────────────────────────────────────────────────────────────

/** Options accepted by useStream().send() */
export interface SendOptions {
  threadId?: number;
  message: string;
  onNewThread?: (threadId: number) => void;
  files?: File[];
  /** Pre-uploaded file IDs (takes precedence over `files` when provided) */
  fileIds?: number[];
}

export interface SendMessagePayload {
  threadId?: number;
  message: string;
  stream?: boolean;
}

// ─── Models ───────────────────────────────────────────────────────────────────

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

// ─── Tool Events ─────────────────────────────────────────────────────────────

/** Shape of a single search result from the Tavily web-search tool. */
export interface TavilyResult {
  title?: string;
  url?: string;
  content?: string;
  score?: number;
}

/** Top-level response object from the Tavily web-search tool. */
export interface TavilyResponse {
  query?: string;
  results?: TavilyResult[];
  answer?: string;
}
