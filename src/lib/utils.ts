import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { TimeFrame, Thread } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
});

const TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

export function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return TIME_FORMATTER.format(date);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return DATE_FORMATTER.format(date);
  return DATE_FORMATTER.format(date);
}

export const TIME_FRAME_LABELS: Record<TimeFrame, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  previous7Days: 'Last 7 days',
  previous30Days: 'Last 30 days',
  older: 'Older',
};

export const TIME_FRAME_ORDER: TimeFrame[] = [
  'today',
  'yesterday',
  'previous7Days',
  'previous30Days',
  'older',
];

export function groupThreadsByTimeFrame(threads: Thread[]): Map<TimeFrame, Thread[]> {
  const groups = new Map<TimeFrame, Thread[]>();

  for (const thread of threads) {
    const tf = thread.timeFrame ?? 'older';
    if (!groups.has(tf)) groups.set(tf, []);
    groups.get(tf)!.push(thread);
  }

  return groups;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}…`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function fileExt(name: string): string {
  if (!name.includes('.')) return 'FILE';
  return name.split('.').pop()?.toUpperCase() ?? 'FILE';
}

export function displayNameFromEmail(email: string): string {
  const prefix = email.split('@')[0] ?? email;
  return prefix
    .split(/[._-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
