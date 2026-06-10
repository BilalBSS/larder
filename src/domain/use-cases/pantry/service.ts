// / wired pantry service
import type { CanonicalMatch } from '@data/dtos/canonical-ingredient-dto';
import { makeCanonicalIngredientRepository } from '@data/repositories/canonical-ingredient-repository';
import {
  makePantryRepository,
  type AddPantryItemInput,
  type RemovePantryItemInput,
  type UpdatePantryItemInput,
} from '@data/repositories/pantry-repository';
import type { PantryItem } from '@domain/entities/pantry-item';
import { supabase } from '@foundation/auth/supabase';
import type { Entitlements } from '@foundation/billing/entitlements';

import { addPantryItem } from './add';
import { getPantryItem } from './get';
import { listPantry } from './list';
import { lookupCanonical, lookupManyCanonical } from './lookup';
import { removePantryItem } from './remove';
import { updatePantryItem } from './update';

export interface PantryService {
  list(householdId: string): Promise<PantryItem[]>;
  count(householdId: string): Promise<number>;
  get(id: string, householdId: string): Promise<PantryItem | null>;
  add(input: AddPantryItemInput, entitlements: Entitlements): Promise<void>;
  update(input: UpdatePantryItemInput): Promise<void>;
  remove(input: RemovePantryItemInput): Promise<void>;
  lookup(name: string): Promise<CanonicalMatch | null>;
  lookupMany(names: string[]): Promise<Map<string, CanonicalMatch>>;
}

const repo = makePantryRepository({ supabase });
const canonicalRepo = makeCanonicalIngredientRepository({ supabase });

export const pantryService: PantryService = {
  list: (householdId) => listPantry(repo, householdId),
  count: (householdId) => repo.count(householdId),
  get: (id, householdId) => getPantryItem(repo, id, householdId),
  add: (input, entitlements) => addPantryItem(repo, input, entitlements),
  update: (input) => updatePantryItem(repo, input),
  remove: (input) => removePantryItem(repo, input),
  lookup: (name) => lookupCanonical(canonicalRepo, name),
  lookupMany: (names) => lookupManyCanonical(canonicalRepo, names),
};
