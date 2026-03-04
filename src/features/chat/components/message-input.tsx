'use client';

import { useRef, useState, useCallback, useEffect, KeyboardEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowUp, Square, Plus, Paperclip, Globe, X } from 'lucide-react';
import { useChatStore } from '@/stores/chat-store';
import { useUiStore } from '@/stores/ui-store';
import { useStream } from '../hooks/use-stream';
import { ModelSelector } from './model-selector';
import { abortSseStream } from '@/lib/api-client';
import { cn, formatBytes, fileExt } from '@/lib/utils';
import { useClickOutside } from '@/lib/hooks/use-click-outside';
import { threadsApi } from '@/features/threads/api/threads-api';
import { filesApi } from '@/features/files/api/files-api';
import { THREADS_QUERY_KEY } from '@/features/threads/hooks/use-threads';

const ACCEPTED = '.pdf,.txt,.md,.docx,.doc,.csv,.json,.xml,.html,.htm';
const MAX_SIZE_MB = 25;
const MAX_TEXTAREA_ROWS = 8;
const LINE_HEIGHT_PX = 24;

interface MessageInputProps {
  threadId?: number;
  onNewThread?: (newThreadId: number) => void;
  variant?: 'centered' | 'bottom';
}

function FileCardSmall({ file, onRemove }: { file: File; onRemove: () => void }) {
  return (
    <div
      className="
      flex flex-col p-2.5 rounded-xl w-[110px] shrink-0
      bg-[#1C1B18] border border-[#3A3632] relative
    "
    >
      <button
        type="button"
        onClick={onRemove}
        className="
          absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full
          bg-[#3A3A3A] border border-[#555] text-stone-300
          flex items-center justify-center
          hover:bg-[#CC785C] hover:border-[#CC785C] hover:text-white
          transition-colors z-10
        "
        title="Remove"
      >
        <X size={9} />
      </button>

      <span className="text-[11px] text-stone-300 truncate leading-tight font-medium mt-1">
        {file.name}
      </span>
      <span className="text-[10px] text-stone-500 mt-0.5 leading-tight">
        {formatBytes(file.size)}
      </span>
      <span
        className="self-start px-1.5 py-0.5 rounded text-[9px] font-bold
                       bg-[#2A2724] text-stone-400 border border-[#3A3632] leading-none mt-2"
      >
        {fileExt(file.name)}
      </span>
    </div>
  );
}

export function MessageInput({ threadId, onNewThread, variant = 'bottom' }: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [hasText, setHasText] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const qc = useQueryClient();

  const {
    streamingStatus,
    streamingSessionId,
    abortStream,
    setPendingMessage,
    setFileAttachments,
  } = useChatStore();
  const { webSearchEnabled, toggleWebSearch } = useUiStore();
  const { send } = useStream();

  const isStreaming = streamingStatus === 'streaming';

  useClickOutside(
    plusMenuRef,
    useCallback(() => setPlusMenuOpen(false), []),
  );

  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const maxHeight = MAX_TEXTAREA_ROWS * LINE_HEIGHT_PX;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    setHasText(el.value.trim().length > 0);
  }, []);

  const handleSubmit = useCallback(async () => {
    const el = textareaRef.current;
    if (!el) return;
    const value = el.value.trim();
    if (!value || isStreaming || isCreating) return;

    const filesToSend = [...pendingFiles];
    el.value = '';
    el.style.height = 'auto';
    setHasText(false);
    setPendingFiles([]);

    if (threadId) {
      // Existing thread: send directly
      send({
        threadId,
        message: value,
        onNewThread,
        files: filesToSend.length > 0 ? filesToSend : undefined,
      });
      return;
    }

    // New thread: pre-create thread → upload files → navigate → auto-send
    setIsCreating(true);
    try {
      const newThread = await threadsApi.create();

      // Pre-populate the per-thread cache so ThreadContainer renders instantly (no isLoading spinner)
      qc.setQueryData(['threads', newThread.id], newThread);

      const attachmentsMeta: {
        fileId?: number;
        name: string;
        sizeBytes: number;
        mimeType: string;
      }[] = [];
      const uploadedFileIds: number[] = [];

      if (filesToSend.length > 0) {
        for (const file of filesToSend) {
          try {
            const result = await filesApi.upload(newThread.id, file);
            uploadedFileIds.push(result.id);
            attachmentsMeta.push({
              fileId: result.id,
              name: result.originalName,
              sizeBytes: result.sizeBytes,
              mimeType: result.mimeType,
            });
          } catch (err) {
            console.warn('[upload] Failed to upload file', file.name, err);
            // still store meta so optimistic display works
            attachmentsMeta.push({ name: file.name, sizeBytes: file.size, mimeType: file.type });
          }
        }
        void qc.invalidateQueries({ queryKey: ['files', newThread.id] });
      }

      // Store pending message so ThreadContainer auto-sends after mount
      setPendingMessage({
        content: value,
        attachments: attachmentsMeta,
        ...(uploadedFileIds.length > 0 && { fileIds: uploadedFileIds }),
      });

      // Refresh sidebar so the new thread appears immediately
      void qc.invalidateQueries({ queryKey: THREADS_QUERY_KEY });

      // Navigate — ThreadContainer mounts, useEffect below picks up pendingMessage
      onNewThread?.(newThread.id);
    } catch (err) {
      console.error('[handleSubmit] Failed to create thread', err);
      // Restore input on failure
      if (el) {
        el.value = value;
        handleInput();
      }
      setPendingFiles(filesToSend);
    } finally {
      setIsCreating(false);
    }
  }, [
    threadId,
    isStreaming,
    isCreating,
    send,
    onNewThread,
    pendingFiles,
    qc,
    setPendingMessage,
    handleInput,
  ]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        void handleSubmit();
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void handleSubmit();
      }
    },
    [handleSubmit],
  );

  // Auto-send once ThreadContainer mounts with the pre-created threadId.
  // Read pendingMessage via getState() (not from stale closure) and clear it
  // synchronously BEFORE send() to guard against React StrictMode double-invocation.
  useEffect(() => {
    if (!threadId) return;
    const pm = useChatStore.getState().pendingMessage;
    if (!pm) return;
    const { content, attachments, fileIds } = pm;
    // Clear FIRST so StrictMode's second run sees null and bails out
    useChatStore.getState().setPendingMessage(null);
    // Register attachment metadata before send() adds the optimistic message
    if (attachments.length > 0) {
      setFileAttachments(threadId, content, attachments);
    }
    send({ threadId, message: content, ...(fileIds?.length && { fileIds }) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  const handleAbort = useCallback(() => {
    if (streamingSessionId) {
      abortSseStream(streamingSessionId).catch(() => null);
    }
    abortStream();
  }, [streamingSessionId, abortStream]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const valid = files.filter((f) => {
      if (f.size > MAX_SIZE_MB * 1024 * 1024) {
        alert(`"${f.name}" exceeds ${MAX_SIZE_MB} MB limit.`);
        return false;
      }
      return true;
    });
    setPendingFiles((prev) => [...prev, ...valid]);
    e.target.value = '';
    setPlusMenuOpen(false);
  }, []);

  const removeFile = useCallback((idx: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const hasActiveFeature = webSearchEnabled;

  const wrapperClass = variant === 'centered' ? 'w-full px-4' : 'px-4 pb-4 pt-2';

  return (
    <div className={wrapperClass}>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED}
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      <div
        className="
          max-w-[768px] mx-auto
          bg-chat-surface border border-chat-border rounded-2xl shadow-sm
          focus-within:border-[#B8B0A4] focus-within:ring-1 focus-within:ring-[#D4CDC5]
          transition-all duration-150
        "
      >
        {pendingFiles.length > 0 && (
          <div className="flex gap-2 px-3 pt-3 flex-wrap">
            {pendingFiles.map((f, i) => (
              <FileCardSmall key={`${f.name}-${i}`} file={f} onRemove={() => removeFile(i)} />
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          rows={1}
          placeholder={pendingFiles.length > 0 ? 'Add a messageâ€¦' : 'Type / for commands'}
          className="
            w-full resize-none bg-transparent outline-none
            px-4 pt-3 pb-1 text-sm text-[#ECECEC] placeholder:text-stone-500
            leading-6 max-h-[192px] overflow-y-auto
          "
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          disabled={isStreaming || isCreating}
        />

        <div className="flex items-center justify-between px-3 pb-2">
          <div className="flex items-center gap-1">
            <div ref={plusMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setPlusMenuOpen((v) => !v)}
                className={cn(
                  'relative p-1.5 rounded-lg transition-colors',
                  plusMenuOpen
                    ? 'text-stone-200 bg-[#333333]'
                    : 'text-stone-400 hover:text-stone-300 hover:bg-[#333333]',
                )}
                title="Attach files or toggle tools"
              >
                <Plus size={16} />
                {hasActiveFeature && !plusMenuOpen && (
                  <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-blue-400" />
                )}
              </button>

              {plusMenuOpen && (
                <div
                  className={cn(
                    'absolute bottom-full left-0 mb-1 z-50',
                    'w-52 bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl shadow-lg',
                    'py-1.5 flex flex-col',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="
                      flex items-center gap-3 px-3 py-2 text-sm
                      text-stone-300 hover:bg-[#333333] transition-colors text-left
                    "
                  >
                    <Paperclip size={14} className="text-stone-500 shrink-0" />
                    <span>Attach files</span>
                  </button>

                  <div className="h-px bg-[#3A3A3A] mx-2 my-1" />

                  <button
                    type="button"
                    onClick={toggleWebSearch}
                    className={cn(
                      'flex items-center justify-between gap-3 px-3 py-2 text-sm',
                      'hover:bg-[#333333] transition-colors',
                      webSearchEnabled ? 'text-blue-400' : 'text-stone-300',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Globe size={14} className="shrink-0" />
                      <span>Web search</span>
                    </div>
                    <div
                      className={cn(
                        'w-8 h-4 rounded-full transition-colors relative shrink-0',
                        webSearchEnabled ? 'bg-blue-500' : 'bg-[#3A3A3A]',
                      )}
                    >
                      <div
                        className={cn(
                          'absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform',
                          webSearchEnabled ? 'translate-x-4' : 'translate-x-0.5',
                        )}
                      />
                    </div>
                  </button>
                </div>
              )}
            </div>

            {webSearchEnabled && (
              <div
                className="
                  flex items-center gap-1 px-2 py-0.5 rounded-full
                  bg-blue-500/15 border border-blue-500/30 text-blue-400
                  text-[11px] cursor-pointer select-none
                "
                title="Web search enabled â€” click to disable"
                onClick={toggleWebSearch}
              >
                <Globe size={11} />
                <span>Web</span>
              </div>
            )}

            <ModelSelector />
          </div>

          {isStreaming ? (
            <button
              type="button"
              onClick={handleAbort}
              className="
                w-8 h-8 rounded-full flex items-center justify-center
                bg-[#1C1917] text-white
                hover:bg-[#312E2B] transition-colors
              "
              title="Stop generating"
            >
              <Square size={14} fill="currentColor" />
            </button>
          ) : (
            <SendButton
              onSubmit={handleSubmit}
              hasContent={hasText || pendingFiles.length > 0}
              isLoading={isCreating}
            />
          )}
        </div>
      </div>

      {variant === 'bottom' && (
        <p className="hidden sm:block text-center text-xs text-stone-400 mt-2">
          Press <kbd className="font-mono">Enter</kbd> to send,{' '}
          <kbd className="font-mono">Shift+Enter</kbd> for newline
        </p>
      )}
    </div>
  );
}

function SendButton({
  onSubmit,
  hasContent,
  isLoading,
}: {
  onSubmit: () => void;
  hasContent?: boolean;
  isLoading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => void onSubmit()}
      disabled={isLoading}
      className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
        hasContent
          ? 'bg-[#CC785C] text-white hover:bg-[#B8694E]'
          : 'bg-[#1C1917] text-white hover:bg-[#312E2B]',
      )}
      title="Send message (Enter)"
    >
      {isLoading ? (
        <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
      ) : (
        <ArrowUp size={16} />
      )}
    </button>
  );
}
