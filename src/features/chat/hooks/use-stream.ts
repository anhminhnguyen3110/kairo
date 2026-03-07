'use client';

import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createSseStream, ApiClientError } from '@/lib/api-client';
import { useChatStore } from '@/stores/chat-store';
import { useModelStore } from '@/stores/model-store';
import { useUiStore } from '@/stores/ui-store';
import { useArtifactStore } from '@/stores/artifact-store';
import type { SSEEvent, Message, Thread, PaginatedResponse } from '@/types';
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
    setSavingStatus,
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
          // Abort the entire send so the user knows the file was not attached.
          setStreamError(
            'File upload failed. Please ensure the file is under 10 MB and try again.',
          );
          finalizeStream();
          clearOptimisticMessages();
          return;
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

    let confirmedThreadId: number | undefined = threadId;

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

      confirmedThreadId = threadId;
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
            // Safety net: finalise if message_stop was never received (e.g. stream
            // closed without a proper message_stop from the backend).
            const { streamingStatus: s } = useChatStore.getState();
            if (s === 'streaming' || s === 'saving') {
              finalizeStream();
              clearOptimisticMessages();
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

              if (!threadId && finalThreadId) {
                if (onNewThread) {
                  onNewThread(finalThreadId);
                } else {
                  router.push(`/threads/${finalThreadId}`);
                }
                setTimeout(() => {
                  void qc.invalidateQueries({ queryKey: THREADS_QUERY_KEY, refetchType: 'none' });
                }, 100);
              }

              let cacheInjected = false;
              if (finalThreadId) {
                const currentContent = useChatStore.getState().streamingContent;
                const currentOptimistic = useChatStore.getState().optimisticMessages;
                const currentToolEvents = useChatStore.getState().streamingToolEvents;

                const toolCallsForCache = currentToolEvents
                  .filter((e) => e.name !== 'think')
                  .map((e) => ({ id: e.id, name: e.name, input: e.input, output: e.output }));

                const artifactsForCache =
                  stop.artifacts?.map((a) => ({
                    id: String(a.id),
                    type: a.type,
                    title: a.title,
                    content: a.content,
                    language: a.language ?? undefined,
                  })) ?? [];

                qc.setQueryData<InfiniteData<PaginatedResponse<Message>>>(
                  getMessagesQueryKey(finalThreadId),
                  (old) => {
                    if (!old?.pages?.length) return old;
                    const [firstPage, ...rest] = old.pages;

                    const toInject: Message[] = [];

                    if (currentContent) {
                      toInject.push({
                        id: stop.message_id ?? -Date.now(),
                        threadId: finalThreadId,
                        role: 'ASSISTANT',
                        content: currentContent,
                        toolCalls: toolCallsForCache.length > 0 ? toolCallsForCache : null,
                        artifacts:
                          artifactsForCache.length > 0
                            ? (artifactsForCache as Message['artifacts'])
                            : undefined,
                        metadata: null,
                        orderIndex: Number.MAX_SAFE_INTEGER,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                      });
                    }

                    for (const opt of [...currentOptimistic].reverse()) {
                      toInject.push({
                        ...opt,
                        orderIndex: Number.MAX_SAFE_INTEGER - 1,
                      });
                    }

                    cacheInjected = true;
                    return {
                      ...old,
                      pages: [{ ...firstPage, data: [...toInject, ...firstPage.data] }, ...rest],
                    };
                  },
                );
              }

              finalizeStream();
              clearOptimisticMessages();

              if (finalThreadId) {
                // If the cache was empty when message_stop fired (race condition: stream
                // finished before useMessages loaded the page), trigger an active refetch so
                // the assistant reply appears immediately without requiring a manual reload.
                void qc.invalidateQueries({
                  queryKey: getMessagesQueryKey(finalThreadId),
                  refetchType: cacheInjected ? 'none' : 'active',
                });
                void qc.invalidateQueries({
                  queryKey: THREADS_QUERY_KEY,
                  refetchType: 'none',
                });
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
              }

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
              const metaData = event as unknown as { threadId: number; title?: string };
              confirmedThreadId = metaData.threadId;
              if (metaData.title) {
                const updatedTitle = metaData.title;
                const tid = confirmedThreadId;
                qc.setQueriesData({ queryKey: THREADS_QUERY_KEY }, (old: unknown) => {
                  if (!old) return old;
                  const data = old as { pages?: Array<{ data: Thread[] }> };
                  if (!data.pages) return old;
                  return {
                    ...data,
                    pages: data.pages.map((page) => ({
                      ...page,
                      data: page.data.map((t) =>
                        t.id === tid ? { ...t, title: updatedTitle } : t,
                      ),
                    })),
                  };
                });
                qc.setQueryData<Thread>(['threads', tid], (old) =>
                  old ? { ...old, title: updatedTitle } : old,
                );
              }
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

            case 'streaming_complete': {
              setSavingStatus();
              break;
            }

            case 'done':
              break;
          }
        }
      }
      // Safety net: stream ended with done=true (backend closed the connection)
      // without emitting message_stop — ensure we never get stuck in streaming.
      const { streamingStatus: sAfter } = useChatStore.getState();
      if (sAfter === 'streaming' || sAfter === 'saving') {
        finalizeStream();
        clearOptimisticMessages();
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        let errorMessage = 'Something went wrong. Please try again.';
        if (err instanceof ApiClientError) {
          if (err.statusCode === 429) {
            errorMessage =
              'Too many requests — you have been rate limited. Please wait a moment and try again.';
          } else if (err.statusCode === 401) {
            errorMessage = 'Session expired. Redirecting to login…';
            const next = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.href = `/login?next=${next}`;
          } else if (err.statusCode === 503) {
            errorMessage = 'The AI service is currently unavailable. Please try again later.';
          } else if (err.statusCode >= 500) {
            errorMessage = `Server error (${err.statusCode}). Please try again.`;
          } else {
            errorMessage = err.message || errorMessage;
          }
        }
        setStreamError(errorMessage);
        finalizeStream();
        clearOptimisticMessages();
      } else {
        // AbortError: user clicked "Stop generating".
        // Finalise immediately (synchronously) so no deferred .then() can race
        // against a new stream that the user starts right after aborting.
        finalizeStream();
        clearOptimisticMessages();
        const tidToInvalidate = threadId ?? confirmedThreadId;
        if (tidToInvalidate) {
          // Invalidate with active refetch so the message list reflects the actual
          // server state (which may include a partial/completed response from the
          // backend despite the frontend abort).
          void qc.invalidateQueries({ queryKey: getMessagesQueryKey(tidToInvalidate) });
        }
      }
    }
  };

  return { send };
}
