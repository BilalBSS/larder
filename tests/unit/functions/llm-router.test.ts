import { describe, expect, it, vi } from 'vitest';

import { makeServerLogger } from '../../../supabase/functions/_shared/logger';
import { mockOcrProvider } from '../../../supabase/functions/_shared/llm/mock-providers';
import { AllProvidersFailedError, runOcr } from '../../../supabase/functions/_shared/llm/router';
import type { OCRProvider } from '../../../supabase/functions/_shared/llm/types';

function silentLogger() {
  return makeServerLogger({ console: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } });
}

function throwingProvider(name: string, err: Error): OCRProvider {
  return {
    name,
    ocr: vi.fn().mockRejectedValue(err),
  };
}

const OCR_REQ = { image_storage_key: 'k' };

describe('runOcr', () => {
  it('returns primary high-confidence result without trying fallback', async () => {
    const primary = mockOcrProvider('primary', 0.95);
    const fallback = mockOcrProvider('fallback', 0.95);
    const fallbackSpy = vi.spyOn(fallback, 'ocr');
    const result = await runOcr(
      { ocrChain: [primary, fallback], recipesChain: [], logger: silentLogger() },
      OCR_REQ,
    );
    expect(result.provider_name).toBe('primary');
    expect(fallbackSpy).not.toHaveBeenCalled();
  });

  it('falls through low-confidence primary into fallback', async () => {
    const primary = mockOcrProvider('primary', 0.4);
    const fallback = mockOcrProvider('fallback', 0.95);
    const result = await runOcr(
      { ocrChain: [primary, fallback], recipesChain: [], logger: silentLogger() },
      OCR_REQ,
    );
    expect(result.provider_name).toBe('fallback');
  });

  it('skips throwing providers and uses the next', async () => {
    const result = await runOcr(
      {
        ocrChain: [throwingProvider('p1', new Error('boom')), mockOcrProvider('p2', 0.95)],
        recipesChain: [],
        logger: silentLogger(),
      },
      OCR_REQ,
    );
    expect(result.provider_name).toBe('p2');
  });

  it('returns the best low-confidence result when none meet threshold', async () => {
    const result = await runOcr(
      {
        ocrChain: [mockOcrProvider('p1', 0.4), mockOcrProvider('p2', 0.6)],
        recipesChain: [],
        logger: silentLogger(),
      },
      OCR_REQ,
    );
    expect(result.provider_name).toBe('p2');
    expect(result.confidence).toBe(0.6);
  });

  it('throws AllProvidersFailedError when every provider throws', async () => {
    await expect(
      runOcr(
        {
          ocrChain: [
            throwingProvider('p1', new Error('a')),
            throwingProvider('p2', new Error('b')),
          ],
          recipesChain: [],
          logger: silentLogger(),
        },
        OCR_REQ,
      ),
    ).rejects.toBeInstanceOf(AllProvidersFailedError);
  });

  it('AllProvidersFailedError carries per-provider errors', async () => {
    try {
      await runOcr(
        {
          ocrChain: [
            throwingProvider('p1', new Error('a')),
            throwingProvider('p2', new Error('b')),
          ],
          recipesChain: [],
          logger: silentLogger(),
        },
        OCR_REQ,
      );
    } catch (err) {
      const failure = err as AllProvidersFailedError;
      expect(failure.providerErrors).toHaveLength(2);
      expect(failure.providerErrors[0]?.provider).toBe('p1');
      expect(failure.providerErrors[1]?.provider).toBe('p2');
    }
  });
});
