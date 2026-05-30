import { describe, expect, it } from 'vitest';

import { parseRow, rowToEntity, type PantryItemRow } from '@data/dtos/pantry-item-dto';

function row(overrides: Partial<PantryItemRow> = {}): PantryItemRow {
  return {
    id: 'i-1',
    household_id: 'h-1',
    canonical_name: 'bananas',
    display_name: 'Bananas',
    category: 'produce',
    quantity: 6,
    unit: 'count',
    expiration_date: '2026-06-04',
    estimated_expiration_days: 7,
    last_purchased_at: '2026-05-28T00:00:00.000Z',
    last_unit_cost: 1.5,
    notes: 'ripe',
    is_frozen: false,
    version: 1,
    created_at: '2026-05-28T00:00:00.000Z',
    updated_at: '2026-05-28T00:00:00.000Z',
    created_by_user_id: 'u-1',
    updated_by_user_id: 'u-2',
    deleted_at: null,
    ...overrides,
  };
}

describe('parseRow', () => {
  it('accepts a well-formed row', () => {
    expect(parseRow(row())).toMatchObject({ id: 'i-1', canonical_name: 'bananas' });
  });

  it('accepts nullable columns as null', () => {
    const parsed = parseRow(
      row({
        expiration_date: null,
        estimated_expiration_days: null,
        last_purchased_at: null,
        last_unit_cost: null,
        notes: null,
      }),
    );
    expect(parsed.expiration_date).toBeNull();
    expect(parsed.last_unit_cost).toBeNull();
  });

  it('throws on a malformed row', () => {
    const bad = { ...row() } as Record<string, unknown>;
    delete bad['quantity'];
    expect(() => parseRow(bad)).toThrow();
  });
});

describe('rowToEntity', () => {
  it('maps snake_case columns to a camelCase entity', () => {
    expect(rowToEntity(row())).toEqual({
      id: 'i-1',
      householdId: 'h-1',
      canonicalName: 'bananas',
      displayName: 'Bananas',
      category: 'produce',
      quantity: 6,
      unit: 'count',
      expirationDate: '2026-06-04',
      estimatedExpirationDays: 7,
      lastPurchasedAt: '2026-05-28T00:00:00.000Z',
      lastUnitCost: 1.5,
      notes: 'ripe',
      isFrozen: false,
      createdByUserId: 'u-1',
      updatedByUserId: 'u-2',
      createdAt: '2026-05-28T00:00:00.000Z',
      updatedAt: '2026-05-28T00:00:00.000Z',
    });
  });
});
