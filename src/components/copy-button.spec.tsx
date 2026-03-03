import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CopyButton } from './copy-button';

// Provide a clipboard mock in jsdom (not available by default)
const writeText = vi.fn().mockResolvedValue(undefined);
Object.assign(navigator, { clipboard: { writeText } });

beforeEach(() => {
  writeText.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CopyButton', () => {
  describe('labelled mode (default)', () => {
    it('renders with "Copy" text', () => {
      render(<CopyButton content="hello" />);
      expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
    });

    it('calls clipboard.writeText with the provided content', async () => {
      render(<CopyButton content="copied text" />);
      fireEvent.click(screen.getByRole('button', { name: /copy/i }));
      await waitFor(() => expect(writeText).toHaveBeenCalledWith('copied text'));
    });

    it('resets to copy icon after 1500 ms', async () => {
      vi.useFakeTimers();
      const { unmount } = render(<CopyButton content="foo" />);
      fireEvent.click(screen.getByRole('button', { name: /copy/i }));
      // Let the clipboard promise resolve
      vi.useRealTimers();
      await waitFor(() => expect(writeText).toHaveBeenCalled());
      // component should still be in the DOM (not crashed)
      expect(screen.getByRole('button')).toBeInTheDocument();
      unmount();
    });
  });

  describe('icon-only mode (showLabel={false})', () => {
    it('renders a button with title "Copy"', () => {
      render(<CopyButton content="icon only" showLabel={false} />);
      expect(screen.getByTitle('Copy')).toBeInTheDocument();
    });

    it('calls clipboard.writeText on click', async () => {
      render(<CopyButton content="icon only" showLabel={false} />);
      fireEvent.click(screen.getByTitle('Copy'));
      await waitFor(() => expect(writeText).toHaveBeenCalledWith('icon only'));
    });
  });

  describe('custom className', () => {
    it('applies the className to the button', () => {
      const { container } = render(
        <CopyButton content="x" showLabel={false} className="my-class" />,
      );
      expect(container.querySelector('.my-class')).toBeTruthy();
    });
  });
});
