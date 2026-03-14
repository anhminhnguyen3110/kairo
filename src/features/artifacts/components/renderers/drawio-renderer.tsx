'use client';

import dynamic from 'next/dynamic';

// react-drawio renders an iframe with diagrams.net; load it client-side only
const DrawIoEmbed = dynamic(() => import('react-drawio').then((m) => m.DrawIoEmbed), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-stone-500 text-sm">
      Loading Draw.io…
    </div>
  ),
});

interface DrawioRendererProps {
  xml: string;
  /** Key that forces a full remount when the content changes (e.g. after refresh) */
  refreshKey?: number;
}

export function DrawioRenderer({ xml, refreshKey }: DrawioRendererProps) {
  return (
    <div className="w-full h-full" key={`drawio-${refreshKey ?? 0}`} style={{ minHeight: '400px' }}>
      <DrawIoEmbed xml={xml} />
    </div>
  );
}
