'use client';

import { FileText, FileImage, File } from 'lucide-react';
import { formatBytes } from '@/lib/utils';
import type { FileAttachment } from '@/types';

interface FileBadgeProps {
  file: FileAttachment;
}

const STATUS_COLORS = {
  PENDING: 'bg-amber-900/30 border-amber-700/50 text-amber-400',
  PROCESSED: 'bg-green-900/30 border-green-700/50 text-green-400',
  FAILED: 'bg-red-900/30 border-red-700/50 text-red-400',
};

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith('image/')) return <FileImage size={14} />;
  if (mimeType.includes('pdf') || mimeType.includes('text')) return <FileText size={14} />;
  return <File size={14} />;
}

async function downloadFile(fileId: number, filename: string) {
  const res = await fetch(`/api/proxy/files/${fileId}/download`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function FileBadge({ file }: FileBadgeProps) {
  const colorClass = STATUS_COLORS[file.status] ?? STATUS_COLORS.PENDING;

  return (
    <button
      type="button"
      onClick={() => void downloadFile(file.id, file.originalName)}
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs
        border font-medium transition-opacity hover:opacity-80 cursor-pointer
        ${colorClass}
      `}
      title={`${file.originalName} — ${formatBytes(file.sizeBytes)}`}
    >
      <FileIcon mimeType={file.mimeType} />
      <span className="max-w-[140px] truncate">{file.originalName}</span>
      <span className="opacity-60">{formatBytes(file.sizeBytes)}</span>
    </button>
  );
}
