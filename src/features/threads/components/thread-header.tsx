'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Paperclip, Pencil, Check, X, Menu, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Thread } from '@/types';
import { useUpdateThread } from '../hooks/use-threads';
import { useUiStore } from '@/stores/ui-store';
import { useChatStore } from '@/stores/chat-store';

interface ThreadHeaderProps {
  thread: Thread;
}

export function ThreadHeader({ thread }: ThreadHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(thread.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutate: updateThread } = useUpdateThread();
  const { toggleFilePanel, toggleSidebar } = useUiStore();
  const setActiveThread = useChatStore((s) => s.setActiveThread);
  const router = useRouter();

  const handleNewChat = useCallback(() => {
    setActiveThread(null);
    router.push('/threads');
  }, [router, setActiveThread]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(thread.title);
  }, [thread.title]);

  const startEdit = useCallback(() => {
    setEditing(true);
    setTimeout(() => {
      inputRef.current?.select();
    }, 0);
  }, []);

  const commitEdit = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== thread.title) {
      updateThread({ id: thread.id, payload: { title: trimmed } });
    } else {
      setDraft(thread.title);
    }
    setEditing(false);
  }, [draft, thread, updateThread]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') commitEdit();
      if (e.key === 'Escape') {
        setDraft(thread.title);
        setEditing(false);
      }
    },
    [commitEdit, thread.title],
  );

  return (
    <header className="flex items-center gap-3 px-4 py-3 border-b border-chat-border bg-chat-bg">
      <button
        type="button"
        onClick={toggleSidebar}
        className="md:hidden p-1.5 rounded-lg text-stone-400 hover:text-stone-300 hover:bg-[#333333] transition-colors shrink-0"
        title="Open menu"
      >
        <Menu size={18} />
      </button>
      <div className="flex-1 min-w-0 flex items-center gap-2 group/title">
        {editing ? (
          <>
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleKeyDown}
              className="
                flex-1 min-w-0 bg-transparent text-sm font-medium text-[#ECECEC]
                outline-none border-b border-stone-600 pb-0.5
                focus:border-[#CC785C]
              "
            />
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                commitEdit();
              }}
              className="p-1 rounded text-emerald-400 hover:bg-[#333333] transition-colors shrink-0"
              title="Save"
            >
              <Check size={14} />
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setDraft(thread.title);
                setEditing(false);
              }}
              className="p-1 rounded text-stone-400 hover:bg-[#333333] transition-colors shrink-0"
              title="Cancel"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <button
            key={thread.title}
            type="button"
            onClick={startEdit}
            title="Rename thread"
            className="
              flex-1 min-w-0 flex items-center gap-1.5 group/rename
              text-left cursor-pointer
            "
          >
            <span className="min-w-0 truncate text-sm font-medium text-[#ECECEC] animate-title-in">
              {thread.title}
            </span>
            <Pencil
              size={12}
              className="
                shrink-0 text-stone-500 group-hover/rename:text-stone-300
                opacity-0 group-hover/rename:opacity-100
                transition-all
              "
            />
          </button>
        )}
      </div>

      {}
      <button
        type="button"
        onClick={handleNewChat}
        className="
          p-1.5 rounded-lg text-[#CC785C] hover:text-[#e0885c]
          hover:bg-[#333333] transition-colors
        "
        title="New chat"
      >
        <Plus size={16} />
      </button>

      {}
      <button
        type="button"
        onClick={toggleFilePanel}
        className="
          p-1.5 rounded-lg text-stone-400 hover:text-stone-300
          hover:bg-[#333333] transition-colors
        "
        title="Attach files"
      >
        <Paperclip size={16} />
      </button>
    </header>
  );
}
