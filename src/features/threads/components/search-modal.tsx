/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, MessageSquare } from 'lucide-react';
import { useUiStore } from '@/stores/ui-store';
import { useChatStore } from '@/stores/chat-store';
import { useSearchThreads } from '../hooks/use-threads';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/lib/hooks/use-debounce';

export function SearchModal() {
  const { searchOpen, closeSearch } = useUiStore();
  const setActiveThread = useChatStore((s) => s.setActiveThread);
  const router = useRouter();

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [searchOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (searchOpen) closeSearch();
        else useUiStore.getState().openSearch();
      }
      if (e.key === 'Escape' && searchOpen) {
        closeSearch();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [searchOpen, closeSearch]);

  const { data, isFetching } = useSearchThreads(debouncedQuery);
  const results = data?.data ?? [];

  function handleSelect(threadId: number) {
    setActiveThread(threadId);
    router.push(`/threads/${threadId}`);
    closeSearch();
  }

  if (!searchOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
      onClick={closeSearch}
    >
      {}
      <div className="absolute inset-0 bg-black/50" />

      {}
      <div
        className="relative w-full max-w-[520px] rounded-xl bg-[#2A2824] border border-[#3A3632] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#3A3632]">
          <Search className="w-4 h-4 text-sidebar-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations…"
            className="flex-1 bg-transparent text-[14px] text-sidebar-text placeholder:text-sidebar-muted/60
                       outline-none caret-[#CC785C]"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-0.5 rounded text-sidebar-muted hover:text-sidebar-text transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd
            className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] text-sidebar-muted
                          bg-sidebar-active border border-[#3A3632] font-mono leading-none select-none"
          >
            Esc
          </kbd>
        </div>

        {}
        <div className="max-h-[360px] overflow-y-auto sidebar-scroll">
          {}
          {isFetching && debouncedQuery && (
            <div className="flex justify-center py-4">
              <div className="w-4 h-4 border-2 border-sidebar-muted border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {}
          {!isFetching && debouncedQuery && results.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-[13px] text-sidebar-muted">
                No conversations found for &quot;{debouncedQuery}&quot;
              </p>
            </div>
          )}

          {!debouncedQuery && (
            <div className="py-6 text-center">
              <p className="text-[12px] text-sidebar-muted/60">Type to search your conversations</p>
            </div>
          )}

          {}
          {results.length > 0 && (
            <ul className="py-1.5">
              {results.map((thread) => (
                <li key={thread.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(thread.id)}
                    className={cn(
                      'flex items-center gap-3 w-full px-4 py-2.5 text-left',
                      'hover:bg-sidebar-hover transition-colors',
                    )}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-sidebar-muted shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-sidebar-text truncate">{thread.title}</p>
                      {thread.lastMessage && (
                        <p className="text-[11px] text-sidebar-muted truncate mt-0.5">
                          {thread.lastMessage}
                        </p>
                      )}
                    </div>
                    <span className="text-[11px] text-sidebar-muted/50 shrink-0">
                      {new Date(thread.updatedAt).toLocaleDateString()}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {}
        <div className="px-4 py-2 border-t border-[#3A3632] flex items-center gap-4">
          <span className="text-[11px] text-sidebar-muted/50">
            <kbd className="font-mono">↵</kbd> open &nbsp;·&nbsp;{' '}
            <kbd className="font-mono">Esc</kbd> close
          </span>
          <span className="text-[11px] text-sidebar-muted/50 ml-auto">
            <kbd className="font-mono">Ctrl K</kbd> toggle
          </span>
        </div>
      </div>
    </div>
  );
}
