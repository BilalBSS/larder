// / server llm fallback router
import type { ServerLogger } from '../logger.ts';
import type {
  OCRProvider,
  RecipesProvider,
  ServerOCRRequest,
  ServerOCRResult,
  ServerRecipeRequest,
  ServerRecipeResult,
} from './types.ts';

export const MIN_CONFIDENCE = 0.7;

export interface ServerLlmRouterDeps {
  readonly ocrChain: readonly OCRProvider[];
  readonly recipesChain: readonly RecipesProvider[];
  readonly logger: ServerLogger;
}

export class AllProvidersFailedError extends Error {
  readonly context: string;
  readonly providerErrors: readonly { provider: string; error: unknown }[];
  constructor(context: string, providerErrors: readonly { provider: string; error: unknown }[]) {
    super(`all_providers_failed:${context}`);
    this.name = 'AllProvidersFailedError';
    this.context = context;
    this.providerErrors = providerErrors;
  }
}

export async function runOcr(
  deps: ServerLlmRouterDeps,
  req: ServerOCRRequest,
): Promise<ServerOCRResult> {
  return runChain(deps.logger, 'ocr', deps.ocrChain, (p) => p.ocr(req));
}

export async function runRecipes(
  deps: ServerLlmRouterDeps,
  req: ServerRecipeRequest,
): Promise<ServerRecipeResult> {
  return runChain(deps.logger, 'recipes', deps.recipesChain, (p) => p.recipes(req));
}

async function runChain<P extends { name: string }, R extends { confidence: number }>(
  logger: ServerLogger,
  context: string,
  chain: readonly P[],
  run: (p: P) => Promise<R>,
): Promise<R> {
  const errors: { provider: string; error: unknown }[] = [];
  let bestResult: R | null = null;

  for (const provider of chain) {
    try {
      const result = await run(provider);
      if (result.confidence >= MIN_CONFIDENCE) return result;
      logger.info('llm_low_confidence', {
        provider: provider.name,
        confidence: result.confidence,
      });
      if (bestResult === null || result.confidence > bestResult.confidence) {
        bestResult = result;
      }
    } catch (err) {
      errors.push({ provider: provider.name, error: err });
      logger.warn('llm_provider_failed', { provider: provider.name });
    }
  }

  if (bestResult !== null) return bestResult;
  throw new AllProvidersFailedError(context, errors);
}
