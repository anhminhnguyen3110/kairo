'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useArtifactStore } from '@/stores/artifact-store';
import { ArtifactToolbar, ViewMode } from './artifact-toolbar';
import { SandpackRenderer } from './renderers/sandpack-renderer';
import { HtmlRenderer } from './renderers/html-renderer';
import { MermaidRenderer } from './renderers/mermaid-renderer';
import { SvgRenderer } from './renderers/svg-renderer';
import { CodeRenderer } from './renderers/code-renderer';
import type { Artifact } from '@/types';
import { useUiStore } from '@/stores/ui-store';

const MIN_WIDTH = 320;
const MAX_WIDTH = 1400;
const DEFAULT_WIDTH = 520;

export function ArtifactPanel() {
  const {
    artifacts,
    activeArtifactId,
    panelOpen,
    streamingArtifactContent,
    streamingArtifactMeta,
  } = useArtifactStore();
  const { isMobile } = useUiStore();

  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH);
  const [lastArtifactId, setLastArtifactId] = useState(activeArtifactId);
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [refreshKey, setRefreshKey] = useState(0);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(DEFAULT_WIDTH);

  // Reset to preview whenever the active artifact changes (set-during-render avoids extra effect render)
  if (lastArtifactId !== activeArtifactId) {
    setLastArtifactId(activeArtifactId);
    setViewMode('preview');
  }

  const onDragMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDragging.current = true;
      startX.current = e.clientX;
      startWidth.current = panelWidth;
      e.preventDefault();
    },
    [panelWidth],
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = startX.current - e.clientX; // drag left → wider
      const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth.current + delta));
      setPanelWidth(newWidth);
    };
    const onMouseUp = () => {
      isDragging.current = false;
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  if (!panelOpen) return null;

  const isStreaming = !!streamingArtifactMeta;
  const artifact: Artifact | null = isStreaming
    ? ({
        id: '__streaming__',
        type: streamingArtifactMeta.type,
        title: streamingArtifactMeta.title ?? 'Generating…',
        language: streamingArtifactMeta.language,
        content: streamingArtifactContent,
        messageId: -1,
      } as Artifact)
    : activeArtifactId
      ? ((artifacts[activeArtifactId] as Artifact) ?? null)
      : null;

  if (!artifact) return null;

  return (
    <aside
      style={isMobile ? undefined : { width: panelWidth }}
      className={`flex flex-col border-l border-chat-border bg-[#1A1A1A] ${
        isMobile ? 'fixed inset-0 z-50 overflow-hidden' : 'relative shrink-0'
      }`}
    >
      {!isMobile && (
        <div
          onMouseDown={onDragMouseDown}
          className="absolute -left-1 top-0 bottom-0 w-2 z-10 cursor-col-resize select-none group"
          title="Drag to resize"
        >
          {/* Visual indicator bar — centered on the border, invisible at rest */}
          <div className="absolute left-[3px] top-0 bottom-0 w-0.5 opacity-0 group-hover:opacity-100 group-hover:bg-[#CC785C]/70 group-active:bg-[#CC785C] transition-opacity" />
        </div>
      )}

      <div className="flex flex-col flex-1 overflow-hidden">
        <ArtifactToolbar
          artifact={artifact}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onRefresh={() => setRefreshKey((k) => k + 1)}
        />
        <div className="flex-1 overflow-hidden">
          <ArtifactContent artifact={artifact} viewMode={viewMode} refreshKey={refreshKey} />
        </div>
      </div>
    </aside>
  );
}

function ArtifactContent({
  artifact,
  viewMode,
  refreshKey,
}: {
  artifact: Artifact;
  viewMode: ViewMode;
  refreshKey: number;
}) {
  const content = artifact.content ?? '';

  // When in code view mode always show source
  if (viewMode === 'code') {
    const lang =
      artifact.language ??
      (artifact.type === 'html' ? 'html' : artifact.type === 'react' ? 'jsx' : artifact.type);
    return <CodeRenderer code={content} language={lang} />;
  }

  switch (artifact.type) {
    case 'react':
      return <SandpackRenderer key={refreshKey} code={content} language="jsx" />;
    case 'html':
      return <HtmlRenderer key={refreshKey} html={content} />;
    case 'mermaid':
      return <MermaidRenderer key={refreshKey} code={content} />;
    case 'svg':
      return <SvgRenderer key={refreshKey} svg={content} />;
    case 'markdown':
      return <CodeRenderer code={content} language="markdown" />;
    case 'code':
    default:
      return <CodeRenderer code={content} language={artifact.language} />;
  }
}
