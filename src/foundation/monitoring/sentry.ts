// / sentry wrapper
import * as Sentry from '@sentry/react-native';

import { env } from '../env';

export function initSentry(): void {
  if (env.EXPO_PUBLIC_SENTRY_DSN === undefined) return;
  Sentry.init({
    dsn: env.EXPO_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    enableAutoSessionTracking: true,
  });
}

export function captureException(err: unknown, tags: Record<string, string>): void {
  Sentry.withScope((scope) => {
    scope.setTags(tags);
    Sentry.captureException(err);
  });
}
