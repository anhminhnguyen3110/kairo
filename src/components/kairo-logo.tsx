import { cn } from '@/lib/utils';

interface KairoLogoProps {
  size?: number;
  className?: string;
}

export function KairoLogo({ size = 28, className }: KairoLogoProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={cn('shrink-0', className)}
    >
      <defs>
        <linearGradient id="kairoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#FF7F50', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#FF6347', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <rect x="20" y="20" width="80" height="80" rx="17" fill="url(#kairoGrad)" />
      <path
        d="M 43 42 L 43 78 M 43 60 L 65 42 L 65 48 M 43 60 L 65 78 L 65 72"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M 68 54 L 75 60 L 68 66"
        stroke="white"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
