import { cn } from '@/lib/utils';

interface SpinnerProps {
  size?: number;
  className?: string;
}

export function Spinner({ size = 16, className }: SpinnerProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className={cn(
        'border-2 border-current border-t-transparent rounded-full animate-spin shrink-0',
        className,
      )}
    />
  );
}
