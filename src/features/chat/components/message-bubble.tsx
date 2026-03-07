'use client';

import { FileText, File } from 'lucide-react';
import { MarkdownRenderer } from './markdown-renderer';
import { cn, formatBytes, fileExt } from '@/lib/utils';
import type { Message, ToolCall, AttachmentMeta } from '@/types';
import { ToolEventCard } from './tool-event-card';
import { ArtifactChip } from '@/features/artifacts/components/artifact-chip';
import { useChatStore } from '@/stores/chat-store';
import { CopyButton } from '@/components/copy-button';

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

async function handleAttachmentClick(attachment: AttachmentMeta): Promise<void> {
  if (!attachment.fileId) return;
  const { mimeType, name, fileId } = attachment;
  if (mimeType?.startsWith('image/') || mimeType?.includes('pdf')) {
    window.open(`/api/proxy/files/${fileId}/download`, '_blank');
    return;
  }
  const res = await fetch(`/api/proxy/files/${fileId}/download`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function AttachmentCard({ attachment }: { attachment: AttachmentMeta }) {
  if (!attachment?.name) return null;
  const isPdf = attachment.mimeType?.includes('pdf') ?? false;
  const isText =
    (attachment.mimeType?.includes('text') ?? false) || attachment.name.endsWith('.md');
  const isClickable = !!attachment.fileId;
  return (
    <button
      type="button"
      onClick={isClickable ? () => void handleAttachmentClick(attachment) : undefined}
      className={cn(
        'flex flex-col p-2.5 rounded-xl w-[110px] shrink-0 bg-[#2A2724] border border-[#3F3B35] text-left',
        isClickable && 'cursor-pointer hover:border-[#CC785C] transition-colors',
      )}
    >
      <div className="text-stone-400 mb-1">
        {isPdf || isText ? <FileText size={15} /> : <File size={15} />}
      </div>
      <span className="text-[11px] text-stone-300 truncate leading-tight font-medium">
        {attachment.name}
      </span>
      <span className="text-[10px] text-stone-500 mt-0.5 leading-tight">
        {formatBytes(attachment.sizeBytes)}
      </span>
      <span
        className="self-start px-1.5 py-0.5 rounded text-[9px] font-bold
                       bg-[#1C1B18] text-stone-400 border border-[#3A3632] leading-none mt-2"
      >
        {fileExt(attachment.name)}
      </span>
    </button>
  );
}

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'USER';
  const isAssistant = message.role === 'ASSISTANT';
  const fileAttachmentsByKey = useChatStore((s) => s.fileAttachmentsByKey);

  if (isUser) {
    const metaAttachments = message.metadata?.attachments as AttachmentMeta[] | undefined;
    const storeKey = `${message.threadId}:${message.content}`;
    const storeAttachments = fileAttachmentsByKey[storeKey];
    const attachments = metaAttachments ?? storeAttachments ?? [];
    return (
      <div className="group/msg flex justify-end">
        <div className="max-w-[85%] flex flex-col items-end gap-2">
          {attachments.length > 0 && (
            <div className="flex gap-2 flex-wrap justify-end">
              {attachments.map((att, i) => (
                <AttachmentCard key={`${att.name}-${i}`} attachment={att} />
              ))}
            </div>
          )}
          {message.content && (
            <div
              className={cn(
                'px-4 py-3 rounded-2xl',
                'bg-user-bubble text-user-text text-sm leading-relaxed',
              )}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          )}
          {message.content && (
            <div className="flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-150">
              {message.createdAt && (
                <span className="text-[11px] text-stone-500 tabular-nums mr-0.5">
                  {formatTime(message.createdAt)}
                </span>
              )}
              <CopyButton content={message.content} showLabel={false} />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isAssistant) {
    const toolCallsList: ToolCall[] = message.toolCalls
      ? Array.isArray(message.toolCalls)
        ? (message.toolCalls as ToolCall[])
        : ((message.toolCalls as { calls?: ToolCall[] }).calls ?? [])
      : [];

    return (
      <div className="group/msg">
        {toolCallsList.map((tool, i) => (
          <ToolEventCard
            key={tool.id ?? `${tool.name}-${i}`}
            name={tool.name}
            input={tool.input}
            output={tool.output}
            status="done"
          />
        ))}

        {message.artifacts?.map((artifact) => (
          <ArtifactChip
            key={artifact.id}
            artifactId={String(artifact.id)}
            title={artifact.title}
            type={artifact.type}
          />
        ))}

        <MarkdownRenderer content={message.content} />
        {message.content && (
          <div className="flex items-center gap-1 mt-1 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-150">
            <CopyButton content={message.content} showLabel={false} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="py-2">
      <p className="text-xs text-stone-400 italic">{message.content}</p>
    </div>
  );
}
