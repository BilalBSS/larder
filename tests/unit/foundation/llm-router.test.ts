import { describe, expect, it, vi } from 'vitest';

import type { Entitlements } from '@foundation/billing/entitlements';
import { ENTITLEMENTS } from '@foundation/billing/entitlements';
import {
  EntitlementBlocked,
  makeClientLlmRouter,
  type ClientLlmDeps,
} from '@foundation/llm/router';
import type { ReceiptOCRRequest, RecipeGenerationRequest } from '@foundation/llm/types';

function makeDeps(entitlements: Entitlements = ENTITLEMENTS.solo_monthly) {
  const invoke = vi.fn().mockResolvedValue({ data: { ok: true }, error: null });
  const deps: ClientLlmDeps = {
    supabase: { functions: { invoke } as never },
    entitlements,
  };
  return { deps, invoke };
}

const OCR_REQ: ReceiptOCRRequest = { image_storage_key: 'k', household_id: 'h-1' };
const RECIPE_REQ: RecipeGenerationRequest = {
  pantry_state: { items: [], expiring_soon: [] },
  dietary_preferences: [],
  max_recipes: 3,
};

describe('ClientLlmRouter', () => {
  it('ocr dispatches to receipt-ocr with idempotency header', async () => {
    const { deps, invoke } = makeDeps();
    await makeClientLlmRouter(deps).ocr(OCR_REQ, 'idem-1');
    expect(invoke).toHaveBeenCalledWith('receipt-ocr', {
      body: OCR_REQ,
      headers: { 'Idempotency-Key': 'idem-1' },
    });
  });

  it('recipes dispatches to recipe-gen', async () => {
    const { deps, invoke } = makeDeps();
    await makeClientLlmRouter(deps).recipes(RECIPE_REQ);
    expect(invoke).toHaveBeenCalledWith('recipe-gen', {
      body: RECIPE_REQ,
      headers: {},
    });
  });

  it('creative dispatches to recipe-gen-creative for paid tier', async () => {
    const { deps, invoke } = makeDeps(ENTITLEMENTS.household_monthly);
    await makeClientLlmRouter(deps).creative(RECIPE_REQ);
    expect(invoke).toHaveBeenCalledWith('recipe-gen-creative', expect.any(Object));
  });

  it('creative throws EntitlementBlocked for free tier', async () => {
    const { deps, invoke } = makeDeps(ENTITLEMENTS.free);
    await expect(makeClientLlmRouter(deps).creative(RECIPE_REQ)).rejects.toBeInstanceOf(
      EntitlementBlocked,
    );
    expect(invoke).not.toHaveBeenCalled();
  });

  it('re-throws edge function errors', async () => {
    const { deps } = makeDeps();
    const invokeSpy = deps.supabase.functions.invoke as ReturnType<typeof vi.fn>;
    const fault = new Error('edge-500');
    invokeSpy.mockResolvedValueOnce({ data: null, error: fault });
    await expect(makeClientLlmRouter(deps).recipes(RECIPE_REQ)).rejects.toBe(fault);
  });

  it('throws when edge function returns null data with no error', async () => {
    const { deps } = makeDeps();
    const invokeSpy = deps.supabase.functions.invoke as ReturnType<typeof vi.fn>;
    invokeSpy.mockResolvedValueOnce({ data: null, error: null });
    await expect(makeClientLlmRouter(deps).recipes(RECIPE_REQ)).rejects.toThrow('empty_response');
  });
});
