import { AppError } from '../errors/AppError.ts';

export type AppEnvironment = 'development' | 'test' | 'production';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

export interface RuntimeConfig {
  readonly environment: AppEnvironment;
  readonly logLevel: LogLevel;
  readonly supabaseUrl: string;
  readonly supabasePublishableKey: string;
}

const environments = new Set<AppEnvironment>(['development', 'test', 'production']);
const logLevels = new Set<LogLevel>(['debug', 'info', 'warn', 'error', 'silent']);

function invalidConfig(message: string, key: string): never {
  throw new AppError(message, {
    code: 'CONFIG_INVALID',
    userMessage: 'إعدادات تشغيل إنجاز غير صالحة.',
    context: { key },
  });
}

function parseEnum<T extends string>(
  source: Readonly<Record<string, unknown>>,
  key: string,
  allowed: ReadonlySet<T>,
  fallback: T,
): T {
  const raw = source[key];
  if (raw === undefined || raw === null || raw === '') return fallback;
  if (typeof raw !== 'string') invalidConfig(`Configuration ${key} must be a string`, key);
  const normalized = raw.trim() as T;
  if (allowed.has(normalized)) return normalized;
  return invalidConfig(`Unsupported configuration value for ${key}`, key);
}

function requiredString(source: Readonly<Record<string, unknown>>, key: string): string {
  const raw = source[key];
  if (typeof raw !== 'string' || raw.trim() === '') return invalidConfig(`Missing ${key}`, key);
  return raw.trim();
}

function parseSupabaseUrl(source: Readonly<Record<string, unknown>>, environment: AppEnvironment): string {
  const raw = requiredString(source, 'VITE_SUPABASE_URL');
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return invalidConfig('VITE_SUPABASE_URL must be a valid URL', 'VITE_SUPABASE_URL');
  }

  const localHost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !(environment !== 'production' && localHost)) {
    return invalidConfig('Supabase URL must use HTTPS', 'VITE_SUPABASE_URL');
  }
  return url.origin;
}

function parsePublishableKey(source: Readonly<Record<string, unknown>>): string {
  const key = requiredString(source, 'VITE_SUPABASE_PUBLISHABLE_KEY');
  if (!key.startsWith('sb_publishable_')) {
    return invalidConfig('Only modern Supabase publishable keys are allowed in the client', 'VITE_SUPABASE_PUBLISHABLE_KEY');
  }
  if (key.length < 24 || /\s/.test(key)) {
    return invalidConfig('Malformed Supabase publishable key', 'VITE_SUPABASE_PUBLISHABLE_KEY');
  }
  return key;
}

export function createRuntimeConfig(source: Readonly<Record<string, unknown>>): RuntimeConfig {
  const environment = parseEnum(source, 'VITE_APP_ENV', environments, 'development');
  return Object.freeze({
    environment,
    logLevel: parseEnum(source, 'VITE_APP_LOG_LEVEL', logLevels, 'info'),
    supabaseUrl: parseSupabaseUrl(source, environment),
    supabasePublishableKey: parsePublishableKey(source),
  });
}
