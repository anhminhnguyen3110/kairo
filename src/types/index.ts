export type LlmProvider = 'OPENAI' | 'CLAUDE' | 'GEMINI' | 'OPENAI_COMPATIBLE';

export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL';

export type FileStatus = 'PENDING' | 'PROCESSED' | 'FAILED';

export type ArtifactType =
  | 'html'
  | 'react'
  | 'mermaid'
  | 'drawio'
  | 'svg'
  | 'code'
  | 'markdown'
  | 'file';

export type TimeFrame = 'today' | 'yesterday' | 'previous7Days' | 'previous30Days' | 'older';

export interface User {
  id: number;
  email: string;
  timezone?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse extends AuthTokens {
  user: User;
}

export interface Thread {
  id: number;
  userId: number;
  title: string;
  llmProvider: LlmProvider;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  timeFrame?: TimeFrame;
  lastMessage?: string | null;
  messageCount?: number;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: unknown;
}

export interface Message {
  id: number;
  threadId: number;
  role: MessageRole;
  content: string;

  toolCalls: { calls: ToolCall[] } | ToolCall[] | null;
  metadata: Record<string, unknown> | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;

  artifacts?: Artifact[];
}

export interface FileAttachment {
  id: number;
  threadId: number;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  extractedText: string | null;
  status: FileStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Artifact {
  id: string;
  type: ArtifactType;
  title: string;
  content: string;
  language?: string;
  messageId: number;
}

export interface AttachmentMeta {
  fileId?: number;
  name: string;
  sizeBytes: number;
  mimeType: string;
}

export interface StreamingArtifactMeta {
  type: ArtifactType;
  title: string;
  language?: string;
}

export type SSEEventType =
  | 'ping'
  | 'meta'
  | 'token'
  | 'tool_start'
  | 'tool_end'
  | 'artifact'
  | 'streaming_complete'
  | 'done'
  | 'error'
  | 'message_start'
  | 'content_block_start'
  | 'content_block_delta'
  | 'content_block_stop'
  | 'message_delta'
  | 'message_limit'
  | 'message_stop';

export interface SSEMetaEvent {
  type: 'meta';
  data: { threadId: number; messageId: number; title?: string };
}

export interface SSEPingEvent {
  type: 'ping';
  data: { timestamp: number };
}

export interface SSETokenEvent {
  type: 'token';
  data: { token: string };
}

export interface SSEToolStartEvent {
  type: 'tool_start';
  data: { tool: string; input: unknown };
}

export interface SSEToolEndEvent {
  type: 'tool_end';
  data: { tool: string; output: unknown };
}

export interface SSEArtifactEvent {
  type: 'artifact';
  data: {
    type: 'html' | 'code' | 'markdown';
    title: string;
    language: string | null;
    content: string;
  };
}

export interface SSEDoneEvent {
  type: 'done';
  data: {
    content: string;
    messageId: number;
    toolCalls: ToolCall[] | null;
  };
}

export interface SSEErrorEvent {
  type: 'error';
  data: { error: string };
}

export interface SSEMessageStartEvent {
  type: 'message_start';
  message: {
    id: string;
    role: string;
    model?: string;
    uuid?: string;
    parent_uuid?: string | null;
    thread_id?: number;
    content: unknown[];
    stop_reason: string | null;
    stop_sequence?: string | null;
    trace_id?: string;
    request_id?: string;
  };
}

export interface SSEContentBlockStartEvent {
  type: 'content_block_start';
  index: number;
  content_block: {
    type: string;

    text?: string;
    citations?: unknown[];

    thinking?: string;
    start_timestamp?: string;
    stop_timestamp?: string | null;
    flags?: null;
    summaries?: unknown[];
    cut_off?: boolean;
    alternative_display_type?: string | null;

    name?: string;
    id?: string;
    input?: unknown;
  };
}

export interface SSEContentBlockDeltaEvent {
  type: 'content_block_delta';
  index: number;
  delta: {
    type: string;

    text?: string;

    thinking?: string;

    summary?: { summary: string };

    partial_json?: string;
  };
}

export interface SSEContentBlockStopEvent {
  type: 'content_block_stop';
  index: number;
  stop_timestamp?: string;
}

export interface SSEMessageLimitEvent {
  type: 'message_limit';
  message_limit: {
    type: string;
    resetsAt: string | null;
    remaining: number | null;
    perModelLimit: unknown | null;
  };
}

export interface SSEMessageDeltaEvent {
  type: 'message_delta';
  delta: { stop_reason: string; stop_sequence: string | null };
}

export interface SSEMessageStopEvent {
  type: 'message_stop';
  thread_id?: number;
  message_id?: number;
}

export interface SSEStreamingCompleteEvent {
  type: 'streaming_complete';
}

export type SSEEvent =
  | SSEPingEvent
  | SSEMetaEvent
  | SSETokenEvent
  | SSEToolStartEvent
  | SSEToolEndEvent
  | SSEArtifactEvent
  | SSEDoneEvent
  | SSEErrorEvent
  | SSEMessageStartEvent
  | SSEContentBlockStartEvent
  | SSEContentBlockDeltaEvent
  | SSEContentBlockStopEvent
  | SSEMessageDeltaEvent
  | SSEMessageLimitEvent
  | SSEMessageStopEvent
  | SSEStreamingCompleteEvent;

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    hasMore: boolean;
    nextCursor?: string;
  };
}

export interface CursorPaginationParams {
  limit?: number;
  cursor?: string;
  search?: string;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}
