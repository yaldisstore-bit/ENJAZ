import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { RuntimeConfig } from '../config/env.ts';
import type { Database } from './database.types.ts';

export type EnjazSupabaseClient = SupabaseClient<Database>;

export function createEnjazSupabaseClient(config: RuntimeConfig): EnjazSupabaseClient {
  return createClient<Database>(config.supabaseUrl, config.supabasePublishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });
}
