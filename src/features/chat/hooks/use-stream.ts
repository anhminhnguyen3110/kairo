'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createSseStream, ApiClientError } from '@/lib/api-client';
import { useChatStore } from '@/stores/chat-store';
import { useModelStore } from '@/stores/model-store';
import { useUiStore } from '@/stores/ui-store';
import { useArtifactStore } from '@/stores/artifact-store';
import type { SSEEvent, Message } from '@/types';
import { getMessagesQueryKey } from './use-messages';
import { THREADS_QUERY_KEY } from '@/features/threads/hooks/use-threads';
import { filesApi } from '@/features/files/api/files-api';
import type { SendOptions } from '../types/chat.types';

export function useStream() {
  const qc = useQueryClient();
  const router = useRouter();
  const {
    startStream,
    appendToken,
    addToolEvent,
    updateToolEvent,
    updateToolEventThinking,
    appendToolInput,
    addStreamingArtifactId,
    finalizeStream,
    setStreamError,
    addOptimisticMessage,
    clearOptimisticMessages,
    setStreamingSessionId,
    setFileAttachments,
  } = useChatStore();
  const { selection } = useModelStore();
  const { webSearchEnabled } = useUiStore();
  const { addArtifact, openArtifact, setArtifacts } = useArtifactStore();

  const send = async ({
    threadId,
    message,
    onNewThread,
    files,
    fileIds: preloadedFileIds,
  }: SendOptions) => {
    const abortController = new AbortController();
    startStream(abortController);

    // Upload any raw File objects BEFORE streaming so we have numeric IDs ready
    let resolvedFileIds: number[] | undefined = preloadedFileIds;
    const uploadedAttachments = files?.map((f) => ({
      name: f.name,
      sizeBytes: f.size,
      mimeType: f.type,
    }));
    if (files?.length && threadId && !preloadedFileIds?.length) {
      const uploadResults: Awaited<ReturnType<typeof filesApi.upload>>[] = [];
      for (const f of files) {
        try {
          const result = await filesApi.upload(threadId, f);
          uploadResults.push(result);
        } catch (err) {
          console.warn('[send] File upload failed', f.name, err);
        }
      }
      if (uploadResults.length > 0) {
        resolvedFileIds = uploadResults.map((u) => u.id);
        setFileAttachments(
          threadId,
          message,
          uploadResults.map((u) => ({
            fileId: u.id,
            name: u.originalName,
            sizeBytes: u.sizeBytes,
            mimeType: u.mimeType,
          })),
        );
        void qc.invalidateQueries({ queryKey: ['files', threadId] });
      }
    }

    const optimisticMsg: Message = {
      id: -1,
      threadId: threadId ?? -1,
      role: 'USER',
      content: message,
      toolCalls: null,
      metadata: uploadedAttachments?.length ? { attachments: uploadedAttachments } : null,
      orderIndex: -1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addOptimisticMessage(optimisticMsg);

    try {
      const reader = await createSseStream(
        {
          threadId,
          message,
          ...(selection?.provider && { provider: selection.provider }),
          ...(selection?.model && { model: selection.model }),
          webSearch: webSearchEnabled,
          ...(resolvedFileIds?.length && { fileIds: resolvedFileIds }),
        },
        abortController.signal,
      );

      let confirmedThreadId: number | undefined = threadId;
      let buffer = '';
      let toolEventCounter = 0;
      const activeToolEventIds = new Map<string, string>();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += value;
        const lines = buffer.split('\n');

        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const rawData = trimmed.slice('data:'.length).trim();

          if (rawData === '[DONE]') {
            // Navigate to the new thread AFTER the stream fully completes.
            // This prevents the mid-stream navigation splash where loading.tsx
            // would flash in the middle of a streaming response.
            if (!threadId && confirmedThreadId) {
              if (onNewThread) {
                onNewThread(confirmedThreadId);
              } else {
                router.push(`/threads/${confirmedThreadId}`);
              }
              setTimeout(() => {
                qc.invalidateQueries({ queryKey: THREADS_QUERY_KEY });
              }, 100);
            }

            // Await the messages refetch before killing StreamingBubble.
            // This prevents the visual "reload" where StreamingBubble disappears
            // before the real MessageBubbles are ready to replace it.
            // For new threads, clearOptimisticMessages is handled by
            // NewChatContainer unmount to avoid the welcome-screen flash.
            const finalMsgKey = confirmedThreadId ? getMessagesQueryKey(confirmedThreadId) : null;
            if (finalMsgKey) {
              void qc.invalidateQueries({ queryKey: finalMsgKey }).then(() => {
                finalizeStream();
                if (threadId) clearOptimisticMessages();
              });
            } else {
              finalizeStream();
              if (threadId) clearOptimisticMessages();
            }
            return;
          }

          let event: SSEEvent;
          try {
            event = JSON.parse(rawData) as SSEEvent;
          } catch {
            continue;
          }

          switch (event.type) {
            // Skip ping event (used to seed Redis Stream)
            case 'ping':
              continue;

            case 'message_start': {
              const msg = (event as unknown as { message: { id?: string; thread_id?: number } })
                .message;
              confirmedThreadId = msg?.thread_id ?? confirmedThreadId;
              if (msg?.id) {
                const sid = msg.id.replace(/^msg_/, '');
                setStreamingSessionId(sid);
              }
              break;
            }

            case 'content_block_start': {
              const blk = event as unknown as {
                index: number;
                content_block: { type: string; name?: string; input?: Record<string, unknown> };
              };
              if (blk.content_block.type === 'tool_use') {
                addToolEvent({
                  id: String(blk.index),
                  name: blk.content_block.name ?? 'tool',
                  input: blk.content_block.input ?? {},
                  status: 'pending',
                });
              } else if (blk.content_block.type === 'thinking') {
                addToolEvent({
                  id: String(blk.index),
                  name: 'think',
                  input: { thought: '' },
                  status: 'pending',
                });
              }

              break;
            }

            case 'content_block_delta': {
              const cbdEvt = event as unknown as {
                index: number;
                delta: { type: string; text?: string; thinking?: string; partial_json?: string };
              };
              const delta = cbdEvt.delta;

              if (delta.type === 'text_delta' && delta.text) {
                appendToken(delta.text);
              } else if (delta.type === 'thinking_delta' && delta.thinking) {
                updateToolEventThinking(String(cbdEvt.index), delta.thinking);
              } else if (delta.type === 'input_json_delta' && delta.partial_json) {
                appendToolInput(String(cbdEvt.index), delta.partial_json);
              }

              break;
            }

            case 'content_block_stop': {
              const blkStop = event as unknown as { index: number; tool_output?: unknown };
              updateToolEvent(String(blkStop.index), blkStop.tool_output);
              break;
            }

            case 'message_delta':
              break;

            case 'message_limit':
              break;

            case 'message_stop': {
              const stop = event as unknown as {
                thread_id?: number;
                message_id?: number;
                artifacts?: Array<{
                  id: number;
                  type: string;
                  title: string;
                  content: string;
                  language?: string | null;
                  messageId?: number | null;
                }>;
              };
              const finalThreadId = stop.thread_id ?? confirmedThreadId;

              if (finalThreadId) {
                qc.invalidateQueries({ queryKey: getMessagesQueryKey(finalThreadId) });
              }
              if (threadId) {
                qc.invalidateQueries({ queryKey: THREADS_QUERY_KEY });
              }

              if (stop.artifacts && stop.artifacts.length > 0) {
                const realArtifacts = stop.artifacts.map((a) => ({
                  id: String(a.id),
                  type: a.type as 'html' | 'code' | 'markdown' | 'react' | 'mermaid' | 'svg',
                  title: a.title,
                  content: a.content,
                  language: a.language ?? undefined,
                  messageId: a.messageId ?? -1,
                }));
                setArtifacts(realArtifacts);
                openArtifact(realArtifacts[realArtifacts.length - 1].id);

                if (finalThreadId) {
                  qc.invalidateQueries({ queryKey: ['artifacts', finalThreadId] });
                }
              }

              // Do NOT call finalizeStream() here — wait for [DONE] to avoid
              // StreamingBubble disappearing before MessageBubble refetch completes.
              break;
            }

            case 'error': {
              const errEvt = event as unknown as { error: { message: string } };
              const errMsg = errEvt.error?.message ?? 'An error occurred during streaming.';
              console.error('[SSE] Error:', errMsg);
              setStreamError(errMsg);

              break;
            }

            case 'meta': {
              confirmedThreadId = (event.data as { threadId: number }).threadId;
              // If the server set a new title (first run), refresh both the sidebar
              // list and the individual thread cache so the header updates too.
              if ((event.data as { title?: string }).title) {
                void qc.invalidateQueries({ queryKey: THREADS_QUERY_KEY });
                void qc.invalidateQueries({ queryKey: ['threads', confirmedThreadId] });
              }
              // Navigation deferred to [DONE] — avoids mid-stream loading.tsx splash.
              break;
            }

            case 'token':
              appendToken((event.data as { token: string }).token);
              break;

            case 'tool_start': {
              const toolName = (event.data as { tool: string }).tool;
              const toolEventId = `${toolName}-${++toolEventCounter}`;
              activeToolEventIds.set(toolName, toolEventId);
              addToolEvent({
                id: toolEventId,
                name: toolName,
                input: (event.data as { input: Record<string, unknown> }).input,
                status: 'pending',
              });
              break;
            }

            case 'tool_end': {
              const toolName = (event.data as { tool: string }).tool;
              const toolEventId = activeToolEventIds.get(toolName) ?? toolName;
              activeToolEventIds.delete(toolName);
              updateToolEvent(toolEventId, (event.data as { output: unknown }).output);
              break;
            }

            case 'artifact': {
              const art = event.data as {
                type: 'html' | 'code' | 'markdown';
                title: string;
                language: string | null;
                content: string;
              };
              const artifactId = crypto.randomUUID();
              addArtifact({
                id: artifactId,
                type: art.type === 'markdown' ? 'markdown' : art.type,
                title: art.title,
                content: art.content,
                language: art.language ?? undefined,
                messageId: -1,
              });
              openArtifact(artifactId);
              addStreamingArtifactId(artifactId);
              break;
            }

            case 'done': {
              const finalThreadId = confirmedThreadId;

              // Kick off background invalidations so data is fresh by the time
              // [DONE] fires. finalizeStream() is deferred until after the
              // messages refetch completes (see [DONE] handler above).
              if (finalThreadId) {
                qc.invalidateQueries({
                  queryKey: getMessagesQueryKey(finalThreadId),
                });
              }
              if (threadId) {
                qc.invalidateQueries({ queryKey: THREADS_QUERY_KEY });
              }
              break;
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        let errorMessage = 'Something went wrong. Please try again.';
        if (err instanceof ApiClientError) {
          if (err.statusCode === 429) {
            errorMessage =
              'Too many requests — you have been rate limited. Please wait a moment and try again.';
          } else if (err.statusCode === 401) {
            errorMessage = 'Session expired. Please refresh the page and log in again.';
          } else if (err.statusCode === 503) {
            errorMessage = 'The AI service is currently unavailable. Please try again later.';
          } else if (err.statusCode >= 500) {
            errorMessage = `Server error (${err.statusCode}). Please try again.`;
          } else {
            errorMessage = err.message || errorMessage;
          }
        }
        setStreamError(errorMessage);
      } else {
        // Refetch messages from DB so the saved user message reappears after abort
        if (threadId) {
          void qc.invalidateQueries({ queryKey: getMessagesQueryKey(threadId) }).then(() => {
            finalizeStream();
            clearOptimisticMessages();
          });
        } else {
          finalizeStream();
          clearOptimisticMessages();
        }
      }
    }
  };

  return { send };
}
