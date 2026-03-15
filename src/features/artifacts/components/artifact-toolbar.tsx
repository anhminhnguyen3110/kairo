'use client';

import {
  Copy,
  Download,
  X,
  Eye,
  Code2,
  RefreshCw,
  ChevronDown,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { Artifact } from '@/types';
import { useArtifactStore } from '@/stores/artifact-store';
import { artifactsApi } from '../api/artifacts-api';
import { TYPE_LABELS } from '../constants';
import type { ViewMode } from '../types/artifact.types';

export type { ViewMode };

interface ArtifactToolbarProps {
  artifact: Artifact;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onRefresh?: () => void;
}

function buildVersionChain(artifact: Artifact, artifacts: Record<string, Artifact>): Artifact[] {
  const all = Object.values(artifacts) as Artifact[];

  const findRoot = (art: Artifact): Artifact => {
    if (!art.parentId) return art;
    const parent = artifacts[art.parentId];
    if (!parent) return art;
    return findRoot(parent);
  };

  const root = findRoot(artifact);
  const chain: Artifact[] = [root];

  let current = root;
  for (;;) {
    const next = all.find((a) => a.parentId === current.id);
    if (!next) break;
    chain.push(next);
    current = next;
  }

  return chain;
}

export function ArtifactToolbar({
  artifact,
  viewMode,
  onViewModeChange,
  onRefresh,
}: ArtifactToolbarProps) {
  const { closePanel, openArtifact, artifacts } = useArtifactStore();
  const [copied, setCopied] = useState(false);
  const [copyMenuOpen, setCopyMenuOpen] = useState(false);

  const numericId = Number(artifact.id);
  const isPersistedArtifact = !isNaN(numericId) && numericId > 0;
  const downloadUrl = isPersistedArtifact ? artifactsApi.getDownloadUrl(numericId) : null;

  const versionChain = buildVersionChain(artifact, artifacts);
  const currentVersionIdx = versionChain.findIndex((a) => a.id === artifact.id);
  const totalVersions = versionChain.length;
  const hasPrev = currentVersionIdx > 0;
  const hasNext = currentVersionIdx < totalVersions - 1;

  const handleCopyContent = useCallback(async () => {
    await navigator.clipboard.writeText(artifact.content ?? '');
    setCopied(true);
    setCopyMenuOpen(false);
    setTimeout(() => setCopied(false), 1500);
  }, [artifact.content]);

  const handleCopyLink = useCallback(async () => {
    if (!downloadUrl) return;
    const fullUrl = `${window.location.origin}${downloadUrl}`;
    await navigator.clipboard.writeText(fullUrl);
    setCopyMenuOpen(false);
  }, [downloadUrl]);

  const handleDownload = useCallback(() => {
    if (isPersistedArtifact && downloadUrl) {
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = '';
      a.click();
      return;
    }
    const ext: Record<string, string> = {
      react: 'jsx',
      html: 'html',
      mermaid: 'mmd',
      drawio: 'drawio',
      svg: 'svg',
      markdown: 'md',
      code: 'txt',
    };
    const blob = new Blob([artifact.content ?? ''], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.title ?? 'artifact'}.${ext[artifact.type] ?? 'txt'}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [artifact, isPersistedArtifact, downloadUrl]);

  const typeLabel = TYPE_LABELS[artifact.type] ?? artifact.type;

  const hasPreview =
    artifact.type === 'html' ||
    artifact.type === 'react' ||
    artifact.type === 'mermaid' ||
    artifact.type === 'drawio' ||
    artifact.type === 'svg' ||
    artifact.type === 'markdown';

  return (
    <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[#2A2A2A] bg-[#1A1A1A] shrink-0">
      {hasPreview && (
        <>
          <button
            type="button"
            onClick={() => onViewModeChange('preview')}
            title="Preview"
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'preview'
                ? 'text-stone-200 bg-[#2A2A2A]'
                : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            <Eye size={14} />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('code')}
            title="Source code"
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'code'
                ? 'text-stone-200 bg-[#2A2A2A]'
                : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            <Code2 size={14} />
          </button>
          <div className="w-px h-4 bg-[#333333] mx-0.5" />
        </>
      )}

      <span className="flex-1 text-sm font-medium text-stone-300 truncate min-w-0">
        {artifact.title ?? 'Artifact'}
      </span>
      <span className="shrink-0 text-sm text-stone-500">· {typeLabel}</span>

      {totalVersions > 1 && (
        <>
          <div className="w-px h-4 bg-[#333333] mx-0.5" />
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => openArtifact(versionChain[currentVersionIdx - 1].id)}
              disabled={!hasPrev}
              title="Previous version"
              className="p-1 rounded-md text-stone-500 hover:text-stone-300 hover:bg-[#2A2A2A]
                         transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={13} />
            </button>
            <span className="text-[11px] text-stone-500 tabular-nums px-0.5">
              v{currentVersionIdx + 1}/{totalVersions}
            </span>
            <button
              type="button"
              onClick={() => openArtifact(versionChain[currentVersionIdx + 1].id)}
              disabled={!hasNext}
              title="Next version"
              className="p-1 rounded-md text-stone-500 hover:text-stone-300 hover:bg-[#2A2A2A]
                         transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </>
      )}

      <div className="w-px h-4 bg-[#333333] mx-0.5" />

      <div className="relative flex items-center">
        <button
          type="button"
          onClick={handleCopyContent}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-stone-300
                     hover:text-stone-100 hover:bg-[#2A2A2A] rounded-l-md transition-colors"
          title="Copy content"
        >
          {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
          <span className="text-xs">{copied ? 'Copied!' : 'Copy'}</span>
        </button>
        <button
          type="button"
          onClick={() => setCopyMenuOpen((v) => !v)}
          className="p-1.5 text-stone-500 hover:text-stone-300 hover:bg-[#2A2A2A] rounded-r-md
                     border-l border-[#333333] transition-colors"
          title="More copy options"
        >
          <ChevronDown size={12} />
        </button>

        {copyMenuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setCopyMenuOpen(false)} />
            <div
              className="absolute right-0 top-full mt-1 z-20 min-w-[140px] rounded-lg
                            border border-[#333333] bg-[#1E1E1E] shadow-xl overflow-hidden"
            >
              <button
                type="button"
                onClick={handleCopyContent}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-stone-300
                           hover:bg-[#2A2A2A] transition-colors text-left"
              >
                <Copy size={12} /> Copy content
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-stone-300
                           hover:bg-[#2A2A2A] transition-colors text-left"
              >
                <Download size={12} /> Download file
              </button>
              {downloadUrl && (
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-stone-300
                             hover:bg-[#2A2A2A] transition-colors text-left border-t border-[#2A2A2A]"
                >
                  <Copy size={12} /> Copy link
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          className="p-1.5 rounded-md text-stone-500 hover:text-stone-300 hover:bg-[#2A2A2A] transition-colors"
          title="Refresh preview"
        >
          <RefreshCw size={14} />
        </button>
      )}

      <button
        type="button"
        onClick={closePanel}
        className="p-1.5 rounded-md text-stone-500 hover:text-stone-300 hover:bg-[#2A2A2A] transition-colors"
        title="Close"
      >
        <X size={14} />
      </button>
    </div>
  );
}
