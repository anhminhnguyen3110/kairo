'use client';

import { useEffect, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({ startOnLoad: false, theme: 'dark' });
let _mermaidId = 0;

interface MermaidRendererProps {
  code: string;
}

/**
 * Wraps the rendered SVG in a minimal, self-contained HTML page so it is
 * displayed inside a sandboxed iframe.  This fully isolates the diagram from
 * the app's global CSS / Tailwind resets (the same technique used by the
 * official mermaid-live-editor), which means mermaid's own theme styles
 * actually take effect instead of being overridden.
 */
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

export function MermaidRenderer({ code }: MermaidRendererProps) {
  const [srcdoc, setSrcdoc] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const id = `mermaid-${++_mermaidId}`;

    mermaid
      .render(id, code)
      .then(({ svg }) => {
        if (!cancelled) {
          setSrcdoc(buildSrcdoc(svg));
          setError(null);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [code]);

  if (error) {
    return (
      <div className="p-4 text-sm text-red-400 bg-red-950/40 rounded-md border border-red-800/50">
        <strong>Diagram error:</strong> {error}
      </div>
    );
  }

  if (!srcdoc) {
    return (
      <div className="flex items-center justify-center w-full h-full text-sm text-neutral-500">
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
