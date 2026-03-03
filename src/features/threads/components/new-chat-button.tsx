'use client';

import { useRouter } from 'next/navigation';
import { SquarePen } from 'lucide-react';
import { useChatStore } from '@/stores/chat-store';

export function NewChatButton() {
  const router = useRouter();
  const setActiveThread = useChatStore((s) => s.setActiveThread);

  const handleClick = () => {
    setActiveThread(null);
    router.push('/threads');
  };

  return (
    <button
      onClick={handleClick}
      title="New chat"
      className="
        p-1.5 rounded-md text-sidebar-muted
        hover:bg-sidebar-hover hover:text-sidebar-text
        transition-colors
      "
    >
      <SquarePen className="w-4 h-4" />
    </button>
  );
}
