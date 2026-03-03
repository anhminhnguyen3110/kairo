'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Code2, Search, Lightbulb } from 'lucide-react';
import { MessageInput } from '@/features/chat/components/message-input';
import { MessageBubble } from './message-bubble';
import { StreamingBubble } from './streaming-bubble';
import { KairoLogo } from '@/components/kairo-logo';
import { useChatStore } from '@/stores/chat-store';
import { useArtifactStore } from '@/stores/artifact-store';
import { useMe, displayNameFromEmail } from '@/features/user/hooks/use-me';

const SUGGESTIONS = [
  { icon: Pencil, label: 'Write', prompt: 'Help me write ' },
  { icon: Code2, label: 'Code', prompt: 'Write code to ' },
  { icon: Lightbulb, label: 'Analyze', prompt: 'Analyze this: ' },
  { icon: Search, label: 'Search', prompt: 'Search for information about ' },
];

export function NewChatContainer() {
  const router = useRouter();
  const { optimisticMessages, clearOptimisticMessages } = useChatStore();
  const { clearArtifacts } = useArtifactStore();
  const { data: me, isLoading: meLoading } = useMe();
  const displayName = !meLoading && me?.email ? displayNameFromEmail(me.email) : null;

  // Close artifact panel when entering the new-chat (no-thread) state.
  useEffect(() => {
    clearArtifacts();
  }, [clearArtifacts]);

  // Clear optimistic messages on unmount (fires when Next.js finishes navigating
  // to /threads/:id). Deferring to unmount prevents the welcome-screen flash
  // that occurs when clearing synchronously before the route transition completes.
  useEffect(() => {
    return () => {
      clearOptimisticMessages();
    };
  }, [clearOptimisticMessages]);

  const handleNewThread = (newThreadId: number) => {
    router.push(`/threads/${newThreadId}`);
  };

  const hasActivity = optimisticMessages.length > 0;

  return (
    <div className="flex flex-col h-full bg-chat-bg relative">
      {hasActivity ? (
        <>
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-[768px] mx-auto px-6 py-4">
              {optimisticMessages.map((msg) => (
                <MessageBubble key={`optimistic-${msg.id}`} message={msg} />
              ))}
              <StreamingBubble />
            </div>
          </div>
          <MessageInput onNewThread={handleNewThread} />
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-4 gap-0">
          {}
          <div className="flex items-center gap-3 mb-8">
            <KairoLogo size={52} />
            <h1 className="text-[2rem] font-semibold text-[#ECECEC] tracking-tight">
              {displayName ? `Hey there, ${displayName}` : 'How can I help you today?'}
            </h1>
          </div>

          {}
          <MessageInput onNewThread={handleNewThread} variant="centered" />

          {}
          <div className="flex items-center gap-2 mt-4 flex-wrap justify-center">
            {SUGGESTIONS.map(({ icon: Icon, label, prompt }) => (
              <SuggestionPill
                key={label}
                icon={<Icon size={13} />}
                label={label}
                prompt={prompt}
                onNewThread={handleNewThread}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface SuggestionPillProps {
  icon: React.ReactNode;
  label: string;
  prompt: string;
  onNewThread: (id: number) => void;
}

function SuggestionPill({ icon, label }: SuggestionPillProps) {
  return (
    <button
      type="button"
      className="
        flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px]
        bg-[#2A2724] border border-[#3A3632] text-stone-300
        hover:bg-[#35322A] hover:border-[#4A4642] hover:text-stone-100
        transition-colors select-none
      "
    >
      <span className="text-stone-400">{icon}</span>
      {label}
    </button>
  );
}
