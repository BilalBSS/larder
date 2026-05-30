// / pantry item value object
export interface PantryItem {
  id: string;
  householdId: string;
  canonicalName: string;
  displayName: string;
  category: string;
  quantity: number;
  unit: string;
  expirationDate: string | null;
  estimatedExpirationDays: number | null;
  lastPurchasedAt: string | null;
  lastUnitCost: number | null;
  notes: string | null;
  isFrozen: boolean;
  createdByUserId: string;
  updatedByUserId: string;
  createdAt: string;
  updatedAt: string;
}
