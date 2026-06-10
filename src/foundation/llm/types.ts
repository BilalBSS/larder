export interface RecipeGenerationRequest {
  pantry_state: PantryStateSnapshot;
  dietary_preferences: DietaryPreference[];
  max_recipes: number;
  cuisine_hint?: string | undefined;
  expiration_urgency_items?: string[] | undefined;
}

export interface RecipeGenerationResult {
  recipes: GeneratedRecipe[];
  cost_usd: number;
  provider_name: string;
  latency_ms: number;
}

export interface ReceiptOCRRequest {
  image_storage_key: string;
  household_id: string;
}

export type ReceiptOCRStatus = 'pending' | 'succeeded' | 'failed';

export interface ReceiptOCRResponse {
  receipt_id: string;
  status: ReceiptOCRStatus;
  line_items?: ParsedLineItem[] | undefined;
  created: boolean;
}

export interface PantryStateSnapshot {
  items: PantryItemSnapshot[];
  expiring_soon: string[];
}

export interface PantryItemSnapshot {
  canonical_name: string;
  category: string;
  quantity: number;
  unit: string;
  expiration_date?: string | undefined;
}

export interface DietaryPreference {
  type: 'allergy' | 'dislike' | 'diet' | 'cuisine';
  value: string;
  severity?: 'strict' | 'prefer' | undefined;
}

export interface GeneratedRecipe {
  title: string;
  description?: string | undefined;
  prep_minutes?: number | undefined;
  cook_minutes?: number | undefined;
  servings: number;
  ingredients: GeneratedIngredient[];
  steps: GeneratedStep[];
  cuisine?: string | undefined;
  difficulty?: 'easy' | 'medium' | 'hard' | undefined;
}

export interface GeneratedIngredient {
  canonical_name: string;
  quantity: number;
  unit: string;
  is_optional?: boolean | undefined;
  notes?: string | undefined;
}

export interface GeneratedStep {
  instruction: string;
  timer_seconds?: number | undefined;
}

export interface ParsedLineItem {
  raw_text: string;
  canonical_name: string | null;
  category: string | null;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  line_total: number;
}

export class AllProvidersFailedError extends Error {
  constructor(
    public readonly context: string,
    public readonly providerErrors: readonly { provider: string; error: unknown }[],
  ) {
    super(`all providers failed: ${context}`);
    this.name = 'AllProvidersFailedError';
  }
}
