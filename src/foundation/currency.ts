// / currency context
import { createContext, useContext } from 'react';

const GLYPH: Record<string, string> = { GBP: '£', USD: '$', EUR: '€' };

export interface CurrencyOption {
  readonly code: string;
  readonly label: string;
}

export const CURRENCY_OPTIONS: readonly CurrencyOption[] = [
  { code: 'GBP', label: 'British pound' },
  { code: 'USD', label: 'US dollar' },
  { code: 'EUR', label: 'Euro' },
];

export function currencyGlyph(code: string): string {
  return GLYPH[code] ?? code;
}

export function isSupportedCurrency(code: string): boolean {
  return code in GLYPH;
}

const CurrencyContext = createContext<string>('GBP');

export const CurrencyProvider = CurrencyContext.Provider;

export function useCurrency(): string {
  return useContext(CurrencyContext);
}
