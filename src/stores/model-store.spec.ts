import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ModelSelection } from '@/features/chat/types/chat.types';

let useModelStore: typeof import('./model-store').useModelStore;

const INITIAL_STATE = { selection: null };

beforeEach(async () => {
  vi.resetModules();

  vi.stubGlobal('localStorage', {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  });

  ({ useModelStore } = await import('./model-store'));
  useModelStore.setState(INITIAL_STATE);
});

const makeSelection = (partial: Partial<ModelSelection> = {}): ModelSelection => ({
  provider: 'OPENAI',
  model: 'gpt-4o',
  providerLabel: 'OpenAI',
  ...partial,
});

describe('useModelStore', () => {
  describe('initial state', () => {
    it('selection is null', () => {
      expect(useModelStore.getState().selection).toBeNull();
    });
  });

  describe('setSelection()', () => {
    it('stores a model selection', () => {
      const sel = makeSelection();
      useModelStore.getState().setSelection(sel);
      expect(useModelStore.getState().selection).toEqual(sel);
    });

    it('can switch provider and model', () => {
      useModelStore.getState().setSelection(makeSelection({ provider: 'OPENAI', model: 'gpt-4o' }));
      useModelStore
        .getState()
        .setSelection(makeSelection({ provider: 'CLAUDE', model: 'claude-opus-4-5' }));
      const { selection } = useModelStore.getState();
      expect(selection?.provider).toBe('CLAUDE');
      expect(selection?.model).toBe('claude-opus-4-5');
    });

    it('clears selection when null is passed', () => {
      useModelStore.getState().setSelection(makeSelection());
      useModelStore.getState().setSelection(null);
      expect(useModelStore.getState().selection).toBeNull();
    });
  });
});
