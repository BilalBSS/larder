// / wired pantry service
import type { CanonicalMatch } from '@data/dtos/canonical-ingredient-dto';
import { makeCanonicalIngredientRepository } from '@data/repositories/canonical-ingredient-repository';
import {
  makePantryRepository,
  type AddPantryItemInput,
  type RemovePantryItemInput,
} from '@data/repositories/pantry-repository';
import type { PantryItem } from '@domain/entities/pantry-item';
import { supabase } from '@foundation/auth/supabase';
import type { Entitlements } from '@foundation/billing/entitlements';

import { addPantryItem } from './add';
import { listPantry } from './list';
import { lookupCanonical } from './lookup';
import { removePantryItem } from './remove';

export interface PantryService {
  list(householdId: string): Promise<PantryItem[]>;
  add(input: AddPantryItemInput, entitlements: Entitlements): Promise<void>;
  remove(input: RemovePantryItemInput): Promise<void>;
  lookup(name: string): Promise<CanonicalMatch | null>;
}

const repo = makePantryRepository({ supabase });
const canonicalRepo = makeCanonicalIngredientRepository({ supabase });

export const pantryService: PantryService = {
  list: (householdId) => listPantry(repo, householdId),
  add: (input, entitlements) => addPantryItem(repo, input, entitlements),
  remove: (input) => removePantryItem(repo, input),
  lookup: (name) => lookupCanonical(canonicalRepo, name),
};
