import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { adminClient, anonClient, rlsConfigured, setupFixture, type RlsFixture } from './setup';

const runRls = rlsConfigured() ? describe : describe.skip;

let f: RlsFixture;

beforeAll(async () => {
  if (!rlsConfigured()) return;
  f = await setupFixture();
}, 60_000);

afterAll(async () => {
  if (f !== undefined) await f.teardown();
});

async function seedReceipt(
  householdId: string,
  userId: string,
): Promise<{ receiptId: string; lineId: string }> {
  const admin = adminClient();
  const receipt = await admin
    .from('receipts')
    .insert({
      household_id: householdId,
      scanned_by_user_id: userId,
      total_amount: 5,
      purchased_at: new Date().toISOString(),
      photo_storage_key: `${householdId}/seed-${randomUUID()}.jpg`,
      ocr_status: 'succeeded',
    })
    .select('id')
    .single();
  if (receipt.error !== null || receipt.data === null) {
    throw new Error(`seed receipt failed: ${receipt.error?.message ?? 'no row'}`);
  }
  const receiptId = (receipt.data as { id: string }).id;
  const line = await admin
    .from('receipt_line_items')
    .insert({
      receipt_id: receiptId,
      household_id: householdId,
      raw_text: 'MILK',
      canonical_name: 'milk',
      line_total: 2,
    })
    .select('id')
    .single();
  if (line.error !== null || line.data === null) {
    throw new Error(`seed line failed: ${line.error?.message ?? 'no row'}`);
  }
  return { receiptId, lineId: (line.data as { id: string }).id };
}

async function pantryCount(householdId: string): Promise<number> {
  const res = await adminClient()
    .from('pantry_items')
    .select('id', { count: 'exact', head: true })
    .eq('household_id', householdId)
    .is('deleted_at', null);
  return res.count ?? 0;
}

runRls('reconcile_receipt rpc', () => {
  it('reconciles a member receipt, writing item, history, link, and reconciled_at', async () => {
    const { receiptId, lineId } = await seedReceipt(f.a.household_id, f.a.user_id);
    const before = await pantryCount(f.a.household_id);
    const res = await anonClient(f.a.jwt).rpc('reconcile_receipt', {
      p_receipt_id: receiptId,
      p_items: [
        {
          line_item_id: lineId,
          canonical_name: 'milk',
          display_name: 'Milk',
          category: 'dairy',
          quantity: 1,
          unit: 'each',
          last_unit_cost: 2,
        },
      ],
    });
    expect(res.error).toBeNull();
    expect(res.data).toEqual({ added: 1, skipped: 0 });
    expect((await pantryCount(f.a.household_id)) - before).toBe(1);

    const admin = adminClient();
    const item = await admin
      .from('pantry_items')
      .select('created_by_user_id')
      .eq('household_id', f.a.household_id)
      .eq('canonical_name', 'milk')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    expect((item.data as { created_by_user_id: string }).created_by_user_id).toBe(f.a.user_id);

    const history = await admin
      .from('pantry_item_history')
      .select('event_type')
      .eq('source_receipt_id', receiptId);
    expect((history.data ?? []).length).toBeGreaterThan(0);

    const link = await admin
      .from('receipt_line_items')
      .select('pantry_item_id')
      .eq('id', lineId)
      .single();
    expect((link.data as { pantry_item_id: string | null }).pantry_item_id).not.toBeNull();

    const rec = await admin.from('receipts').select('reconciled_at').eq('id', receiptId).single();
    expect((rec.data as { reconciled_at: string | null }).reconciled_at).not.toBeNull();
  });

  it('rejects a second reconcile of the same receipt', async () => {
    const { receiptId } = await seedReceipt(f.a.household_id, f.a.user_id);
    const items = [
      {
        canonical_name: 'eggs',
        display_name: 'Eggs',
        category: 'dairy',
        quantity: 1,
        unit: 'each',
      },
    ];
    const first = await anonClient(f.a.jwt).rpc('reconcile_receipt', {
      p_receipt_id: receiptId,
      p_items: items,
    });
    expect(first.error).toBeNull();
    const second = await anonClient(f.a.jwt).rpc('reconcile_receipt', {
      p_receipt_id: receiptId,
      p_items: items,
    });
    expect(second.error).not.toBeNull();
    expect(String(second.error?.message ?? '')).toContain('already_reconciled');
  });

  it('denies reconciling another household receipt', async () => {
    const { receiptId } = await seedReceipt(f.b.household_id, f.b.user_id);
    const res = await anonClient(f.a.jwt).rpc('reconcile_receipt', {
      p_receipt_id: receiptId,
      p_items: [
        {
          canonical_name: 'milk',
          display_name: 'Milk',
          category: 'dairy',
          quantity: 1,
          unit: 'each',
        },
      ],
    });
    expect(res.error).not.toBeNull();
    expect(String(res.error?.message ?? '')).toContain('forbidden');
  });

  it('partial-adds in receipt order at the free pantry cap', async () => {
    const admin = adminClient();
    await admin.from('pantry_items').delete().eq('household_id', f.a.household_id);
    const fillers = Array.from({ length: 49 }, (_unused, index) => ({
      household_id: f.a.household_id,
      canonical_name: `filler-${index}`,
      display_name: `Filler ${index}`,
      category: 'other',
      quantity: 1,
      unit: 'each',
      created_by_user_id: f.a.user_id,
      updated_by_user_id: f.a.user_id,
    }));
    const seeded = await admin.from('pantry_items').insert(fillers);
    expect(seeded.error).toBeNull();

    const { receiptId } = await seedReceipt(f.a.household_id, f.a.user_id);
    const res = await anonClient(f.a.jwt).rpc('reconcile_receipt', {
      p_receipt_id: receiptId,
      p_items: [
        {
          canonical_name: 'first-add',
          display_name: 'First',
          category: 'other',
          quantity: 1,
          unit: 'each',
        },
        {
          canonical_name: 'second-skip',
          display_name: 'Second',
          category: 'other',
          quantity: 1,
          unit: 'each',
        },
        {
          canonical_name: 'third-skip',
          display_name: 'Third',
          category: 'other',
          quantity: 1,
          unit: 'each',
        },
      ],
    });
    expect(res.error).toBeNull();
    expect(res.data).toEqual({ added: 1, skipped: 2 });

    const added = await admin
      .from('pantry_items')
      .select('canonical_name')
      .eq('household_id', f.a.household_id)
      .eq('canonical_name', 'first-add');
    expect((added.data ?? []).length).toBe(1);
    const skipped = await admin
      .from('pantry_items')
      .select('canonical_name')
      .eq('household_id', f.a.household_id)
      .eq('canonical_name', 'third-skip');
    expect((skipped.data ?? []).length).toBe(0);
  });
});

runRls('receipts isolation', () => {
  it('a member reads only its own household receipts', async () => {
    await seedReceipt(f.a.household_id, f.a.user_id);
    await seedReceipt(f.b.household_id, f.b.user_id);
    const crossRead = await anonClient(f.a.jwt)
      .from('receipts')
      .select('id')
      .eq('household_id', f.b.household_id);
    expect(crossRead.data).toEqual([]);
  });
});

runRls('receipts storage policies', () => {
  const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);

  it('a member uploads to its own household folder', async () => {
    const res = await anonClient(f.a.jwt)
      .storage.from('receipts')
      .upload(`${f.a.household_id}/${randomUUID()}.jpg`, bytes, { contentType: 'image/jpeg' });
    expect(res.error).toBeNull();
  });

  it('denies upload to another household folder', async () => {
    const res = await anonClient(f.a.jwt)
      .storage.from('receipts')
      .upload(`${f.b.household_id}/${randomUUID()}.jpg`, bytes, { contentType: 'image/jpeg' });
    expect(res.error).not.toBeNull();
  });

  it('rejects a non-uuid object key', async () => {
    const res = await anonClient(f.a.jwt)
      .storage.from('receipts')
      .upload(`not-a-uuid/x.jpg`, bytes, { contentType: 'image/jpeg' });
    expect(res.error).not.toBeNull();
  });
});
