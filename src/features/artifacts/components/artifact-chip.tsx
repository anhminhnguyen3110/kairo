'use client';

import { Code2, FileCode2, Download, Eye } from 'lucide-react';
import { useArtifactStore } from '@/stores/artifact-store';
import { ArtifactType } from '@/types';
import { artifactsApi } from '../api/artifacts-api';
import { TYPE_LABELS, CATEGORY_LABELS } from '../constants';

interface ArtifactChipProps {
  artifactId: string;
  title: string;
  type: ArtifactType;
}

export function ArtifactChip({ artifactId, title, type }: ArtifactChipProps) {
  const { openArtifact } = useArtifactStore();

  const numericId = Number(artifactId);
  const isPersisted = !isNaN(numericId) && numericId > 0;
  const downloadUrl = isPersisted ? artifactsApi.getDownloadUrl(numericId) : null;

  const category = CATEGORY_LABELS[type] ?? 'Code';
  const typeLabel = TYPE_LABELS[type] ?? type;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#1E1E1E] border border-[#2A2A2A] my-1.5 w-full">
      {/* Info — non-clickable */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-[#2A2A2A] border border-[#333333] flex items-center justify-center shrink-0">
          {type === 'mermaid' || type === 'svg' || type === 'code' ? (
            <FileCode2 size={16} className="text-stone-400" />
          ) : (
            <Code2 size={16} className="text-stone-400" />
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium text-stone-200 truncate leading-snug">{title}</span>
          <span className="text-xs text-stone-500 leading-snug">
            {category} · {typeLabel}
          </span>
        </div>
      </div>

      {/* View button */}
      <button
        type="button"
        onClick={() => openArtifact(artifactId)}
        className="shrink-0 px-3 py-1.5 text-sm font-medium text-stone-200
                   bg-[#2A2A2A] hover:bg-[#333333] border border-[#3A3A3A]
                   rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
      >
        <Eye size={13} />
        View
      </button>

      {downloadUrl && (
        <a
          href={downloadUrl}
          download
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 px-3 py-1.5 text-sm font-medium text-stone-200
                     bg-[#2A2A2A] hover:bg-[#333333] border border-[#3A3A3A]
                     rounded-lg transition-colors whitespace-nowrap"
        >
          Download
        </a>
      )}
    </div>
  );
}
