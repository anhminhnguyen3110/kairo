'use client';

import { useEffect, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({ startOnLoad: false, theme: 'dark' });
let _mermaidId = 0;

interface MermaidRendererProps {
  code: string;
}

function buildSrcdoc(svg: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  *,*::before,*::after { margin:0; padding:0; box-sizing:border-box; }
  html, body {
    width: 100%;
    min-height: 100%;
    background: #1A1A1A;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    overflow: auto;
  }
  svg { max-width: 100%; height: auto; }
</style>
</head>
<body>${svg}</body>
</html>`;
}

function ErrorDisplay({ error }: { error: string }) {
  return (
    <div className="p-4 rounded-lg bg-red-900/20 border border-red-500/30 text-red-300">
      <h3 className="font-bold text-red-400 mb-2">Diagram Error</h3>
      <pre className="text-xs whitespace-pre-wrap font-mono bg-red-950/30 p-2 rounded">
        {error}
      </pre>
    </div>
  );
}

export function MermaidRenderer({ code }: MermaidRendererProps) {
  const [srcdoc, setSrcdoc] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const id = `mermaid-${++_mermaidId}`;

    async function render() {
      try {
        const { svg } = await mermaid.render(id, code);
        if (!cancelled) {
          setSrcdoc(buildSrcdoc(svg));
          setError(null);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      }
    }
    void render();

    return () => {
      cancelled = true;
    };
  }, [code]);

  if (error) {
    return <ErrorDisplay error={error} />;
  }

  if (!srcdoc) {
    return (
      <div className="flex items-center justify-center p-8 text-stone-500">
        Rendering…
      </div>
    );
  }

  return (
    <iframe
      srcDoc={srcdoc}
      sandbox="allow-scripts"
      className="w-full h-full border-0"
      title="Mermaid diagram"
    />
  );
}
