'use client';

import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

import js from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript';
import ts from 'react-syntax-highlighter/dist/esm/languages/hljs/typescript';
import html from 'react-syntax-highlighter/dist/esm/languages/hljs/xml';
import css from 'react-syntax-highlighter/dist/esm/languages/hljs/css';
import json from 'react-syntax-highlighter/dist/esm/languages/hljs/json';
import python from 'react-syntax-highlighter/dist/esm/languages/hljs/python';
import bash from 'react-syntax-highlighter/dist/esm/languages/hljs/bash';
import markdown from 'react-syntax-highlighter/dist/esm/languages/hljs/markdown';
import sql from 'react-syntax-highlighter/dist/esm/languages/hljs/sql';
import java from 'react-syntax-highlighter/dist/esm/languages/hljs/java';
import rust from 'react-syntax-highlighter/dist/esm/languages/hljs/rust';
import go from 'react-syntax-highlighter/dist/esm/languages/hljs/go';

SyntaxHighlighter.registerLanguage('javascript', js);
SyntaxHighlighter.registerLanguage('typescript', ts);
SyntaxHighlighter.registerLanguage('jsx', js);
SyntaxHighlighter.registerLanguage('tsx', ts);
SyntaxHighlighter.registerLanguage('html', html);
SyntaxHighlighter.registerLanguage('xml', html);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('sh', bash);
SyntaxHighlighter.registerLanguage('markdown', markdown);
SyntaxHighlighter.registerLanguage('sql', sql);
SyntaxHighlighter.registerLanguage('java', java);
SyntaxHighlighter.registerLanguage('rust', rust);
SyntaxHighlighter.registerLanguage('go', go);

const CUSTOM_STYLE: React.CSSProperties = {
  margin: 0,
  padding: '1rem',
  height: '100%',
  background: '#0d1117',
  fontSize: '13px',
  lineHeight: '1.6',
  fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", Consolas, monospace',
  overflowX: 'auto',
};

interface CodeRendererProps {
  code: string;
  language?: string | null;
}

export function CodeRenderer({ code, language }: CodeRendererProps) {
  const lang = language?.toLowerCase() ?? 'text';
  return (
    <div className="h-full overflow-auto bg-[#0d1117]">
      <SyntaxHighlighter
        language={lang}
        style={atomOneDark}
        customStyle={CUSTOM_STYLE}
        showLineNumbers
        lineNumberStyle={{
          color: '#4a4f5c',
          minWidth: '2.5em',
          paddingRight: '1em',
          userSelect: 'none',
        }}
        wrapLongLines={false}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
