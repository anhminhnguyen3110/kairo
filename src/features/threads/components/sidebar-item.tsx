'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import { MoreHorizontal, Pencil, Trash2, Copy, Check, X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Thread } from '@/types';
import { useUpdateThread, useDeleteThread, useCloneThread } from '../hooks/use-threads';
import { useChatStore } from '@/stores/chat-store';
import { useClickOutside } from '@/lib/hooks/use-click-outside';

interface SidebarItemProps {
  thread: Thread;
}

export function SidebarItem({ thread }: SidebarItemProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = pathname === `/threads/${thread.id}`;
  const [menuOpen, setMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(thread.title);
  const [prevTitle, setPrevTitle] = useState(thread.title);

  if (thread.title !== prevTitle) {
    setPrevTitle(thread.title);
    if (!isRenaming) setRenameValue(thread.title);
  }

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const setActiveThread = useChatStore((s) => s.setActiveThread);

  const { mutate: updateThread } = useUpdateThread();
  const { mutate: deleteThread } = useDeleteThread();
  const { mutate: cloneThread } = useCloneThread();

  useEffect(() => {
    if (isRenaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isRenaming]);

  useClickOutside(
    menuRef,
    useCallback(() => {
      setMenuOpen(false);
      setConfirmingDelete(false);
    }, []),
  );

  const handleRenameSubmit = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== thread.title) {
      updateThread({ id: thread.id, payload: { title: trimmed } });
    }
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRenameSubmit();
    if (e.key === 'Escape') {
      setRenameValue(thread.title);
      setIsRenaming(false);
    }
  };

  if (isRenaming) {
    return (
      <div className="flex items-center gap-1 px-2 py-1.5">
        <input
          ref={inputRef}
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={handleRenameKeyDown}
          onBlur={handleRenameSubmit}
          className="flex-1 min-w-0 px-2 py-1 text-[13px] bg-[#2A2824] text-sidebar-text
                     rounded-md border border-[#4A4540] outline-none
                     focus:border-[#CC785C] transition-colors"
        />
        <button
          onClick={handleRenameSubmit}
          className="p-1 rounded text-sidebar-muted hover:text-[#CC785C] transition-colors"
          title="Confirm"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => {
            setRenameValue(thread.title);
            setIsRenaming(false);
          }}
          className="p-1 rounded text-sidebar-muted hover:text-sidebar-text transition-colors"
          title="Cancel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative group">
      <Link
        href={`/threads/${thread.id}`}
        onClick={() => setActiveThread(thread.id)}
        className={cn(
          'flex items-center w-full pl-3 pr-2 py-[7px] rounded-md text-[13px]',
          'text-sidebar-text hover:bg-sidebar-hover transition-colors',
          isActive
            ? 'bg-sidebar-active border-l-2 border-[#CC785C] pl-[10px]'
            : 'border-l-2 border-transparent',
        )}
      >
        {}
        <span
          key={thread.title}
          className={cn(
            'flex-1 min-w-0 leading-5 truncate animate-title-in',
            'group-hover:[mask-image:linear-gradient(to_right,#000_60%,transparent_90%)]',
            menuOpen && '[mask-image:linear-gradient(to_right,#000_60%,transparent_90%)]',
          )}
        >
          {thread.title}
        </span>
      </Link>

      {}
      <div
        className={cn(
          'absolute right-1 top-1/2 -translate-y-1/2',
          'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
          menuOpen && 'opacity-100',
        )}
      >
        <button
          onClick={(e) => {
            e.preventDefault();
            setMenuOpen((v) => !v);
            setConfirmingDelete(false);
          }}
          className="p-1 rounded text-sidebar-muted hover:text-sidebar-text hover:bg-[#35322A] transition-colors"
          title="More options"
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      {}
      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full z-50 mt-1 w-44
                     bg-[#252220] border border-[#3A3632] rounded-xl shadow-2xl
                     overflow-hidden py-1"
        >
          {!confirmingDelete ? (
            <>
              <button
                onClick={() => {
                  setIsRenaming(true);
                  setMenuOpen(false);
                }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px]
                           text-sidebar-text hover:bg-sidebar-hover transition-colors"
              >
                <Pencil className="w-3.5 h-3.5 text-sidebar-muted shrink-0" />
                Rename
              </button>
              <button
                onClick={() => {
                  cloneThread({ id: thread.id });
                  setMenuOpen(false);
                }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px]
                           text-sidebar-text hover:bg-sidebar-hover transition-colors"
              >
                <Copy className="w-3.5 h-3.5 text-sidebar-muted shrink-0" />
                Clone
              </button>
              <div className="my-1 mx-2 border-t border-[#3A3632]" />
              <button
                onClick={() => setConfirmingDelete(true)}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px]
                           text-red-400/90 hover:bg-sidebar-hover hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                Delete
              </button>
            </>
          ) : (
            <div className="px-3 py-2">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span className="text-[12px] text-red-400 font-medium">Delete thread?</span>
              </div>
              <p className="text-[11px] text-sidebar-muted mb-3 leading-snug">
                This cannot be undone.
              </p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    if (isActive) router.push('/threads');
                    deleteThread(thread.id);
                    setMenuOpen(false);
                    setConfirmingDelete(false);
                  }}
                  className="flex-1 px-2 py-1 text-[12px] rounded-md bg-red-500/20 text-red-400
                             border border-red-500/30 hover:bg-red-500/30 transition-colors font-medium"
                >
                  Delete
                </button>
                <button
                  onClick={() => setConfirmingDelete(false)}
                  className="flex-1 px-2 py-1 text-[12px] rounded-md bg-[#35322A] text-sidebar-text
                             border border-[#4A4540] hover:bg-sidebar-hover transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
