import { describe, expect, it } from 'vitest';

import type { HouseholdMember } from '@domain/entities/household-member';
import type { MemberSpend } from '@domain/use-cases/spending/aggregate';
import { settleUp } from '@domain/use-cases/spending/settle-up';

function spend(userId: string, total: number, former = false): MemberSpend {
  return { userId, total, receiptCount: 1, sharePct: 0, former };
}

function member(userId: string, role: HouseholdMember['role'] = 'member'): HouseholdMember {
  return { userId, role };
}

describe('settleUp', () => {
  it('splits a two-member month into one transfer', () => {
    const result = settleUp(
      [spend('sarah', 340), spend('tom', 210)],
      [member('sarah', 'owner'), member('tom')],
    );
    expect(result.transfers).toEqual([{ fromUserId: 'tom', toUserId: 'sarah', amount: 65 }]);
    expect(result.largestTransfer?.amount).toBe(65);
    expect(result.splitCount).toBe(2);
  });

  it('matches debtors to creditors across three members', () => {
    const result = settleUp(
      [spend('a', 300), spend('b', 0), spend('c', 0)],
      [member('a'), member('b'), member('c')],
    );
    expect(result.transfers).toEqual([
      { fromUserId: 'b', toUserId: 'a', amount: 100 },
      { fromUserId: 'c', toUserId: 'a', amount: 100 },
    ]);
  });

  it('spills one debtor across two creditors', () => {
    const result = settleUp(
      [spend('a', 200), spend('b', 160), spend('c', 0), spend('d', 0)],
      [member('a'), member('b'), member('c'), member('d')],
    );
    expect(result.transfers).toEqual([
      { fromUserId: 'c', toUserId: 'a', amount: 90 },
      { fromUserId: 'd', toUserId: 'a', amount: 20 },
      { fromUserId: 'd', toUserId: 'b', amount: 70 },
    ]);
    const paid = result.transfers.reduce((sum, transfer) => sum + transfer.amount, 0);
    expect(Math.round(paid * 100)).toBe(18000);
    expect(result.largestTransfer?.amount).toBe(90);
  });

  it('charges the extra penny to debtors by sort order', () => {
    const result = settleUp(
      [spend('a', 0), spend('b', 0), spend('c', 100.01)],
      [member('a'), member('b'), member('c')],
    );
    expect(result.transfers).toEqual([
      { fromUserId: 'a', toUserId: 'c', amount: 33.34 },
      { fromUserId: 'b', toUserId: 'c', amount: 33.34 },
    ]);
    const received = result.transfers.reduce((sum, transfer) => sum + transfer.amount, 0);
    expect(Math.round(received * 100)).toBe(6668);
  });

  it('conserves every penny under uneven splits', () => {
    const result = settleUp(
      [spend('a', 100.01), spend('b', 0), spend('c', 0)],
      [member('a'), member('b'), member('c')],
    );
    expect(result.transfers).toEqual([
      { fromUserId: 'b', toUserId: 'a', amount: 33.34 },
      { fromUserId: 'c', toUserId: 'a', amount: 33.33 },
    ]);
    const paid = result.transfers.reduce((sum, transfer) => sum + transfer.amount, 0);
    expect(Math.round(paid * 100)).toBe(6667);
  });

  it('returns the empty steady state when even', () => {
    const result = settleUp([spend('a', 80), spend('b', 80)], [member('a'), member('b')]);
    expect(result.transfers).toEqual([]);
    expect(result.largestTransfer).toBeNull();
  });

  it('returns empty for solo households', () => {
    const result = settleUp([spend('a', 100)], [member('a', 'owner')]);
    expect(result.transfers).toEqual([]);
    expect(result.splitCount).toBe(1);
  });

  it('excludes children from the split but not attribution', () => {
    const result = settleUp(
      [spend('a', 90), spend('kid', 30), spend('b', 0)],
      [member('a', 'owner'), member('b'), member('kid', 'child')],
    );
    expect(result.splitCount).toBe(2);
    expect(result.transfers).toEqual([{ fromUserId: 'b', toUserId: 'a', amount: 45 }]);
  });

  it('excludes former-member spend from the split total', () => {
    const result = settleUp(
      [spend('a', 60), spend('gone', 40, true), spend('b', 0)],
      [member('a'), member('b')],
    );
    expect(result.transfers).toEqual([{ fromUserId: 'b', toUserId: 'a', amount: 30 }]);
  });

  it('settles nothing when nobody spent', () => {
    const result = settleUp([spend('a', 0), spend('b', 0)], [member('a'), member('b')]);
    expect(result.transfers).toEqual([]);
    expect(result.largestTransfer).toBeNull();
  });

  it('returns an empty split when only children remain', () => {
    const result = settleUp(
      [spend('kid1', 40), spend('kid2', 0)],
      [member('kid1', 'child'), member('kid2', 'child')],
    );
    expect(result).toEqual({ transfers: [], largestTransfer: null, splitCount: 0 });
  });

  it('needs two adults — one adult plus a child and a former does not split', () => {
    const result = settleUp(
      [spend('a', 50), spend('gone', 30, true), spend('kid', 10)],
      [member('a', 'owner'), member('kid', 'child')],
    );
    expect(result).toEqual({ transfers: [], largestTransfer: null, splitCount: 1 });
  });
});
