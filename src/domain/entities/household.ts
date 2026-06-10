// / household entity types
export type HouseholdType = 'family' | 'couple' | 'roommates' | 'shared';

export function isHouseholdType(value: string): value is HouseholdType {
  return value === 'family' || value === 'couple' || value === 'roommates' || value === 'shared';
}
