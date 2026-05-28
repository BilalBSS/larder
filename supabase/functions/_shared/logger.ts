// / server structured logger

export type LogFields = Readonly<Record<string, unknown>>;

export interface ServerLogger {
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, error?: unknown, fields?: LogFields): void;
  child(fields: LogFields): ServerLogger;
}

export interface ServerLoggerDeps {
  readonly console: Pick<Console, 'log' | 'warn' | 'error'>;
}

export function makeServerLogger(deps: ServerLoggerDeps, bound: LogFields = {}): ServerLogger {
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
    },
    child(extra) {
      return makeServerLogger(deps, { ...bound, ...extra });
    },
  };
}

function describeError(err: unknown): string | undefined {
  if (err === undefined) return undefined;
  if (err instanceof Error) return err.message;
  return String(err);
}
