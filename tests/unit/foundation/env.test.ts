import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = process.env;

describe('client env', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('parses a valid environment and applies the posthog host default', async () => {
    process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://proj.supabase.co';
    process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'anon-key';
    delete process.env['EXPO_PUBLIC_POSTHOG_HOST'];
    const { env } = await import('../../../src/foundation/env');
    expect(env.EXPO_PUBLIC_SUPABASE_URL).toBe('https://proj.supabase.co');
    expect(env.EXPO_PUBLIC_POSTHOG_HOST).toBe('https://us.i.posthog.com');
  });

  it('reads an explicit posthog host when provided', async () => {
    process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://proj.supabase.co';
    process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'anon-key';
    process.env['EXPO_PUBLIC_POSTHOG_HOST'] = 'https://eu.i.posthog.com';
    const { env } = await import('../../../src/foundation/env');
    expect(env.EXPO_PUBLIC_POSTHOG_HOST).toBe('https://eu.i.posthog.com');
  });

  it('throws when a required variable is missing or malformed', async () => {
    process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'not-a-url';
    delete process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'];
    await expect(import('../../../src/foundation/env')).rejects.toThrow(/invalid client env/);
  });
});
