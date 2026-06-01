import { describe, expect, it } from 'vitest';

import { CURRENCY_OPTIONS, currencyGlyph, isSupportedCurrency } from '@foundation/currency';

describe('currency', () => {
  it('maps supported codes to glyphs', () => {
    expect(currencyGlyph('GBP')).toBe('£');
    expect(currencyGlyph('USD')).toBe('$');
    expect(currencyGlyph('EUR')).toBe('€');
  });

  it('falls back to the code for an unknown currency', () => {
    expect(currencyGlyph('JPY')).toBe('JPY');
  });

  it('recognizes supported currencies', () => {
    expect(isSupportedCurrency('USD')).toBe(true);
    expect(isSupportedCurrency('XYZ')).toBe(false);
  });

  it('offers the three supported options', () => {
    expect(CURRENCY_OPTIONS.map((option) => option.code)).toEqual(['GBP', 'USD', 'EUR']);
  });
});
