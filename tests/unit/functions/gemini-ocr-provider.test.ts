import { describe, expect, it, vi } from 'vitest';

import { makeGeminiOcrProvider } from '../../../supabase/functions/_shared/llm/gemini-ocr-provider';

function blob(bytes: number[], size?: number): Blob {
  const arr = new Uint8Array(bytes);
  return { size: size ?? arr.length, arrayBuffer: async () => arr.buffer } as unknown as Blob;
}

function storageWith(data: Blob | null, error: unknown = null) {
  return { download: vi.fn().mockResolvedValue({ data, error }) };
}

function geminiResponse(
  parsed: unknown,
  usage = { promptTokenCount: 1000, candidatesTokenCount: 200 },
) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify(parsed) }] } }],
      usageMetadata: usage,
    }),
  };
}

function fetchReturning(response: unknown): typeof fetch {
  return vi.fn().mockResolvedValue(response) as unknown as typeof fetch;
}

const goodReceipt = {
  store_name: 'Tesco',
  purchased_at: '2026-05-10T00:00:00.000Z',
  total_amount: 3.5,
  tax_amount: 0.2,
  confidence: 0.9,
  line_items: [
    {
      raw_text: 'GV MILK',
      canonical_name: 'milk',
      category: 'dairy',
      quantity: 1,
      unit: 'each',
      unit_price: 1.5,
      line_total: 1.5,
    },
    {
      raw_text: 'BANANAS',
      canonical_name: 'banana',
      category: 'produce',
      quantity: 1,
      unit: 'kg',
      unit_price: 2,
      line_total: 2,
    },
  ],
};

const singleReceipt = {
  store_name: 'Co-op',
  purchased_at: '2026-05-11T00:00:00.000Z',
  total_amount: 2,
  tax_amount: null,
  confidence: 0.88,
  line_items: [
    {
      raw_text: 'BANANAS',
      canonical_name: 'banana',
      category: 'produce',
      quantity: 1,
      unit: 'kg',
      unit_price: 2,
      line_total: 2,
    },
  ],
};

describe('makeGeminiOcrProvider', () => {
  it('parses a receipt into structured line items with category', async () => {
    const provider = makeGeminiOcrProvider({
      apiKey: 'k',
      model: 'm',
      storage: storageWith(blob([1, 2, 3])),
      fetchImpl: fetchReturning(geminiResponse(goodReceipt)),
    });
    const result = await provider.ocr({ image_storage_key: 'h/r.jpg' });
    expect(result.store_name).toBe('Tesco');
    expect(result.purchased_at).toBe('2026-05-10T00:00:00.000Z');
    expect(result.line_items).toHaveLength(2);
    expect(result.line_items[0]).toMatchObject({
      canonical_name: 'milk',
      category: 'dairy',
      line_total: 1.5,
    });
    expect(result.confidence).toBe(0.9);
    expect(result.provider_name).toBe('gemini:m');
  });

  it('computes cost from usage metadata', async () => {
    const provider = makeGeminiOcrProvider({
      apiKey: 'k',
      model: 'm',
      storage: storageWith(blob([1])),
      fetchImpl: fetchReturning(
        geminiResponse(goodReceipt, { promptTokenCount: 1000, candidatesTokenCount: 200 }),
      ),
    });
    const result = await provider.ocr({ image_storage_key: 'h/r.jpg' });
    expect(result.cost_usd_cents).toBeCloseTo(0.018, 6);
  });

  it('lowers confidence when the line sum mismatches the total', async () => {
    const provider = makeGeminiOcrProvider({
      apiKey: 'k',
      model: 'm',
      storage: storageWith(blob([1])),
      fetchImpl: fetchReturning(
        geminiResponse({ ...goodReceipt, total_amount: 99, confidence: 0.95 }),
      ),
    });
    const result = await provider.ocr({ image_storage_key: 'h/r.jpg' });
    expect(result.confidence).toBeLessThanOrEqual(0.6);
  });

  it('rejects an oversize image before calling gemini', async () => {
    const fetchSpy = fetchReturning(geminiResponse(goodReceipt));
    const provider = makeGeminiOcrProvider({
      apiKey: 'k',
      model: 'm',
      storage: storageWith(blob([1], 10_000_000)),
      fetchImpl: fetchSpy,
      maxBytes: 100,
    });
    await expect(provider.ocr({ image_storage_key: 'h/r.jpg' })).rejects.toThrow(
      'receipt_image_too_large',
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('throws when the image is unavailable', async () => {
    const provider = makeGeminiOcrProvider({
      apiKey: 'k',
      model: 'm',
      storage: storageWith(null, { message: 'gone' }),
      fetchImpl: fetchReturning(geminiResponse(goodReceipt)),
    });
    await expect(provider.ocr({ image_storage_key: 'h/r.jpg' })).rejects.toThrow(
      'receipt_image_unavailable',
    );
  });

  it('throws on a non-ok gemini response so the chain can fall back', async () => {
    const provider = makeGeminiOcrProvider({
      apiKey: 'k',
      model: 'm',
      storage: storageWith(blob([1])),
      fetchImpl: fetchReturning({ ok: false, status: 500, json: async () => ({}) }),
    });
    await expect(provider.ocr({ image_storage_key: 'h/r.jpg' })).rejects.toThrow('gemini_http_500');
  });
});

// / accuracy measurement, gemini mocked
describe('gemini ocr eval', () => {
  const fixtures = [
    { name: 'two-line grocery', receipt: goodReceipt, items: 2, first: 'milk' },
    { name: 'single produce', receipt: singleReceipt, items: 1, first: 'banana' },
  ];
  for (const fixture of fixtures) {
    it(`extracts ${fixture.name}`, async () => {
      const provider = makeGeminiOcrProvider({
        apiKey: 'k',
        model: 'm',
        storage: storageWith(blob([1])),
        fetchImpl: fetchReturning(geminiResponse(fixture.receipt)),
      });
      const result = await provider.ocr({ image_storage_key: 'h/r.jpg' });
      expect(result.line_items).toHaveLength(fixture.items);
      expect(result.line_items[0]?.canonical_name).toBe(fixture.first);
    });
  }
});
