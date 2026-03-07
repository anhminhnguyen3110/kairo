/**
 * Unit tests for ModelSelector (fixes 5.11 — Escape closes dropdown,
 * and 5.16 — button disabled during streaming)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── mocks ────────────────────────────────────────────────────────────────────
const mockSetSelection = vi.fn();
let mockSelection: { provider: string; model: string; providerLabel: string } | null = null;
let mockIsStreaming = false;

vi.mock('@/stores/model-store', () => ({
  useModelStore: vi.fn((sel?: (s: unknown) => unknown) => {
    const state = { selection: mockSelection, setSelection: mockSetSelection };
    return sel ? sel(state) : state;
  }),
}));

vi.mock('@/stores/chat-store', () => ({
  useChatStore: vi.fn((sel: (s: { streamingStatus: string }) => unknown) =>
    sel({ streamingStatus: mockIsStreaming ? 'streaming' : 'idle' }),
  ),
}));

vi.mock('../hooks/use-models', () => ({
  useModels: () => ({
    data: [
      {
        provider: 'OPENAI_COMPATIBLE',
        label: 'OpenAI',
        configured: true,
        models: [{ id: 'gpt-4o' }, { id: 'gpt-4o-mini' }],
      },
    ],
    isLoading: false,
  }),
}));

vi.mock('@/lib/hooks/use-click-outside', () => ({
  useClickOutside: vi.fn(),
}));
// ────────────────────────────────────────────────────────────────────────────

import { ModelSelector } from './model-selector';

describe('ModelSelector', () => {
  beforeEach(() => {
    mockSelection = null;
    mockIsStreaming = false;
    vi.clearAllMocks();
  });

  function renderSelector() {
    return render(<ModelSelector />);
  }

  function getTriggerButton() {
    // The trigger button's title changes based on streaming state
    try {
      return screen.getByTitle('Select model');
    } catch {
      return screen.getByTitle('Cannot change model while streaming');
    }
  }

  // ── 5.16: disabled during streaming ────────────────────────────────────────
  describe('5.16 — button disabled during streaming', () => {
    it('trigger button is NOT disabled when idle', () => {
      mockIsStreaming = false;
      renderSelector();
      expect(getTriggerButton()).not.toBeDisabled();
    });

    it('trigger button IS disabled when streaming', () => {
      mockIsStreaming = true;
      renderSelector();
      expect(getTriggerButton()).toBeDisabled();
    });

    it('shows "Cannot change model while streaming" title when streaming', () => {
      mockIsStreaming = true;
      renderSelector();
      expect(getTriggerButton()).toHaveAttribute('title', 'Cannot change model while streaming');
    });

    it('dropdown does NOT open when button is clicked while streaming', () => {
      mockIsStreaming = true;
      renderSelector();
      fireEvent.click(getTriggerButton());
      expect(screen.queryByText('Provider')).not.toBeInTheDocument();
    });

    it('opens dropdown when clicked while NOT streaming', () => {
      mockIsStreaming = false;
      renderSelector();
      fireEvent.click(getTriggerButton());
      expect(screen.getByText('Provider')).toBeInTheDocument();
    });
  });

  // ── 5.11: Escape closes dropdown ───────────────────────────────────────────
  describe('5.11 — Escape key closes dropdown', () => {
    it('dropdown closes when Escape is pressed', () => {
      mockIsStreaming = false;
      renderSelector();

      // Open the dropdown
      fireEvent.click(getTriggerButton());
      expect(screen.getByText('Provider')).toBeInTheDocument();

      // Press Escape
      fireEvent.keyDown(document, { key: 'Escape', bubbles: true });
      expect(screen.queryByText('Provider')).not.toBeInTheDocument();
    });

    it('Escape key does nothing when dropdown is already closed', () => {
      mockIsStreaming = false;
      renderSelector();

      // Dropdown is closed
      expect(screen.queryByText('Provider')).not.toBeInTheDocument();

      // Press Escape — should not throw
      expect(() => fireEvent.keyDown(document, { key: 'Escape', bubbles: true })).not.toThrow();
      expect(screen.queryByText('Provider')).not.toBeInTheDocument();
    });

    it('other keys do not close the dropdown', () => {
      mockIsStreaming = false;
      renderSelector();

      fireEvent.click(getTriggerButton());
      expect(screen.getByText('Provider')).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Enter', bubbles: true });
      expect(screen.getByText('Provider')).toBeInTheDocument();
    });
  });

  // ── general open/close ──────────────────────────────────────────────────────
  describe('basic open/close behaviour', () => {
    it('shows provider list after clicking trigger when not streaming', () => {
      renderSelector();
      fireEvent.click(getTriggerButton());
      expect(screen.getByText('OpenAI')).toBeInTheDocument();
    });

    it('shows "Default" label when no model is selected', () => {
      renderSelector();
      expect(screen.getByText('Default')).toBeInTheDocument();
    });
  });
});
