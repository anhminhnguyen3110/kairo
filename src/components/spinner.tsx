import { cn } from '@/lib/utils';

interface SpinnerProps {
  /** Diameter of the spinner in pixels (default: 16) */
  size?: number;
  className?: string;
}

/**
 * A lightweight CSS-only spinning loader ring.
 *
 * @example
 * <Spinner />
 * <Spinner size={24} className="text-stone-300" />
 */
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
