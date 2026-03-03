'use client';

import { useState, useCallback } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { LlmProvider } from '@/types';
import { cn } from '@/lib/utils';

const PROVIDERS: { value: LlmProvider; label: string; color: string }[] = [
  { value: 'OPENAI', label: 'GPT-4o', color: 'text-green-600' },
  { value: 'CLAUDE', label: 'Claude 3.5', color: 'text-orange-600' },
  { value: 'GEMINI', label: 'Gemini 1.5', color: 'text-blue-600' },
  { value: 'OPENAI_COMPATIBLE', label: 'Custom', color: 'text-purple-600' },
];

interface LlmProviderSelectProps {
  value: LlmProvider;
  onChange: (value: LlmProvider) => void;
  disabled?: boolean;
}

export function LlmProviderSelect({ value, onChange, disabled }: LlmProviderSelectProps) {
  const [open, setOpen] = useState(false);

  const current = PROVIDERS.find((p) => p.value === value) ?? PROVIDERS[0];

  const handleSelect = useCallback(
    (v: LlmProvider) => {
      onChange(v);
      setOpen(false);
    },
    [onChange],
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm',
          'bg-[#EFEDE7] hover:bg-[#E2DDD7] transition-colors',
          'text-stone-600 hover:text-stone-800',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <span className={cn('font-medium', current.color)}>{current.label}</span>
        <ChevronDown size={13} className="text-stone-400" />
      </button>

      {open && (
        <>
          {}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          {}
          <ul
            className="
              absolute left-0 mt-1 z-20
              bg-[#F5F4EF] border border-[#E2DDD7] rounded-xl shadow-lg
              py-1 min-w-[140px]
            "
          >
            {PROVIDERS.map((p) => (
              <li key={p.value}>
                <button
                  type="button"
                  onClick={() => handleSelect(p.value)}
                  className="
                    w-full flex items-center justify-between
                    px-3 py-2 text-sm
                    hover:bg-[#EFEDE7] transition-colors
                  "
                >
                  <span className={cn('font-medium', p.color)}>{p.label}</span>
                  {p.value === value && <Check size={13} className="text-stone-500" />}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
