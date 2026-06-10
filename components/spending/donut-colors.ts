// / category palette mapping
import { OTHER_CATEGORY } from '@domain/use-cases/spending/aggregate';
import { FRESH, INK, MID, SOON, TERRACOTTA } from '@ui/tokens';

const SEMANTIC: Record<string, string> = {
  produce: FRESH,
  meat: TERRACOTTA,
  dairy: SOON,
  pantry: INK,
};

const POOL = [FRESH, TERRACOTTA, SOON, INK];

export function sliceColors(slices: readonly { readonly name: string }[]): string[] {
  const used = new Set<string>();
  for (const slice of slices) {
    const semantic = SEMANTIC[slice.name.toLowerCase()];
    if (semantic !== undefined) used.add(semantic);
  }
  return slices.map((slice) => {
    if (slice.name === OTHER_CATEGORY) return MID;
    const semantic = SEMANTIC[slice.name.toLowerCase()];
    if (semantic !== undefined) return semantic;
    const free = POOL.find((color) => !used.has(color)) ?? MID;
    used.add(free);
    return free;
  });
}
