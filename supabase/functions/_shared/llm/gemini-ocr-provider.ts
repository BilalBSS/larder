// / gemini receipt ocr provider
import type { OCRProvider, ServerOCRLineItem, ServerOCRResult } from './types.ts';

interface StorageBucket {
  download(path: string): Promise<{ data: Blob | null; error: unknown }>;
}

export interface GeminiOcrDeps {
  readonly apiKey: string;
  readonly model: string;
  readonly storage: StorageBucket;
  readonly fetchImpl?: typeof fetch;
  readonly maxBytes?: number;
}

const DEFAULT_MAX_BYTES = 6 * 1024 * 1024;
const SUM_TOLERANCE = 0.05;
// / per-token usd cents
const INPUT_CENTS_PER_TOKEN = 0.00001;
const OUTPUT_CENTS_PER_TOKEN = 0.00004;

const CATEGORY_ENUM = [
  'produce',
  'dairy',
  'meat',
  'seafood',
  'pantry',
  'frozen',
  'spices',
  'beverages',
  'bakery',
  'household',
  'other',
];

const PROMPT = [
  'You are a grocery receipt parser. Read the receipt image and return structured JSON.',
  'For each line item set canonical_name to the lowercase singular grocery name',
  '(e.g. "GV ORG MILK 64OZ" -> "milk") and category to one of:',
  CATEGORY_ENUM.join(', ') + '.',
  'Set purchased_at to the ISO-8601 purchase date. Sum the line_total values and',
  'compare to total_amount to judge confidence (0 to 1).',
].join(' ');

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    store_name: { type: 'string', nullable: true },
    purchased_at: { type: 'string', nullable: true },
    total_amount: { type: 'number' },
    tax_amount: { type: 'number', nullable: true },
    confidence: { type: 'number' },
    line_items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          raw_text: { type: 'string' },
          canonical_name: { type: 'string', nullable: true },
          category: { type: 'string', enum: CATEGORY_ENUM, nullable: true },
          quantity: { type: 'number', nullable: true },
          unit: { type: 'string', nullable: true },
          unit_price: { type: 'number', nullable: true },
          line_total: { type: 'number' },
        },
        required: ['raw_text', 'line_total'],
      },
    },
  },
  required: ['total_amount', 'confidence', 'line_items'],
};

interface ParsedLine {
  raw_text?: string;
  canonical_name?: string | null;
  category?: string | null;
  quantity?: number | null;
  unit?: string | null;
  unit_price?: number | null;
  line_total?: number;
}

interface ParsedReceipt {
  store_name?: string | null;
  purchased_at?: string | null;
  total_amount?: number;
  tax_amount?: number | null;
  confidence?: number;
  line_items?: ParsedLine[];
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

export function makeGeminiOcrProvider(deps: GeminiOcrDeps): OCRProvider {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const maxBytes = deps.maxBytes ?? DEFAULT_MAX_BYTES;
  const name = `gemini:${deps.model}`;
  return {
    name,
    async ocr(req) {
      const image = await deps.storage.download(req.image_storage_key);
      if (image.error !== null || image.data === null) {
        throw new Error('receipt_image_unavailable');
      }
      if (image.data.size > maxBytes) throw new Error('receipt_image_too_large');
      const base64 = toBase64(new Uint8Array(await image.data.arrayBuffer()));

      const response = await fetchImpl(
        `https://generativelanguage.googleapis.com/v1beta/models/${deps.model}:generateContent?key=${deps.apiKey}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  { inline_data: { mime_type: 'image/jpeg', data: base64 } },
                  { text: PROMPT },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: RESPONSE_SCHEMA,
            },
          }),
        },
      );
      if (!response.ok) throw new Error(`gemini_http_${response.status}`);
      const payload = (await response.json()) as GeminiResponse;
      const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text === undefined) throw new Error('gemini_empty_response');
      const parsed = JSON.parse(text) as ParsedReceipt;

      const lineItems = (parsed.line_items ?? []).map(toLineItem);
      const usage = payload.usageMetadata;
      const costUsdCents =
        (usage?.promptTokenCount ?? 0) * INPUT_CENTS_PER_TOKEN +
        (usage?.candidatesTokenCount ?? 0) * OUTPUT_CENTS_PER_TOKEN;

      const result: ServerOCRResult = {
        store_name: parsed.store_name ?? null,
        total_amount: parsed.total_amount ?? 0,
        tax_amount: parsed.tax_amount ?? null,
        purchased_at: parsed.purchased_at ?? null,
        line_items: lineItems,
        confidence: scoreConfidence(parsed, lineItems),
        cost_usd_cents: costUsdCents,
        provider_name: name,
      };
      return result;
    },
  };
}

function toLineItem(raw: ParsedLine): ServerOCRLineItem {
  return {
    raw_text: raw.raw_text ?? '',
    canonical_name: raw.canonical_name ?? null,
    category: raw.category ?? null,
    quantity: raw.quantity ?? null,
    unit: raw.unit ?? null,
    unit_price: raw.unit_price ?? null,
    line_total: raw.line_total ?? 0,
  };
}

// / sum-check derived confidence
function scoreConfidence(parsed: ParsedReceipt, lines: ServerOCRLineItem[]): number {
  const model = clamp01(parsed.confidence ?? 0);
  if (lines.length === 0) return Math.min(model, 0.3);
  const sum = lines.reduce((acc, line) => acc + line.line_total, 0);
  const total = parsed.total_amount ?? 0;
  const matches = total === 0 || Math.abs(sum - total) <= Math.max(total * SUM_TOLERANCE, 0.02);
  return matches ? model : Math.min(model, 0.6);
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
