'use client';

import dynamic from 'next/dynamic';

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
  refreshKey?: number;
}

export function DrawioRenderer({ xml, refreshKey }: DrawioRendererProps) {
  return (
    <div className="w-full h-full" key={`drawio-${refreshKey ?? 0}`} style={{ minHeight: '400px' }}>
      <DrawIoEmbed xml={xml} />
    </div>
  );
}
