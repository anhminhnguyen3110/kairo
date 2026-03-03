'use client';

interface HtmlRendererProps {
  html: string;
}

export function HtmlRenderer({ html }: HtmlRendererProps) {
  return (
    <iframe
      srcDoc={html}
      sandbox="allow-scripts allow-forms allow-popups"
      className="w-full h-full border-0"
      title="HTML preview"
    />
  );
}
