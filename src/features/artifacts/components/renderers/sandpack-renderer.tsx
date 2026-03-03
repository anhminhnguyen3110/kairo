'use client';

import { useState } from 'react';
import { Play, Code2 } from 'lucide-react';
import {
  SandpackProvider,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackLayout,
} from '@codesandbox/sandpack-react';
import { githubLight } from '@codesandbox/sandpack-themes';
import { cn } from '@/lib/utils';

interface SandpackRendererProps {
  code: string;

  language?: string;
}

export function SandpackRenderer({ code }: SandpackRendererProps) {
  const [tab, setTab] = useState<'preview' | 'code'>('preview');

  const files = {
    '/App.js': code,
  };

  return (
    <div className="flex flex-col h-full">
      {}
      <div className="flex gap-1 px-3 py-2 border-b border-stone-200 bg-stone-50 shrink-0">
        <TabButton active={tab === 'preview'} onClick={() => setTab('preview')}>
          <Play size={12} />
          Preview
        </TabButton>
        <TabButton active={tab === 'code'} onClick={() => setTab('code')}>
          <Code2 size={12} />
          Code
        </TabButton>
      </div>

      {}
      <div className="flex-1 overflow-hidden">
        <SandpackProvider
          template="react"
          files={files}
          theme={githubLight}
          options={{ externalResources: ['https://cdn.tailwindcss.com'] }}
        >
          <SandpackLayout className="!rounded-none !border-0 h-full">
            {tab === 'code' && (
              <SandpackCodeEditor showLineNumbers showTabs={false} style={{ height: '100%' }} />
            )}
            {tab === 'preview' && (
              <SandpackPreview showNavigator={false} style={{ height: '100%' }} />
            )}
          </SandpackLayout>
        </SandpackProvider>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
        active
          ? 'bg-white text-stone-800 shadow-sm border border-stone-200'
          : 'text-stone-500 hover:text-stone-700',
      )}
    >
      {children}
    </button>
  );
}
