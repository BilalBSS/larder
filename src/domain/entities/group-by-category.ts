// / category grouping helper
import type { ShoppingListItem } from './shopping-list-item';

export const CATEGORY_ORDER = ['Produce', 'Dairy', 'Bakery', 'Meat', 'Pantry'] as const;

const OTHER_CATEGORY = 'Other';

export interface CategorySection {
  readonly key: string;
  readonly title: string;
  readonly items: readonly ShoppingListItem[];
  readonly remaining: number;
}

function sectionTitle(category: string | null): string {
  if (category === null) return OTHER_CATEGORY;
  const trimmed = category.trim();
  return trimmed === '' ? OTHER_CATEGORY : trimmed;
}

function rank(title: string): number {
  const index = (CATEGORY_ORDER as readonly string[]).indexOf(title);
  return index === -1 ? CATEGORY_ORDER.length : index;
}

// / ordered category sections
export function groupByCategory(items: readonly ShoppingListItem[]): CategorySection[] {
  const buckets = new Map<string, ShoppingListItem[]>();
  for (const item of items) {
    const title = sectionTitle(item.category);
    const bucket = buckets.get(title);
    if (bucket === undefined) {
      buckets.set(title, [item]);
    } else {
      bucket.push(item);
    }
  }

  const titles = [...buckets.keys()].sort((a, b) => {
    const byRank = rank(a) - rank(b);
    return byRank !== 0 ? byRank : a.localeCompare(b);
  });

  return titles.map((title) => {
    const sectionItems = buckets.get(title) ?? [];
    return {
      key: title,
      title,
      items: sectionItems,
      remaining: sectionItems.filter((item) => !item.isCheckedOff).length,
    };
  });
}
