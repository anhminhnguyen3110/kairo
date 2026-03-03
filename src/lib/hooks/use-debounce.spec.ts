import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from './use-debounce';

describe('useDebounce()', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 300));
    expect(result.current).toBe('initial');
  });

  it('does NOT update the debounced value before the delay expires', () => {
    const { result, rerender } = renderHook(({ val }) => useDebounce(val, 300), {
      initialProps: { val: 'first' },
    });
    rerender({ val: 'second' });
    // Only 100 ms have elapsed — should still be 'first'
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('first');
  });

  it('updates the debounced value after the delay expires', () => {
    const { result, rerender } = renderHook(({ val }) => useDebounce(val, 300), {
      initialProps: { val: 'first' },
    });
    rerender({ val: 'second' });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe('second');
  });

  it('resets the delay when the value changes rapidly', () => {
    const { result, rerender } = renderHook(({ val }) => useDebounce(val, 300), {
      initialProps: { val: 'a' },
    });
    rerender({ val: 'b' });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    rerender({ val: 'c' });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    // Total: 400 ms but last update was only 200 ms ago → still 'a'
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(100);
    });
    // 300 ms since last update → resolves to 'c'
    expect(result.current).toBe('c');
  });
});
