import { describe, expect, it, vi } from 'vitest';

import {
  idempotentInsert,
  IdempotencyError,
  PG_UNIQUE_VIOLATION,
} from '../../../supabase/functions/_shared/idempotency';

type Row = { id: string; status: string };

describe('idempotentInsert', () => {
  it('returns the newly inserted row on success', async () => {
    const row: Row = { id: 'r-1', status: 'pending' };
    const insert = vi.fn().mockResolvedValue({ data: row, error: null });
    const selectExisting = vi.fn();
    const result = await idempotentInsert<Row>({ insert, selectExisting });
    expect(result).toEqual({ row, created: true });
    expect(selectExisting).not.toHaveBeenCalled();
  });

  it('returns the existing row on unique violation', async () => {
    const existing: Row = { id: 'r-1', status: 'succeeded' };
    const insert = vi.fn().mockResolvedValue({ data: null, error: { code: PG_UNIQUE_VIOLATION } });
    const selectExisting = vi.fn().mockResolvedValue({ data: existing, error: null });
    const result = await idempotentInsert<Row>({ insert, selectExisting });
    expect(result).toEqual({ row: existing, created: false });
  });

  it('throws when insert fails with non-unique error', async () => {
    const insert = vi.fn().mockResolvedValue({ data: null, error: { code: '42P01' } });
    const selectExisting = vi.fn();
    await expect(idempotentInsert<Row>({ insert, selectExisting })).rejects.toBeInstanceOf(
      IdempotencyError,
    );
  });

  it('throws when select after duplicate returns no row', async () => {
    const insert = vi.fn().mockResolvedValue({ data: null, error: { code: PG_UNIQUE_VIOLATION } });
    const selectExisting = vi.fn().mockResolvedValue({ data: null, error: null });
    await expect(idempotentInsert<Row>({ insert, selectExisting })).rejects.toBeInstanceOf(
      IdempotencyError,
    );
  });

  it('throws when insert returns null data and null error', async () => {
    const insert = vi.fn().mockResolvedValue({ data: null, error: null });
    const selectExisting = vi.fn();
    await expect(idempotentInsert<Row>({ insert, selectExisting })).rejects.toBeInstanceOf(
      IdempotencyError,
    );
  });
});
