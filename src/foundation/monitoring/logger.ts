// / structured logger

export type LogFields = Readonly<Record<string, unknown>>;

export interface Logger {
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, error?: unknown, fields?: LogFields): void;
  child(fields: LogFields): Logger;
}

export interface LoggerDeps {
  readonly console: Pick<Console, 'log' | 'warn' | 'error'>;
  readonly onError: (err: unknown, tags: Record<string, string>) => void;
}

export function makeLogger(deps: LoggerDeps, bound: LogFields = {}): Logger {
  return {
    info(message, fields) {
      deps.console.log(JSON.stringify({ level: 'info', message, ...bound, ...fields }));
    },
    warn(message, fields) {
      deps.console.warn(JSON.stringify({ level: 'warn', message, ...bound, ...fields }));
    },
    error(message, error, fields) {
      deps.console.error(
        JSON.stringify({
          level: 'error',
          message,
          ...bound,
          ...fields,
          error: describeError(error),
        }),
      );
      if (error !== undefined) {
        deps.onError(error, toTags({ ...bound, ...fields }));
      }
    },
    child(extra) {
      return makeLogger(deps, { ...bound, ...extra });
    },
  };
}

function describeError(err: unknown): string | undefined {
  if (err === undefined) return undefined;
  if (err instanceof Error) return err.message;
  return String(err);
}

function toTags(fields: LogFields): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    out[key] = typeof value === 'string' ? value : JSON.stringify(value);
  }
  return out;
}
