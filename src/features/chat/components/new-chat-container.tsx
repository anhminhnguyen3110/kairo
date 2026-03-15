'use client';

import { useEffect, useRef, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Menu,
  Globe,
  Sparkles,
  Code2,
  GitBranch,
  Terminal,
  FileText,
  Lightbulb,
  BookMarked,
  type LucideIcon,
} from 'lucide-react';
import { MessageInput, type MessageInputHandle } from '@/features/chat/components/message-input';
import { cn } from '@/lib/utils';
import { MessageBubble } from './message-bubble';
import { StreamingBubble } from './streaming-bubble';
import { KairoLogo } from '@/components/kairo-logo';
import { useChatStore } from '@/stores/chat-store';
import { useArtifactStore } from '@/stores/artifact-store';
import { useMe, displayNameFromEmail } from '@/features/user/hooks/use-me';
import { useUiStore } from '@/stores/ui-store';

interface FeatureChip {
  icon: LucideIcon;
  label: string;
  prompt: string;
}

const FEATURE_CHIPS: FeatureChip[] = [
  {
    icon: Globe,
    label: 'Search the web',
    prompt: 'Search the web for the latest AI news this week and give me a brief summary',
  },
  {
    icon: Sparkles,
    label: 'Create artifact',
    prompt:
      'Build me an interactive HTML page with a color-picker that updates the background in real time',
  },
  {
    icon: Code2,
    label: 'React component',
    prompt:
      'Build a React todo list with add, complete, and delete actions — show it live in the preview panel',
  },
  {
    icon: GitBranch,
    label: 'Draw a diagram',
    prompt: 'Create a mermaid sequence diagram showing how a user logs in with JWT refresh tokens',
  },
  {
    icon: Terminal,
    label: 'Write code',
    prompt:
      'Write a Python script that generates a Fibonacci sequence and plots it as an SVG bar chart',
  },
  {
    icon: FileText,
    label: 'Analyze a file',
    prompt:
      "I'll upload a PDF — extract the key points and format them as a structured markdown summary",
  },
  {
    icon: Lightbulb,
    label: 'Think it through',
    prompt:
      'Think step by step: compare microservices vs monolith architecture and give me a decision framework',
  },
  {
    icon: BookMarked,
    label: 'Remember me',
    prompt:
      "Remember: I'm a senior full-stack engineer who prefers TypeScript, concise answers, and no fluff",
  },
];

export function NewChatContainer() {
  const router = useRouter();
  const inputRef = useRef<MessageInputHandle>(null);
  const { optimisticMessages, clearOptimisticMessages, streamingStatus } = useChatStore();
  const { clearArtifacts } = useArtifactStore();
  const { data: me, isLoading: meLoading } = useMe();
  const displayName = !meLoading && me?.email ? displayNameFromEmail(me.email) : null;
  const { toggleSidebar } = useUiStore();

  useEffect(() => {
    clearArtifacts();
  }, [clearArtifacts]);

  useEffect(() => {
    return () => {
      if (!useChatStore.getState().pendingMessage) {
        clearOptimisticMessages();
      }
    };
  }, [clearOptimisticMessages]);

  const handleNewThread = (newThreadId: number) => {
    startTransition(() => {
      router.push(`/threads/${newThreadId}`);
    });
  };

  const hasActivity = optimisticMessages.length > 0 || streamingStatus === 'error';

  return (
    <div className="flex flex-col h-full bg-chat-bg relative">
      <div className="md:hidden flex items-center gap-3 px-3 py-2 border-b border-chat-border shrink-0">
        <button
          type="button"
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-300 hover:bg-[#333333] transition-colors"
          title="Open menu"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <KairoLogo size={24} />
          <span className="text-[15px] font-semibold text-[#ECECEC] tracking-tight">Kairo</span>
        </div>
      </div>
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
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 mb-8">
            <KairoLogo size={52} />
            <h1 className="text-[1.5rem] sm:text-[2rem] font-semibold text-[#ECECEC] tracking-tight text-center sm:text-left">
              {displayName ? `Hey there, ${displayName}` : 'How can I help you today?'}
            </h1>
          </div>

          <MessageInput ref={inputRef} onNewThread={handleNewThread} variant="centered" />

          <FeatureChips
            onSelect={(prompt) => inputRef.current?.submitWithPrompt(prompt)}
            disabled={streamingStatus !== 'idle'}
          />
        </div>
      )}
    </div>
  );
}

function FeatureChips({
  onSelect,
  disabled,
}: {
  onSelect: (prompt: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2 mt-5 max-w-[560px] w-full">
      {FEATURE_CHIPS.map((chip) => {
        const Icon = chip.icon;
        return (
          <button
            key={chip.label}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(chip.prompt)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full',
              'bg-[#242220] border border-[#3A3632]',
              'text-[12.5px] font-medium text-stone-400 select-none',
              'hover:bg-[#2E2B28] hover:text-stone-200 hover:border-[#524E4A]',
              'active:scale-95 transition-all duration-150 ease-out cursor-pointer',
              disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
            )}
          >
            <Icon size={13} className="shrink-0" />
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
