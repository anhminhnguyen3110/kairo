'use client';

import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CopyButtonProps {
  content: string;
  showLabel?: boolean;
  className?: string;
}

export function CopyButton({ content, showLabel = true, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
    }
  }, [content]);

  if (!showLabel) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void handleCopy();
        }}
        className={cn(
          'p-1 rounded text-stone-500 hover:text-stone-300 transition-colors',
          className,
        )}
        title="Copy"
      >
        {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void handleCopy();
      }}
      className={cn(
        'flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium',
        'text-stone-400 hover:text-stone-200 hover:bg-white/5 transition-all duration-150',
        className,
      )}
    >
      {copied ? (
        <>
          <Check size={12} className="text-green-400" />
          <span className="text-green-400">Copied</span>
        </>
      ) : (
        <>
          <Copy size={12} />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}
