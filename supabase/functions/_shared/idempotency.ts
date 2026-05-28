// / insert then process

export const PG_UNIQUE_VIOLATION = '23505';

export interface InsertOutcome<TRow> {
  readonly data: TRow | null;
  readonly error: { code?: string } | null;
}

export interface SelectOutcome<TRow> {
  readonly data: TRow | null;
  readonly error: unknown;
}

export interface IdempotentInsertDeps<TRow> {
  readonly insert: () => Promise<InsertOutcome<TRow>>;
  readonly selectExisting: () => Promise<SelectOutcome<TRow>>;
}

export interface IdempotentInsertResult<TRow> {
  readonly row: TRow;
  readonly created: boolean;
}

export class IdempotencyError extends Error {
  constructor(reason: string) {
    super(`idempotency:${reason}`);
    this.name = 'IdempotencyError';
  }
}

export async function idempotentInsert<TRow>(
  deps: IdempotentInsertDeps<TRow>,
): Promise<IdempotentInsertResult<TRow>> {
  const ins = await deps.insert();
  if (ins.error !== null) {
    if (ins.error.code === PG_UNIQUE_VIOLATION) {
      const existing = await deps.selectExisting();
      if (existing.error !== null || existing.data === null) {
        throw new IdempotencyError('select_failed');
      }
      return { row: existing.data, created: false };
    }
    throw new IdempotencyError(`insert_failed:${ins.error.code ?? 'unknown'}`);
  }
  if (ins.data === null) throw new IdempotencyError('insert_returned_null');
  return { row: ins.data, created: true };
}
