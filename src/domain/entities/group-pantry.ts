// / urgency bucketing
import { daysLeft, groupingTone } from './pantry-expiry';
import type { PantryItem } from './pantry-item';

export type PantrySectionKey = 'urgent' | 'soon' | 'fresh' | 'frozen';

export interface PantrySection {
  readonly key: PantrySectionKey;
  readonly title: string;
  readonly items: PantryItem[];
}

const SECTIONS: readonly { key: PantrySectionKey; title: string }[] = [
  { key: 'urgent', title: 'Use first' },
  { key: 'soon', title: 'This week' },
  { key: 'fresh', title: 'Fresh' },
  { key: 'frozen', title: 'Frozen' },
];

function sortWithinBucket(items: PantryItem[], now: Date): PantryItem[] {
  return [...items].sort((a, b) => {
    const da = daysLeft(a, now);
    const db = daysLeft(b, now);
    if (da === null && db === null) return 0;
    if (da === null) return 1;
    if (db === null) return -1;
    return da - db;
  });
}

export function groupByUrgency(items: PantryItem[], now: Date): PantrySection[] {
  const buckets: Record<PantrySectionKey, PantryItem[]> = {
    urgent: [],
    soon: [],
    fresh: [],
    frozen: [],
  };
  for (const item of items) {
    const tone = groupingTone(item, now);
    const key: PantrySectionKey = tone === 'gone' ? 'urgent' : tone;
    buckets[key].push(item);
  }
  return SECTIONS.map(({ key, title }) => ({
    key,
    title,
    items: sortWithinBucket(buckets[key], now),
  })).filter((section) => section.items.length > 0);
}
