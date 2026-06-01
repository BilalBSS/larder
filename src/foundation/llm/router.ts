// / client llm router
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Entitlements } from '../billing/entitlements';

import type {
  ReceiptOCRRequest,
  ReceiptOCRResponse,
  RecipeGenerationRequest,
  RecipeGenerationResult,
} from './types';

export interface ClientLlmDeps {
  readonly supabase: Pick<SupabaseClient, 'functions'>;
  readonly entitlements: Entitlements;
}

export class EntitlementBlocked extends Error {
  readonly feature: string;
  constructor(feature: string) {
    super(`entitlement_blocked:${feature}`);
    this.name = 'EntitlementBlocked';
    this.feature = feature;
  }
}

export interface ClientLlmRouter {
  ocr(req: ReceiptOCRRequest, idempotencyKey: string): Promise<ReceiptOCRResponse>;
  recipes(req: RecipeGenerationRequest): Promise<RecipeGenerationResult>;
  creative(req: RecipeGenerationRequest): Promise<RecipeGenerationResult>;
}

export function makeClientLlmRouter(deps: ClientLlmDeps): ClientLlmRouter {
  return {
    async ocr(req, idempotencyKey) {
      return invoke<ReceiptOCRResponse, ReceiptOCRRequest>(deps, 'receipt-ocr', req, {
        'Idempotency-Key': idempotencyKey,
      });
    },
    async recipes(req) {
      return invoke<RecipeGenerationResult, RecipeGenerationRequest>(deps, 'recipe-gen', req);
    },
    async creative(req) {
      if (!deps.entitlements.creative_recipes) {
        throw new EntitlementBlocked('creative_recipes');
      }
      return invoke<RecipeGenerationResult, RecipeGenerationRequest>(
        deps,
        'recipe-gen-creative',
        req,
      );
    },
  };
}

async function invoke<TResult, TBody extends object>(
  deps: ClientLlmDeps,
  endpoint: string,
  body: TBody,
  headers: Record<string, string> = {},
): Promise<TResult> {
  const { data, error } = await deps.supabase.functions.invoke<TResult>(endpoint, {
    body: body as unknown as Record<string, unknown>,
    headers,
  });
  if (error !== null) throw error;
  if (data === null) throw new Error(`empty_response:${endpoint}`);
  return data;
}
