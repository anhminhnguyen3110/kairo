import { type RefObject, useEffect } from 'react';

/**
 * Calls `handler` when a `mousedown` event fires outside the element
 * referenced by `ref`.
 *
 * @example
 * const menuRef = useRef<HTMLDivElement>(null);
 * useClickOutside(menuRef, () => setOpen(false));
 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: () => void,
): void {
  useEffect(() => {
    const listener = (event: MouseEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      handler();
    };

    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler]);
}
