// / equal split settlement
import type { HouseholdMember } from '@domain/entities/household-member';

import type { MemberSpend } from './aggregate';

export interface Transfer {
  readonly fromUserId: string;
  readonly toUserId: string;
  readonly amount: number;
}

export interface Settlement {
  readonly transfers: Transfer[];
  readonly largestTransfer: Transfer | null;
  readonly splitCount: number;
}

interface Net {
  userId: string;
  net: number;
}

// / children and former excluded
export function settleUp(
  spends: readonly MemberSpend[],
  members: readonly HouseholdMember[],
): Settlement {
  const splitters = members
    .filter((member) => member.role !== 'child')
    .map((member) => member.userId)
    .sort();
  if (splitters.length < 2) {
    return { transfers: [], largestTransfer: null, splitCount: splitters.length };
  }

  const splitterSet = new Set(splitters);
  const cents = new Map<string, number>();
  for (const spend of spends) {
    if (!spend.former && splitterSet.has(spend.userId)) {
      cents.set(spend.userId, Math.round(spend.total * 100));
    }
  }
  const totalCents = [...cents.values()].reduce((sum, value) => sum + value, 0);
  if (totalCents === 0) {
    return { transfers: [], largestTransfer: null, splitCount: splitters.length };
  }

  const base = Math.floor(totalCents / splitters.length);
  let remainder = totalCents - base * splitters.length;
  const nets: Net[] = splitters.map((userId) => {
    const extra = remainder > 0 ? 1 : 0;
    remainder -= extra;
    return { userId, net: (cents.get(userId) ?? 0) - base - extra };
  });

  const creditors = nets.filter((entry) => entry.net > 0).sort(byNetDesc);
  const debtors = nets
    .filter((entry) => entry.net < 0)
    .map((entry) => ({ userId: entry.userId, net: -entry.net }))
    .sort(byNetDesc);

  const transfers: Transfer[] = [];
  let creditorIndex = 0;
  for (const debtor of debtors) {
    let owed = debtor.net;
    while (owed > 0) {
      const creditor = creditors[creditorIndex];
      if (creditor === undefined) break;
      const amount = Math.min(owed, creditor.net);
      transfers.push({
        fromUserId: debtor.userId,
        toUserId: creditor.userId,
        amount: amount / 100,
      });
      owed -= amount;
      creditor.net -= amount;
      if (creditor.net === 0) creditorIndex += 1;
    }
  }

  let largest: Transfer | null = null;
  for (const transfer of transfers) {
    if (largest === null || transfer.amount > largest.amount) largest = transfer;
  }
  return { transfers, largestTransfer: largest, splitCount: splitters.length };
}

function byNetDesc(a: Net, b: Net): number {
  return b.net - a.net || a.userId.localeCompare(b.userId);
}
