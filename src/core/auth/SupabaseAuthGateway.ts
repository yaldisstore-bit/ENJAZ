import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import type { EnjazSupabaseClient } from '../supabase/client.ts';
import type { AuthFailureLike, AuthGateway, EnjazAuthSession } from './authGateway.ts';

function toSession(session: Session | null): EnjazAuthSession | null {
  if (!session) return null;
  return Object.freeze({ user: Object.freeze({ id: session.user.id, ...(session.user.email ? { email: session.user.email } : {}) }) });
}

function toAuthFailure(error: unknown): AuthFailureLike | null {
  if (!error || typeof error !== 'object') return null;
  const source = error as Readonly<Record<string, unknown>>;
  return Object.freeze({
    ...(typeof source.name === 'string' ? { name: source.name } : {}),
    ...(typeof source.message === 'string' ? { message: source.message } : {}),
    ...(typeof source.code === 'string' || typeof source.code === 'number' ? { code: String(source.code) } : {}),
    ...(typeof source.status === 'number' ? { status: source.status } : {}),
  });
}

export function createSupabaseAuthGateway(client: EnjazSupabaseClient): AuthGateway {
  return Object.freeze({
    async getUser() {
      const { data, error } = await client.auth.getUser();
      const user = data.user ? Object.freeze({ id: data.user.id, ...(data.user.email ? { email: data.user.email } : {}) }) : null;
      return Object.freeze({ data: Object.freeze({ user }), error: toAuthFailure(error) });
    },
    async signInWithPassword(input: Readonly<{ email: string; password: string }>) {
      const { data, error } = await client.auth.signInWithPassword(input);
      const user = data.user ? Object.freeze({ id: data.user.id, ...(data.user.email ? { email: data.user.email } : {}) }) : null;
      return Object.freeze({ data: Object.freeze({ user, session: toSession(data.session) }), error: toAuthFailure(error) });
    },
    async signUp(input: Readonly<{ email: string; password: string; displayName: string }>) {
      const { data, error } = await client.auth.signUp({ email: input.email, password: input.password, options: { data: { display_name: input.displayName } } });
      const user = data.user ? Object.freeze({ id: data.user.id, ...(data.user.email ? { email: data.user.email } : {}) }) : null;
      return Object.freeze({ data: Object.freeze({ user, session: toSession(data.session) }), error: toAuthFailure(error) });
    },
    async requestPasswordReset(email: string, redirectTo: string) { return toAuthFailure((await client.auth.resetPasswordForEmail(email, { redirectTo })).error); },
    async updatePassword(password: string) { return toAuthFailure((await client.auth.updateUser({ password })).error); },
    async signOut() { return toAuthFailure((await client.auth.signOut()).error); },
    async bootstrapWorkspace(displayName: string, workspaceName?: string) {
      const args = workspaceName?.trim() ? { p_display_name: displayName, p_workspace_name: workspaceName.trim() } : { p_display_name: displayName };
      const { data, error } = await client.rpc('bootstrap_personal_workspace', args);
      return Object.freeze({ data, error: toAuthFailure(error) });
    },
    onAuthStateChange(callback: (event: string, session: EnjazAuthSession | null) => void) {
      return client.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => callback(event, toSession(session))).data.subscription;
    },
  });
}
