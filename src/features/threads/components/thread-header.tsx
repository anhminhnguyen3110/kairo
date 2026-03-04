'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Paperclip, Pencil, Check, X, Menu } from 'lucide-react';
import { Thread } from '@/types';
import { useUpdateThread } from '../hooks/use-threads';
import { useUiStore } from '@/stores/ui-store';

interface ThreadHeaderProps {
  thread: Thread;
}

export function ThreadHeader({ thread }: ThreadHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(thread.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutate: updateThread } = useUpdateThread();
  const { toggleFilePanel, toggleSidebar } = useUiStore();

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
      {/* Hamburger – mobile only, opens sidebar */}
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
          <>
            <span
              key={thread.title}
              className="flex-1 min-w-0 truncate text-sm font-medium text-[#ECECEC] animate-title-in"
            >
              {thread.title}
            </span>
            <button
              type="button"
              onClick={startEdit}
              className="
                p-1 rounded text-stone-500 hover:text-stone-300 hover:bg-[#333333]
                transition-colors shrink-0
                opacity-100 md:opacity-0 md:group-hover/title:opacity-100
              "
              title="Rename thread"
            >
              <Pencil size={13} />
            </button>
          </>
        )}
      </div>

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
