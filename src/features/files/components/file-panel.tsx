'use client';

import { useCallback, useRef } from 'react';
import { X, Upload, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { useUiStore } from '@/stores/ui-store';
import { useChatStore } from '@/stores/chat-store';
import { useFiles, useUploadFile, useDeleteFile } from '../hooks/use-files';
import { FileBadge } from './file-badge';

const ACCEPTED = '.pdf,.txt,.md,.docx,.doc,.csv,.json,.xml,.html,.htm';
const MAX_SIZE_MB = 25;

export function FilePanel() {
  const { filePanelOpen, toggleFilePanel } = useUiStore();
  const { activeThreadId } = useChatStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const threadId = activeThreadId ?? undefined;

  const { data: files = [], isLoading } = useFiles(threadId);
  const { mutate: uploadFile, isPending: uploading } = useUploadFile(threadId ?? 0);
  const { mutate: deleteFile } = useDeleteFile(threadId ?? 0);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !threadId) return;
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        alert(`File too large. Max size is ${MAX_SIZE_MB} MB.`);
        return;
      }
      uploadFile(file);
      e.target.value = '';
    },
    [threadId, uploadFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (!file || !threadId) return;
      uploadFile(file);
    },
    [threadId, uploadFile],
  );

  if (!filePanelOpen) return null;

  return (
    <div
      className="
        absolute inset-y-0 right-0 z-20
        w-72 bg-[#2A2A2A] border-l border-[#3A3A3A] shadow-lg
        flex flex-col
      "
    >
      {}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#3A3A3A]">
        <span className="text-sm font-semibold text-[#ECECEC]">Attached Files</span>
        <button
          type="button"
          onClick={toggleFilePanel}
          className="p-1 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-[#333333] transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      {}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="
          mx-3 mt-3 rounded-xl border-2 border-dashed border-[#3A3A3A]
          flex flex-col items-center justify-center gap-2 py-5
          text-stone-400 text-xs hover:border-[#555555] transition-colors cursor-pointer
          relative
        "
        onClick={() => threadId && inputRef.current?.click()}
      >
        {uploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
        <span>{uploading ? 'Uploading…' : 'Drop a file or click to upload'}</span>
        <span className="text-stone-600">PDF, TXT, DOCX, etc. — max {MAX_SIZE_MB} MB</span>

        {!threadId && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#2A2A2A]/80 rounded-xl">
            <div className="flex items-center gap-1 text-amber-500 text-xs">
              <AlertCircle size={13} />
              Start a thread first
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={handleFileChange}
          disabled={!threadId || uploading}
        />
      </div>

      {}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {isLoading && (
          <div className="flex justify-center py-6">
            <Loader2 size={16} className="animate-spin text-stone-400" />
          </div>
        )}

        {!isLoading && files.length === 0 && (
          <p className="text-center text-xs text-stone-500 py-6">No files attached yet</p>
        )}

        {files.map((file) => (
          <div key={file.id} className="flex items-start gap-2 group">
            <div className="flex-1 min-w-0">
              <FileBadge file={file} />
            </div>
            <button
              type="button"
              onClick={() => deleteFile(file.id)}
              className="
                mt-1 p-1 rounded text-stone-500
                opacity-0 group-hover:opacity-100
                hover:text-red-400 hover:bg-[#3A1A1A]
                transition-all
              "
              title="Remove file"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
