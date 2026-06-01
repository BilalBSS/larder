// / receipt cap check
import { withinCap, type Cap } from '@foundation/billing/entitlements';

export function receiptCapReached(count: number, cap: Cap): boolean {
  return !withinCap(count, cap);
}
