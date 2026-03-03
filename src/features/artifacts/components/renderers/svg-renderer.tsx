'use client';

import DOMPurify from 'dompurify';

interface SvgRendererProps {
  svg: string;
}

export function SvgRenderer({ svg }: SvgRendererProps) {
  const clean = DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true } });

  return (
    <div
      className="flex items-center justify-center p-4 w-full h-full overflow-auto"
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
