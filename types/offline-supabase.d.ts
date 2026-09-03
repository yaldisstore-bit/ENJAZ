declare module '@supabase/supabase-js' {
  export interface User { readonly id: string; readonly email?: string }
  export interface Session { readonly user: User }
  export type AuthChangeEvent = string;
  export interface Subscription { unsubscribe(): void }
  export interface AuthError { readonly name: string; readonly message: string; readonly code?: string; readonly status?: number }
  export interface SupabaseClient<Database = unknown> {
    readonly auth: {
      getUser(): Promise<{ data: { user: User | null }; error: AuthError | null }>;
      signInWithPassword(input: { email: string; password: string }): Promise<{ data: { user: User | null; session: Session | null }; error: AuthError | null }>;
      signUp(input: { email: string; password: string; options?: { data?: Readonly<Record<string, unknown>> } }): Promise<{ data: { user: User | null; session: Session | null }; error: AuthError | null }>;
      resetPasswordForEmail(email: string, options?: { redirectTo?: string }): Promise<{ error: AuthError | null }>;
      updateUser(attributes: { password: string }): Promise<{ error: AuthError | null }>;
      signOut(): Promise<{ error: AuthError | null }>;
      onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void): { data: { subscription: Subscription } };
    };
    rpc(name: 'bootstrap_personal_workspace', args: { p_display_name: string; p_workspace_name?: string }): Promise<{ data: string | null; error: AuthError | null }>;
  }
  export function createClient<Database = unknown>(url: string, key: string, options?: Readonly<Record<string, unknown>>): SupabaseClient<Database>;
}
