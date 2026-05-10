// / posthog client factory
import PostHog from 'posthog-react-native';

import { env } from '../env';

export function initPosthog(): PostHog | null {
  if (env.EXPO_PUBLIC_POSTHOG_API_KEY === undefined) return null;
  return new PostHog(env.EXPO_PUBLIC_POSTHOG_API_KEY, {
    host: env.EXPO_PUBLIC_POSTHOG_HOST,
  });
}

export type PosthogClient = PostHog;
