'use client';

import { AlertTriangle } from 'lucide-react';
import { useChatStore } from '@/stores/chat-store';
import { useArtifactStore } from '@/stores/artifact-store';
import { ToolEventCard } from './tool-event-card';
import { ErrorBoundary } from '@/components/error-boundary';
import { MarkdownRenderer } from './markdown-renderer';
import { ArtifactChip } from '@/features/artifacts/components/artifact-chip';
import type { Artifact } from '@/types';

export function StreamingBubble() {
  const {
    streamingContent,
    streamingToolEvents,
    streamingStatus,
    streamingError,
    streamingArtifactIds,
  } = useChatStore();
  const { artifacts } = useArtifactStore();

  const streamingArtifacts = streamingArtifactIds
    .map((id) => artifacts[id] as Artifact | undefined)
    .filter(Boolean) as Artifact[];

  if (streamingStatus === 'error') {
    return (
      <div className="py-4">
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300">
          <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-400" />
          <p className="text-sm leading-relaxed">{streamingError}</p>
        </div>
      </div>
    );
  }

  if (
    streamingStatus !== 'streaming' &&
    streamingStatus !== 'saving' &&
    streamingStatus !== 'aborted'
  )
    return null;

  return (
    <div className="py-6">
      {streamingToolEvents.map((event) => (
        <ErrorBoundary key={event.id} label="Tool event">
          <ToolEventCard
            name={event.name}
            input={event.input}
            output={event.output}
            status={event.status}
          />
        </ErrorBoundary>
      ))}

      <div className="relative">
        {streamingContent ? (
          <>
            <MarkdownRenderer content={streamingContent} />
            {streamingStatus === 'streaming' && (
              <span className="inline-block w-0.5 h-4 bg-[#CC785C] ml-0.5 animate-pulse" />
            )}
            {streamingStatus === 'aborted' && (
              <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-stone-800 text-stone-400 align-middle">
                Stopped
              </span>
            )}
          </>
        ) : streamingStatus !== 'aborted' ? (
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#CC785C]/60 animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#CC785C]/60 animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#CC785C]/60 animate-bounce [animation-delay:300ms]" />
          </span>
        ) : null}
      </div>

      {streamingArtifacts.length > 0 && (
        <div className="flex flex-col gap-1 mt-3">
          {streamingArtifacts.map((art) => (
            <ArtifactChip key={art.id} artifactId={art.id} title={art.title} type={art.type} />
          ))}
        </div>
      )}
    </div>
  );
}
