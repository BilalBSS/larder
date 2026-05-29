import { describe, expect, it } from 'vitest';

import { AVATAR_COLORS, deriveAvatarColor } from '@ui/avatar-color';

describe('deriveAvatarColor', () => {
  it('is stable for the same user id', () => {
    expect(deriveAvatarColor('user-123')).toBe(deriveAvatarColor('user-123'));
  });

  it('returns a palette color', () => {
    for (const id of ['a', 'user-123', 'zzz', '0000-1111-2222', '']) {
      expect(AVATAR_COLORS).toContain(deriveAvatarColor(id));
    }
  });

  it('spreads ids across the palette', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i += 1) {
      seen.add(deriveAvatarColor(`user-${i}`));
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});
