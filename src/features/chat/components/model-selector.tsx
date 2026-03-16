/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Cpu, ChevronLeft, Check, X, Loader2, Search } from 'lucide-react';
import { useModels } from '../hooks/use-models';
import { useModelStore } from '@/stores/model-store';
import { useChatStore } from '@/stores/chat-store';
import type { LlmProvider } from '@/types';
import { cn } from '@/lib/utils';
import { useClickOutside } from '@/lib/hooks/use-click-outside';

type Step = 'provider' | 'model';

export function ModelSelector() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('provider');
  const [activeProvider, setActiveProvider] = useState<LlmProvider | null>(null);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: providers, isLoading } = useModels();
  const { selection, setSelection } = useModelStore();
  const isStreaming = useChatStore((s) => s.streamingStatus === 'streaming');

  useClickOutside(
    containerRef,
    useCallback(() => setOpen(false), []),
  );

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open]);

  useEffect(() => {
    if (selection !== null || !providers) return;
    const DEFAULT_PROVIDER = 'OPENAI_COMPATIBLE' as const;
    const DEFAULT_MODEL = 'openai/gpt-oss-120b';
    const p = providers.find((x) => x.provider === DEFAULT_PROVIDER && x.configured);
    if (p && p.models.some((m) => m.id === DEFAULT_MODEL)) {
      setSelection({ provider: DEFAULT_PROVIDER, model: DEFAULT_MODEL, providerLabel: p.label });
    }
  }, [providers, selection, setSelection]);

  useEffect(() => {
    if (!open) {
      setStep('provider');
    }
    if (open) {
      setActiveProvider(null);
      setSearch('');
    }
  }, [open]);

  useEffect(() => {
    if (step === 'model' && search !== '') {
      setTimeout(() => searchRef.current?.focus(), 50);
      setSearch('');
    }
  }, [step, search]);

  const configured = providers?.filter((p) => p.configured && p.models.length > 0) ?? [];

  const activeProviderData = configured.find((p) => p.provider === activeProvider) ?? null;
  const query = search.trim().toLowerCase();
  const dedupedModels = (() => {
    if (!activeProviderData) return [];
    const seen = new Set<string>();
    return activeProviderData.models.filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  })();
  const filteredModels = query
    ? dedupedModels.filter((m) => m.id.toLowerCase().includes(query))
    : dedupedModels;

  const label = selection
    ? `${selection.providerLabel} · ${truncate(selection.model, 28)}`
    : 'Default';

  function goToModels(providerKey: LlmProvider) {
    setActiveProvider(providerKey);
    setStep('model');
  }

  function selectModel(providerKey: LlmProvider, providerLabel: string, modelId: string) {
    setSelection({ provider: providerKey, model: modelId, providerLabel });
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      {}
      <button
        type="button"
        onClick={() => !isStreaming && setOpen((v) => !v)}
        disabled={isStreaming}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs',
          'text-stone-400 hover:text-stone-200 hover:bg-[#333333] transition-colors',
          open && 'text-stone-200 bg-[#333333]',
          isStreaming && 'opacity-50 cursor-not-allowed hover:bg-transparent hover:text-stone-400',
        )}
        title={isStreaming ? 'Cannot change model while streaming' : 'Select model'}
      >
        {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Cpu size={13} />}
        <span className="max-w-[160px] truncate">{label}</span>
        {selection && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              setSelection(null);
              setOpen(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                setSelection(null);
                setOpen(false);
              }
            }}
            className="ml-0.5 text-stone-500 hover:text-stone-300"
          >
            <X size={11} />
          </span>
        )}
      </button>

      {}
      {open && (
        <div
          className={cn(
            'absolute bottom-full left-0 mb-1 z-50',
            'w-72 bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl shadow-lg',
            'flex flex-col max-h-[420px]',
          )}
        >
          {}
          {step === 'provider' && (
            <>
              <div className="shrink-0 px-3 pt-2.5 pb-2 text-[11px] font-semibold text-stone-500 uppercase tracking-wide">
                Provider
              </div>

              <div className="overflow-y-auto flex-1 min-h-0 pb-2">
                {}
                <button
                  type="button"
                  onClick={() => {
                    setSelection(null);
                    setOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors',
                    'hover:bg-[#333333]',
                    !selection ? 'text-[#ECECEC] font-medium' : 'text-stone-400',
                  )}
                >
                  <span>Default</span>
                  {!selection && <Check size={13} className="text-stone-300" />}
                </button>

                {configured.length > 0 && <div className="h-px bg-[#3A3A3A] mx-3 my-1" />}

                {}
                {isLoading && (
                  <div className="px-3 py-3 text-sm text-stone-500 flex items-center gap-2">
                    <Loader2 size={13} className="animate-spin" />
                    Loading…
                  </div>
                )}

                {}
                {!isLoading && configured.length === 0 && (
                  <div className="px-3 py-3 text-sm text-stone-500">No providers configured.</div>
                )}

                {}
                {configured.map((p) => {
                  const isActive = selection?.provider === p.provider;
                  return (
                    <button
                      key={p.provider}
                      type="button"
                      onClick={() => goToModels(p.provider)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2.5 text-sm',
                        'hover:bg-[#333333] transition-colors',
                        isActive ? 'text-[#ECECEC]' : 'text-stone-300',
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium truncate">{p.label}</span>
                        {isActive && (
                          <span className="text-[11px] text-stone-500 shrink-0 truncate max-w-[100px]">
                            {truncate(selection!.model, 20)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-stone-600">{p.models.length}</span>
                        <ChevronLeft size={13} className="text-stone-500 rotate-180" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {}
          {step === 'model' && activeProviderData && (
            <>
              {}
              <div className="shrink-0 flex items-center gap-1.5 px-2 pt-2 pb-1.5">
                <button
                  type="button"
                  onClick={() => setStep('provider')}
                  className="p-1 rounded-md text-stone-500 hover:text-stone-200 hover:bg-[#333333] transition-colors"
                  aria-label="Back to providers"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs font-semibold text-stone-300">
                  {activeProviderData.label}
                </span>
              </div>

              {}
              <div className="shrink-0 px-3 pb-2">
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#1E1E1E] border border-[#3A3A3A] focus-within:border-[#555555]">
                  <Search size={12} className="text-stone-500 shrink-0" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search models…"
                    className="flex-1 bg-transparent text-xs text-[#ECECEC] placeholder:text-stone-600 outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.stopPropagation();
                        if (search) setSearch('');
                        else setStep('provider');
                      }
                    }}
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch('');
                        searchRef.current?.focus();
                      }}
                      className="text-stone-500 hover:text-stone-300"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
              </div>

              {}
              <div className="overflow-y-auto flex-1 min-h-0 pb-2">
                {filteredModels.length === 0 && (
                  <div className="px-3 py-3 text-sm text-stone-500">
                    {query ? `No models match "${search}"` : 'No models available.'}
                  </div>
                )}

                {filteredModels.map((m) => {
                  const isSelected =
                    selection?.provider === activeProvider && selection?.model === m.id;
                  return (
                    <button
                      key={`${activeProvider}::${m.id}`}
                      type="button"
                      onClick={() =>
                        selectModel(activeProviderData.provider, activeProviderData.label, m.id)
                      }
                      className={cn(
                        'w-full flex items-center justify-between',
                        'px-3 py-2 text-xs text-left',
                        'hover:bg-[#333333] transition-colors',
                        isSelected ? 'text-[#ECECEC] font-medium' : 'text-stone-400',
                      )}
                    >
                      <span className="truncate max-w-[220px]">
                        {query ? highlightMatch(m.id, query) : m.id}
                      </span>
                      {isSelected && <Check size={12} className="text-stone-300 shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function truncate(str: string, max: number) {
  return str.length <= max ? str : `…${str.slice(-(max - 1))}`;
}

function highlightMatch(text: string, query: string) {
  const idx = text.toLowerCase().indexOf(query);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-transparent text-[#ECECEC] font-semibold">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}
