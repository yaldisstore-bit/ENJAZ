import type { LogLevel } from '../config/env.ts';

export type LogMetadata = Readonly<Record<string, unknown>>;

type ConsoleMethod = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_WEIGHT: Record<Exclude<LogLevel, 'silent'>, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const SENSITIVE_KEY = /(password|passcode|token|secret|authorization|cookie|session|api[_-]?key)/i;
const SENSITIVE_TEXT = /(bearer\s+[a-z0-9._~+\/-]+=*|(?:password|passcode|token|secret|api[_-]?key)\s*[:=]\s*[^\s,;]+)/gi;
const MAX_REDACTION_DEPTH = 8;

function redactString(value: string): string {
  return value.replace(SENSITIVE_TEXT, '[REDACTED]');
}

function redactValue(value: unknown, seen: WeakSet<object>, depth: number): unknown {
  if (depth > MAX_REDACTION_DEPTH) return '[MAX_DEPTH]';
  if (typeof value === 'string') return redactString(value);
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) {
    return Object.freeze({ name: value.name, message: redactString(value.message) });
  }
  if (seen.has(value)) return '[CIRCULAR]';
  seen.add(value);

  if (Array.isArray(value)) {
    const result = value.map((entry) => redactValue(entry, seen, depth + 1));
    return Object.freeze(result);
  }

  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    result[key] = SENSITIVE_KEY.test(key) ? '[REDACTED]' : redactValue(entry, seen, depth + 1);
  }
  return Object.freeze(result);
}

export function redactMetadata(input: LogMetadata): LogMetadata {
  return redactValue(input, new WeakSet<object>(), 0) as LogMetadata;
}

export interface Logger {
  debug(message: string, metadata?: LogMetadata): void;
  info(message: string, metadata?: LogMetadata): void;
  warn(message: string, metadata?: LogMetadata): void;
  error(message: string, metadata?: LogMetadata): void;
}

export function createLogger(level: LogLevel): Logger {
  const enabled = (method: ConsoleMethod): boolean =>
    level !== 'silent' && LEVEL_WEIGHT[method] >= LEVEL_WEIGHT[level];

  const write = (method: ConsoleMethod, message: string, metadata?: LogMetadata): void => {
    if (!enabled(method)) return;
    const clean = metadata ? redactMetadata(metadata) : undefined;
    const cleanMessage = redactString(message);
    if (clean) console[method](`[ENJAZ] ${cleanMessage}`, clean);
    else console[method](`[ENJAZ] ${cleanMessage}`);
  };

  return Object.freeze({
    debug: (message: string, metadata?: LogMetadata) => write('debug', message, metadata),
    info: (message: string, metadata?: LogMetadata) => write('info', message, metadata),
    warn: (message: string, metadata?: LogMetadata) => write('warn', message, metadata),
    error: (message: string, metadata?: LogMetadata) => write('error', message, metadata),
  });
}
