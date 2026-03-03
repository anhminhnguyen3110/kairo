import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatBytes,
  fileExt,
  displayNameFromEmail,
  truncate,
  groupThreadsByTimeFrame,
  TIME_FRAME_ORDER,
  TIME_FRAME_LABELS,
} from './utils';
import type { Thread } from '@/types';

// ─── formatDate ──────────────────────────────────────────────────────────────

describe('formatDate()', () => {
  it('returns a time string for a same-day date', () => {
    const now = new Date();
    const result = formatDate(now.toISOString());
    // Should contain AM or PM (12-hour format)
    expect(result).toMatch(/[AP]M/i);
  });

  it('returns "Yesterday" for a date 1 day ago', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(formatDate(yesterday.toISOString())).toBe('Yesterday');
  });

  it('returns a formatted date string for older dates', () => {
    const oldDate = new Date('2020-01-15').toISOString();
    const result = formatDate(oldDate);
    expect(result).toMatch(/Jan/);
  });
});

// ─── formatBytes ─────────────────────────────────────────────────────────────

describe('formatBytes()', () => {
  it('formats bytes below 1 KB as "X B"', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(500)).toBe('500 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('formats bytes in 1 KB–1 MB range', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1024 * 1024 - 1)).toContain('KB');
  });

  it('formats bytes of 1 MB+', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
    expect(formatBytes(2 * 1024 * 1024)).toBe('2.0 MB');
  });
});

// ─── fileExt ─────────────────────────────────────────────────────────────────

describe('fileExt()', () => {
  it('returns uppercase extension', () => {
    expect(fileExt('document.pdf')).toBe('PDF');
    expect(fileExt('image.PNG')).toBe('PNG');
    expect(fileExt('data.json')).toBe('JSON');
  });

  it('handles files without extension', () => {
    expect(fileExt('Makefile')).toBe('FILE');
  });

  it('handles dotfiles', () => {
    expect(fileExt('.gitignore')).toBe('GITIGNORE');
  });

  it('returns last extension for multi-dot filenames', () => {
    expect(fileExt('archive.tar.gz')).toBe('GZ');
  });
});

// ─── displayNameFromEmail ────────────────────────────────────────────────────

describe('displayNameFromEmail()', () => {
  it('capitalises each name segment at dots', () => {
    expect(displayNameFromEmail('jane.doe@example.com')).toBe('Jane Doe');
  });

  it('handles underscores as separators', () => {
    expect(displayNameFromEmail('john_smith@example.com')).toBe('John Smith');
  });

  it('handles hyphens as separators', () => {
    expect(displayNameFromEmail('anna-marie@example.com')).toBe('Anna Marie');
  });

  it('returns capitalised prefix when no separator exists', () => {
    expect(displayNameFromEmail('alice@example.com')).toBe('Alice');
  });

  it('uses full string when email has no @ sign', () => {
    expect(displayNameFromEmail('plainstring')).toBe('Plainstring');
  });
});

// ─── truncate ────────────────────────────────────────────────────────────────

describe('truncate()', () => {
  it('returns the original string when it fits within maxLength', () => {
    expect(truncate('hello', 10)).toBe('hello');
    expect(truncate('hello', 5)).toBe('hello');
  });

  it('truncates and appends ellipsis when string is too long', () => {
    expect(truncate('hello world', 5)).toBe('hello…');
  });
});

// ─── groupThreadsByTimeFrame ──────────────────────────────────────────────────

describe('groupThreadsByTimeFrame()', () => {
  const makeThread = (id: number, timeFrame: Thread['timeFrame']): Thread =>
    ({ id, title: `Thread ${id}`, timeFrame, updatedAt: '' }) as Thread;

  it('groups threads by their timeFrame', () => {
    const threads = [makeThread(1, 'today'), makeThread(2, 'today'), makeThread(3, 'yesterday')];
    const groups = groupThreadsByTimeFrame(threads);
    expect(groups.get('today')).toHaveLength(2);
    expect(groups.get('yesterday')).toHaveLength(1);
  });

  it('puts threads with undefined timeFrame into "older"', () => {
    const threads = [makeThread(99, undefined)];
    const groups = groupThreadsByTimeFrame(threads);
    expect(groups.get('older')).toHaveLength(1);
  });

  it('returns an empty map for empty input', () => {
    expect(groupThreadsByTimeFrame([])).toEqual(new Map());
  });
});

// ─── TIME_FRAME_ORDER ─────────────────────────────────────────────────────────

describe('TIME_FRAME_ORDER', () => {
  it('starts with today and ends with older', () => {
    expect(TIME_FRAME_ORDER[0]).toBe('today');
    expect(TIME_FRAME_ORDER[TIME_FRAME_ORDER.length - 1]).toBe('older');
  });
});

// ─── TIME_FRAME_LABELS ────────────────────────────────────────────────────────

describe('TIME_FRAME_LABELS', () => {
  it('has a label for every entry in TIME_FRAME_ORDER', () => {
    for (const tf of TIME_FRAME_ORDER) {
      expect(TIME_FRAME_LABELS[tf]).toBeDefined();
    }
  });
});
