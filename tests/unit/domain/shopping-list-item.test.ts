import { describe, expect, it } from 'vitest';

import { normalizeName, ownerLabel } from '@domain/entities/shopping-list-item';

describe('normalizeName', () => {
  it('trims surrounding whitespace', () => {
    expect(normalizeName('  milk  ')).toBe('milk');
  });

  it('collapses internal whitespace', () => {
    expect(normalizeName('whole   wheat\tbread')).toBe('whole wheat bread');
  });

  it('lowercases', () => {
    expect(normalizeName('Olive Oil')).toBe('olive oil');
  });

  it('handles mixed trim collapse and case', () => {
    expect(normalizeName('  Greek   YOGURT  ')).toBe('greek yogurt');
  });
});

describe('ownerLabel', () => {
  it('returns mine when owner matches current user', () => {
    expect(ownerLabel({ ownerUserId: 'u-1' }, 'u-1')).toBe('mine');
  });

  it('returns household when owner differs', () => {
    expect(ownerLabel({ ownerUserId: 'u-2' }, 'u-1')).toBe('household');
  });

  it('returns household when owner is null', () => {
    expect(ownerLabel({ ownerUserId: null }, 'u-1')).toBe('household');
  });
});
