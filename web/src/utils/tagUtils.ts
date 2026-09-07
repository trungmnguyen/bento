import { MemoryLesson } from '../types';

/**
 * Normalizes raw tag arrays or comma-delimited strings into clean, individual,
 * lowercased, deduplicated tags.
 */
export function normalizeTags(tags: string[] | string | undefined | null): string[] {
  if (!tags) return [];
  const rawItems = Array.isArray(tags) ? tags : [tags];
  const set = new Set<string>();

  for (const item of rawItems) {
    if (typeof item === 'string') {
      const parts = item.split(',');
      for (const part of parts) {
        const cleaned = part.trim().toLowerCase().replace(/^#/, '');
        if (cleaned) {
          set.add(cleaned);
        }
      }
    }
  }

  return Array.from(set).sort();
}

/**
 * Computes frequency counts for every normalized tag across all lessons,
 * sorted by frequency descending.
 */
export function getTagFrequencies(lessons: MemoryLesson[]): Array<{ tag: string; count: number }> {
  const countMap = new Map<string, number>();

  for (const lesson of lessons) {
    const tags = normalizeTags(lesson?.tags);
    for (const tag of tags) {
      countMap.set(tag, (countMap.get(tag) || 0) + 1);
    }
  }

  return Array.from(countMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/**
 * Formats an ISO date string (e.g. "2026-09-03") into human-friendly relative time ("3d ago").
 */
export function formatRelativeDate(isoDate?: string | null): string {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return isoDate;

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 0) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}
