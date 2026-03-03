import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { useClickOutside } from './use-click-outside';

function fireMousedown(target: Node) {
  const event = new MouseEvent('mousedown', { bubbles: true });
  Object.defineProperty(event, 'target', { value: target, writable: false });
  document.dispatchEvent(event);
}

describe('useClickOutside()', () => {
  it('calls handler when mousedown fires outside the ref element', () => {
    const handler = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const outside = document.createElement('span');
    document.body.appendChild(outside);

    const { unmount } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(container);
      useClickOutside(ref, handler);
    });

    fireMousedown(outside);
    expect(handler).toHaveBeenCalledTimes(1);

    unmount();
    document.body.removeChild(container);
    document.body.removeChild(outside);
  });

  it('does NOT call handler when mousedown fires inside the ref element', () => {
    const handler = vi.fn();
    const container = document.createElement('div');
    const child = document.createElement('span');
    container.appendChild(child);
    document.body.appendChild(container);

    const { unmount } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(container);
      useClickOutside(ref, handler);
    });

    fireMousedown(child);
    expect(handler).not.toHaveBeenCalled();

    unmount();
    document.body.removeChild(container);
  });

  it('removes the event listener on unmount', () => {
    const handler = vi.fn();
    const outside = document.createElement('span');
    document.body.appendChild(outside);

    const { unmount } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(null);
      useClickOutside(ref, handler);
    });

    unmount();
    fireMousedown(outside);
    // Handler should NOT be called since listener was removed
    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(outside);
  });
});
