// / local dev mock providers
import type { OCRProvider, RecipesProvider, ServerOCRResult, ServerRecipeResult } from './types';

export function mockOcrProvider(name: string, confidence = 0.95): OCRProvider {
  return {
    name,
    async ocr() {
      const result: ServerOCRResult = {
        store_name: 'Mock Store',
        total_amount: 12.34,
        tax_amount: 1.23,
        purchased_at: '2026-05-10T00:00:00.000Z',
        line_items: [
          {
            raw_text: 'BANANA 1.50',
            canonical_name: 'banana',
            category: 'produce',
            quantity: 1,
            unit: 'each',
            unit_price: 1.5,
            line_total: 1.5,
          },
        ],
        confidence,
        cost_usd_cents: 5,
        provider_name: name,
      };
      return result;
    },
  };
}

export function mockRecipesProvider(name: string, confidence = 0.95): RecipesProvider {
  return {
    name,
    async recipes() {
      const result: ServerRecipeResult = {
        recipes: [{ title: 'Mock Bowl', ingredients: ['banana'], steps: ['mash banana'] }],
        confidence,
        cost_usd_cents: 4,
        provider_name: name,
      };
      return result;
    },
  };
}
