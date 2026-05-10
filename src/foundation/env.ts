// / zod env schema
import { z } from 'zod';

const ClientEnvSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.url(),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  EXPO_PUBLIC_SENTRY_DSN: z.url().optional(),
  EXPO_PUBLIC_POSTHOG_API_KEY: z.string().optional(),
  EXPO_PUBLIC_POSTHOG_HOST: z.url().default('https://us.i.posthog.com'),
  EXPO_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
  EXPO_PUBLIC_REVENUECAT_PUBLIC_API_KEY: z.string().optional(),
});

export type ClientEnv = z.infer<typeof ClientEnvSchema>;

const parsed = ClientEnvSchema.safeParse({
  EXPO_PUBLIC_SUPABASE_URL: process.env['EXPO_PUBLIC_SUPABASE_URL'],
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'],
  EXPO_PUBLIC_SENTRY_DSN: process.env['EXPO_PUBLIC_SENTRY_DSN'],
  EXPO_PUBLIC_POSTHOG_API_KEY: process.env['EXPO_PUBLIC_POSTHOG_API_KEY'],
  EXPO_PUBLIC_POSTHOG_HOST: process.env['EXPO_PUBLIC_POSTHOG_HOST'],
  EXPO_PUBLIC_TURNSTILE_SITE_KEY: process.env['EXPO_PUBLIC_TURNSTILE_SITE_KEY'],
  EXPO_PUBLIC_REVENUECAT_PUBLIC_API_KEY: process.env['EXPO_PUBLIC_REVENUECAT_PUBLIC_API_KEY'],
});

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`invalid client env:\n${issues}`);
}

export const env: ClientEnv = parsed.data;
