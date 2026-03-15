'use client';

import { memo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CopyButton } from '@/components/copy-button';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';

function preprocessContent(content: string): string {
  let result = content.replace(/\\\[([\s\S]*?)\\\]/g, (_match, math: string) => {
    return `$$\n${math.trim()}\n$$`;
  });
  result = result.replace(/\\\(([\s\S]*?)\\\)/g, (_match, math: string) => {
    return `$${math.trim()}$`;
  });
  result = result.replace(/\[([^\[\]]*?\\[a-zA-Z][^\[\]]*?)\]/g, (_match, math: string) => {
    return `$$\n${math.trim()}\n$$`;
  });

  result = result.replace(/&lt;br\s*\/?[&]*gt;/gi, '\n\n');
  result = result.replace(/<br\s*\/?>/gi, '\n\n');
  return result;
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  return (
    <div className="group/code my-4 rounded-xl overflow-hidden border border-[#2D2D2D] bg-[#1E1E1E]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#161616] border-b border-[#2D2D2D]">
        <span className="text-[11px] font-mono font-medium text-stone-500 uppercase tracking-wider">
          {language || 'code'}
        </span>
        <CopyButton content={code} />
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '1rem',
          background: '#1E1E1E',
          fontSize: '0.8125rem',
          lineHeight: '1.6',
          borderRadius: 0,
        }}
        codeTagProps={{ style: { fontFamily: 'var(--font-mono), JetBrains Mono, monospace' } }}
        showLineNumbers={code.split('\n').length > 6}
        lineNumberStyle={{
          color: '#4A4A4A',
          fontSize: '0.75rem',
          minWidth: '2.5rem',
          paddingRight: '1rem',
          userSelect: 'none',
        }}
        wrapLongLines={false}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

const markdownComponents: Components = {
  code({ className, children, ...rest }) {
    const match = /language-(\w+)/.exec(className ?? '');
    const isBlock =
      !!match || (typeof children === 'string' && (children as string).includes('\n'));

    if (isBlock) {
      const code = String(children).replace(/\n$/, '');
      return <CodeBlock language={match?.[1] ?? ''} code={code} />;
    }

    return (
      <code
        className="px-1.5 py-0.5 rounded-md text-[0.82em] font-mono bg-[#2A2A2A] text-[#E8C98A] border border-[#3A3A3A]"
        {...rest}
      >
        {children}
      </code>
    );
  },

  pre({ children }) {
    return <>{children}</>;
  },

  h1: ({ children }) => (
    <h1 className="text-xl font-bold text-[#ECECEC] mt-6 mb-3 pb-2 border-b border-[#3A3A3A] first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-semibold text-[#ECECEC] mt-5 mb-2.5 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold text-[#D4D0C8] mt-4 mb-2 first:mt-0">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-sm font-semibold text-[#D4D0C8] mt-3 mb-1.5 first:mt-0">{children}</h4>
  ),

  p: ({ children }) => (
    <p className="leading-[1.75] my-3 text-[#ECECEC] first:mt-0 last:mb-0">{children}</p>
  ),

  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#CC785C] hover:text-[#E09070] underline underline-offset-2 decoration-[#CC785C]/40 hover:decoration-[#E09070] inline-flex items-baseline gap-0.5 transition-colors"
    >
      {children}
      <ExternalLink size={10} className="self-center shrink-0 opacity-60" />
    </a>
  ),

  ul: ({ children }) => (
    <ul className="my-3 pl-5 space-y-1 list-disc marker:text-[#CC785C]/70 first:mt-0 last:mb-0">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 pl-5 space-y-1 list-decimal marker:text-[#CC785C] marker:font-medium first:mt-0 last:mb-0">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="text-[#ECECEC] leading-[1.7] pl-0.5">{children}</li>,

  blockquote: ({ children }) => (
    <blockquote className="my-4 pl-4 border-l-2 border-[#CC785C]/50 bg-[#CC785C]/5 rounded-r-lg py-2 pr-3 text-[#B0AAA0] italic">
      {children}
    </blockquote>
  ),

  hr: () => <hr className="my-5 border-[#3A3A3A]" />,

  strong: ({ children }) => <strong className="font-semibold text-[#ECECEC]">{children}</strong>,
  em: ({ children }) => <em className="italic text-[#D4D0C8]">{children}</em>,

  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-xl border border-[#3A3A3A]">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-[#252525] border-b border-[#3A3A3A]">{children}</thead>
  ),
  tbody: ({ children }) => <tbody className="divide-y divide-[#2D2D2D]">{children}</tbody>,
  tr: ({ children }) => <tr className="hover:bg-[#252525] transition-colors">{children}</tr>,
  th: ({ children }) => (
    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="px-4 py-2.5 text-[#ECECEC] text-sm">{children}</td>,
};

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  className,
}: MarkdownRendererProps) {
  return (
    <div className={cn('text-sm text-[#ECECEC]', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex]}
        components={markdownComponents}
      >
        {preprocessContent(content)}
      </ReactMarkdown>
    </div>
  );
});
