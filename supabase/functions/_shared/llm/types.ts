// / server llm types

export interface ServerOCRRequest {
  readonly image_storage_key: string;
}

export interface ServerOCRLineItem {
  readonly raw_text: string;
  readonly canonical_name: string | null;
  readonly category: string | null;
  readonly quantity: number | null;
  readonly unit: string | null;
  readonly unit_price: number | null;
  readonly line_total: number;
}

export interface ServerOCRResult {
  readonly store_name: string | null;
  readonly total_amount: number;
  readonly tax_amount: number | null;
  readonly purchased_at: string | null;
  readonly line_items: readonly ServerOCRLineItem[];
  readonly confidence: number;
  readonly cost_usd_cents: number;
  readonly provider_name: string;
}

export interface ServerRecipe {
  readonly title: string;
  readonly ingredients: readonly string[];
  readonly steps: readonly string[];
}

export interface ServerRecipeRequest {
  readonly pantry_summary: string;
  readonly dietary_preferences: readonly string[];
  readonly max_recipes: number;
}

export interface ServerRecipeResult {
  readonly recipes: readonly ServerRecipe[];
  readonly confidence: number;
  readonly cost_usd_cents: number;
  readonly provider_name: string;
}

export interface OCRProvider {
  readonly name: string;
  ocr(req: ServerOCRRequest): Promise<ServerOCRResult>;
}

export interface RecipesProvider {
  readonly name: string;
  recipes(req: ServerRecipeRequest): Promise<ServerRecipeResult>;
}
