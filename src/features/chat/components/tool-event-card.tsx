'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Globe,
  Brain,
  FileText,
  Edit3,
  ScanSearch,
  FilePen,
  Wrench,
  CheckCircle2,
  Code2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TavilyResult, TavilyResponse } from '../types/chat.types';

interface ToolEventCardProps {
  name: string;
  input: Record<string, unknown>;
  output?: unknown;
  status: 'pending' | 'done';
}

function normalizeInput(raw: Record<string, unknown>): Record<string, unknown> {
  if (Object.keys(raw).length === 1 && 'input' in raw) {
    const inner = raw.input;
    if (typeof inner === 'string') {
      try {
        return JSON.parse(inner) as Record<string, unknown>;
      } catch {
        return { value: inner };
      }
    }
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      return inner as Record<string, unknown>;
    }
  }
  return raw;
}

/**
 * LangGraph's on_tool_end emits a ToolMessage object as `output`, not the raw
 * string returned by the tool. After JSON.stringify/parse round-trip through SSE,
 * LangChain's toJSON() produces the constructor serialization format:
 *   { lc: 1, type: "constructor", id: [..., "ToolMessage"], kwargs: { content: "<json>", ... } }
 *
 * This function handles all known shapes and returns the parsed tool output.
 */
function normalizeOutput(output: unknown): unknown {
  if (output === undefined || output === null) return output;
  if (typeof output === 'object') {
    const obj = output as Record<string, unknown>;
    // LangChain serialization format: { lc: 1, type: 'constructor', id: [...], kwargs: { content: "..." } }
    if (typeof obj.lc === 'number' && obj.kwargs && typeof obj.kwargs === 'object') {
      const kwargs = obj.kwargs as Record<string, unknown>;
      if (typeof kwargs.content === 'string') {
        try {
          return JSON.parse(kwargs.content) as unknown;
        } catch {
          return kwargs.content;
        }
      }
    }
    // Also handle older lc_serializable format: { lc_serializable: true, lc_kwargs: { content: "..." } }
    if (obj.lc_serializable === true && obj.lc_kwargs && typeof obj.lc_kwargs === 'object') {
      const kwargs = obj.lc_kwargs as Record<string, unknown>;
      if (typeof kwargs.content === 'string') {
        try {
          return JSON.parse(kwargs.content) as unknown;
        } catch {
          return kwargs.content;
        }
      }
    }
    // Plain ToolMessage shape (content or output field directly on the object)
    const raw =
      typeof obj.content === 'string'
        ? obj.content
        : typeof obj.output === 'string'
          ? obj.output
          : null;
    if (raw !== null) {
      try {
        return JSON.parse(raw) as unknown;
      } catch {
        return raw;
      }
    }
    // If neither field is a plain string, return the object itself
    return output;
  }
  if (typeof output === 'string') {
    try {
      return JSON.parse(output) as unknown;
    } catch {
      return output;
    }
  }
  return output;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

const DOMAIN_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-orange-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-amber-500',
  'bg-rose-500',
];
function domainColor(domain: string): string {
  let h = 0;
  for (let i = 0; i < domain.length; i++) h = (h * 31 + domain.charCodeAt(i)) & 0xffff;
  return DOMAIN_COLORS[h % DOMAIN_COLORS.length];
}

function FaviconImg({
  domain,
  initial,
  color,
}: {
  domain: string;
  initial: string;
  color: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className={cn(
          'w-4 h-4 rounded-[3px] flex items-center justify-center shrink-0 text-[8px] font-bold text-white',
          color,
        )}
      >
        {initial}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
      alt={domain}
      width={16}
      height={16}
      className="w-4 h-4 rounded-[3px] shrink-0 object-contain"
      onError={() => setFailed(true)}
    />
  );
}

function WebSearchCard({ input, output, status }: Omit<ToolEventCardProps, 'name'>) {
  const [expanded, setExpanded] = useState(true);
  const parsed = normalizeInput(input);
  const query = String(parsed.query ?? parsed.q ?? Object.values(parsed)[0] ?? '');

  const normalizedOutput = normalizeOutput(output);
  let results: TavilyResult[] = [];
  if (normalizedOutput) {
    try {
      const parsed2: TavilyResponse =
        typeof normalizedOutput === 'string'
          ? JSON.parse(normalizedOutput)
          : (normalizedOutput as TavilyResponse);
      results = parsed2.results ?? [];
    } catch {}
  }
  const count = results.length;

  return (
    <div className="mb-3 rounded-xl border border-white/[0.07] bg-white/[0.03] overflow-hidden text-xs">
      {}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left hover:bg-white/[0.04] transition-colors"
      >
        {status === 'pending' ? (
          <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin shrink-0" />
        ) : (
          <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        )}
        <span className="flex-1 truncate text-stone-200 font-medium">{query || 'Web Search'}</span>
        {count > 0 && (
          <span className="shrink-0 text-[11px] text-stone-400 mr-1">{count} results</span>
        )}
        {status !== 'pending' && (
          <span className="shrink-0 text-stone-500">
            {expanded ? (
              <ChevronDown size={13} />
            ) : (
              <ChevronDown size={13} className="-rotate-90" />
            )}
          </span>
        )}
      </button>

      {}
      {expanded && results.length > 0 && (
        <div className="border-t border-white/[0.07] max-h-[240px] overflow-y-auto">
          {results.map((r, i) => {
            const domain = getDomain(r.url ?? '');
            const initial = domain[0]?.toUpperCase() ?? '?';
            const color = domainColor(domain);
            return (
              <a
                key={i}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.05] transition-colors border-b border-white/[0.04] last:border-0"
              >
                <FaviconImg domain={domain} initial={initial} color={color} />
                {}
                <span className="flex-1 truncate text-stone-300 leading-5">
                  {r.title ?? domain}
                </span>
                {}
                <span className="shrink-0 text-stone-500 text-[11px] ml-2">{domain}</span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ThinkCard({ input, status }: Omit<ToolEventCardProps, 'name' | 'output'>) {
  const [expanded, setExpanded] = useState(true);
  const parsed = normalizeInput(input);
  const thought = String(
    parsed.thought ?? parsed.thinking ?? parsed.content ?? Object.values(parsed)[0] ?? '',
  );

  const summary = thought.split(/[.\n]/)[0]?.trim().slice(0, 90) ?? '';

  return (
    <div className="mb-3 rounded-xl border border-white/[0.07] bg-white/[0.03] overflow-hidden text-xs">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 w-full px-3 py-2.5 text-left hover:bg-white/[0.04] transition-colors"
      >
        {status === 'pending' ? (
          <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin shrink-0" />
        ) : (
          <Brain className="w-3.5 h-3.5 text-purple-400/70 shrink-0" />
        )}
        <span className="flex-1 truncate italic text-stone-400">{summary || 'Thinking…'}</span>
        {thought.length > 0 && (
          <span className="shrink-0 text-stone-500 ml-1">
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </span>
        )}
      </button>

      {expanded && thought && (
        <div className="border-t border-white/[0.07] px-3 py-2.5">
          <p className="text-stone-400 italic leading-relaxed whitespace-pre-wrap">{thought}</p>
        </div>
      )}
    </div>
  );
}

const TOOL_META: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  read_file: { icon: <FileText size={12} />, label: 'Read File', color: 'text-emerald-400' },
  write_file: { icon: <FilePen size={12} />, label: 'Write File', color: 'text-amber-400' },
  edit_file: { icon: <Edit3 size={12} />, label: 'Edit File', color: 'text-orange-400' },
  search_files: { icon: <ScanSearch size={12} />, label: 'Search Files', color: 'text-cyan-400' },
  extract_document: { icon: <FileText size={12} />, label: 'Extract Doc', color: 'text-stone-400' },
};

function renderValue(val: unknown, depth = 0): React.ReactNode {
  if (val === null || val === undefined) return <span className="text-stone-500">null</span>;
  if (typeof val === 'boolean') return <span className="text-amber-400">{String(val)}</span>;
  if (typeof val === 'number') return <span className="text-cyan-400">{val}</span>;
  if (typeof val === 'string') {
    if (val.length > 300)
      return (
        <span className="text-stone-300 break-words">
          &ldquo;{val.slice(0, 300)}
          <span className="text-stone-500">â€¦({val.length} chars)</span>&rdquo;
        </span>
      );
    return <span className="text-stone-300 break-words">&ldquo;{val}&rdquo;</span>;
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return <span className="text-stone-500">[]</span>;
    return (
      <span>
        <span className="text-stone-500">[</span>
        {val.slice(0, 5).map((item, i) => (
          <div key={i} className={cn('ml-4', depth > 0 && 'ml-2')}>
            {renderValue(item, depth + 1)}
            {i < Math.min(val.length, 5) - 1 && <span className="text-stone-600">,</span>}
          </div>
        ))}
        {val.length > 5 && <div className="ml-4 text-stone-500">â€¦{val.length - 5} more</div>}
        <span className="text-stone-500">]</span>
      </span>
    );
  }
  if (typeof val === 'object') {
    const entries = Object.entries(val as Record<string, unknown>).slice(0, 10);
    return (
      <span>
        <span className="text-stone-500">{'{'}</span>
        {entries.map(([k, v], i) => (
          <div key={k} className="ml-4">
            <span className="text-sky-300">{k}</span>
            <span className="text-stone-500">: </span>
            {renderValue(v, depth + 1)}
            {i < entries.length - 1 && <span className="text-stone-600">,</span>}
          </div>
        ))}
        <span className="text-stone-500">{'}'}</span>
      </span>
    );
  }
  return <span className="text-stone-300">{JSON.stringify(val)}</span>;
}

function GenericToolCard({ name, input, output, status }: ToolEventCardProps) {
  const [expanded, setExpanded] = useState(true);
  const meta = TOOL_META[name];
  const parsedInput = normalizeInput(input);
  const inputEntries = Object.entries(parsedInput);
  const previewEntry = inputEntries.find(([, v]) => typeof v === 'string');
  const previewText = previewEntry
    ? String(previewEntry[1]).slice(0, 60) + (String(previewEntry[1]).length > 60 ? 'â€¦' : '')
    : null;

  return (
    <div className="mb-2 rounded-xl border border-white/[0.06] bg-white/[0.03] overflow-hidden text-xs">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left hover:bg-white/[0.04] transition-colors"
      >
        {status === 'pending' ? (
          <Loader2 className="w-3.5 h-3.5 text-[#CC785C] animate-spin shrink-0" />
        ) : (
          <CheckCircle2 className={cn('w-3.5 h-3.5 shrink-0', meta?.color ?? 'text-stone-400')} />
        )}
        <span className={cn('shrink-0', meta?.color ?? 'text-stone-400')}>
          {meta?.icon ?? <Wrench size={12} />}
        </span>
        <span className="text-stone-300 font-medium">
          {status === 'pending' ? 'Using' : 'Used'}{' '}
          <span className={cn('font-mono', meta?.color ?? 'text-stone-200')}>
            {meta?.label ?? name}
          </span>
        </span>
        {previewText && !expanded && (
          <span className="flex-1 truncate text-stone-500 font-normal ml-1">â€” {previewText}</span>
        )}
        <span className="ml-auto shrink-0 text-stone-500">
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-white/[0.06]">
          {inputEntries.length > 0 && (
            <div className="px-3 py-2.5">
              <p className="text-[10px] tracking-widest uppercase text-stone-600 mb-2 font-semibold">
                Input
              </p>
              <div className="space-y-1.5">
                {inputEntries.map(([key, val]) => (
                  <div key={key} className="flex gap-2 leading-relaxed">
                    <span className="text-sky-400 font-mono shrink-0">{key}</span>
                    <span className="text-stone-500 shrink-0">·</span>
                    <span className="font-mono">{renderValue(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {output !== undefined &&
            (() => {
              const normOut = normalizeOutput(output);
              const outStr =
                typeof normOut === 'string' ? normOut : JSON.stringify(normOut, null, 2);
              const MAX_OUT = 400;
              const truncated = outStr.length > MAX_OUT;
              return (
                <div className="px-3 py-2.5 border-t border-white/[0.06]">
                  <p className="text-[10px] tracking-widest uppercase text-stone-600 mb-2 font-semibold">
                    Output
                  </p>
                  <pre className="text-[11px] font-mono text-stone-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {outStr.slice(0, MAX_OUT)}
                    {truncated && (
                      <span className="text-stone-600">
                        … ({outStr.length.toLocaleString()} chars)
                      </span>
                    )}
                  </pre>
                </div>
              );
            })()}
        </div>
      )}
    </div>
  );
}

function CreateArtifactCard({ input, status }: Omit<ToolEventCardProps, 'name'>) {
  const parsed = normalizeInput(input);
  const title = String(parsed.title ?? parsed.name ?? 'Artifact');
  const type = String(parsed.type ?? '').toUpperCase();
  const typeLabel = type || 'CODE';

  return (
    <div className="mb-3 rounded-xl border border-white/[0.07] bg-white/[0.03] overflow-hidden text-xs">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        {status === 'pending' ? (
          <Loader2 className="w-3.5 h-3.5 text-[#CC785C] animate-spin shrink-0" />
        ) : (
          <Sparkles className="w-3.5 h-3.5 text-[#CC785C] shrink-0" />
        )}
        <Code2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
        <span className="flex-1 truncate text-stone-300 font-medium">
          {status === 'pending' ? 'Creating' : 'Created'}{' '}
          <span className="text-stone-200">{title}</span>
        </span>
        <span
          className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide
                         text-stone-400 bg-stone-400/10"
        >
          {typeLabel}
        </span>
        {status === 'done' && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />}
      </div>
    </div>
  );
}

export function ToolEventCard(props: ToolEventCardProps) {
  if (props.name === 'web_search') return <WebSearchCard {...props} />;
  if (props.name === 'think') return <ThinkCard {...props} />;
  if (props.name === 'create_artifact') return <CreateArtifactCard {...props} />;
  return <GenericToolCard {...props} />;
}
