import { GoTrueClient } from '@supabase/auth-js';
import { PostgrestClient } from '@supabase/postgrest-js';
import type { RuntimeConfig } from '../config/env.ts';

function storageKey(url: string): string {
  return `sb-${new URL(url).hostname.split('.')[0]}-auth-token`;
}

function createMinimalClient(config: RuntimeConfig) {
  const key = config.supabasePublishableKey;
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const auth = new GoTrueClient({
    url: `${config.supabaseUrl}/auth/v1`,
    headers,
    storageKey: storageKey(config.supabaseUrl),
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  });
  const authedFetch: typeof fetch = async (input, init) => {
    const token = (await auth.getSession()).data.session?.access_token ?? key;
    const requestHeaders = new Headers(init?.headers);
    requestHeaders.set('apikey', key);
    requestHeaders.set('Authorization', `Bearer ${token}`);
    return fetch(input, { ...init, headers: requestHeaders });
  };
  const rest = new PostgrestClient(`${config.supabaseUrl}/rest/v1`, { headers: { apikey: key }, fetch: authedFetch });
  const edge = async (functionName: string, init: RequestInit = {}): Promise<Response> => {
    const slug = functionName.trim();
    if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(slug)) throw new Error('Invalid Edge Function name');
    return authedFetch(`${config.supabaseUrl}/functions/v1/${slug}`, init);
  };
  return Object.freeze({
    auth,
    from: rest.from.bind(rest),
    rpc: rest.rpc.bind(rest),
    edge,
  });
}

export type EnjazSupabaseClient = ReturnType<typeof createMinimalClient>;
export const createEnjazSupabaseClient = createMinimalClient;
