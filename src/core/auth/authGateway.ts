export interface EnjazAuthUser {
  readonly id: string;
  readonly email?: string;
}

export interface EnjazAuthSession {
  readonly user: EnjazAuthUser;
}

export type EnjazAuthEvent = string;

export interface AuthFailureLike {
  readonly name?: string;
  readonly message?: string;
  readonly code?: string;
  readonly status?: number;
}

export interface AuthSubscription {
  unsubscribe(): void;
}

export interface AuthGatewayResult<T> {
  readonly data: T;
  readonly error: AuthFailureLike | null;
}

export interface AuthGateway {
  getUser(): Promise<AuthGatewayResult<{ readonly user: EnjazAuthUser | null }>>;
  signInWithPassword(input: Readonly<{ email: string; password: string }>): Promise<AuthGatewayResult<{ readonly user: EnjazAuthUser | null; readonly session: EnjazAuthSession | null }>>;
  signUp(input: Readonly<{ email: string; password: string; displayName: string }>): Promise<AuthGatewayResult<{ readonly user: EnjazAuthUser | null; readonly session: EnjazAuthSession | null }>>;
  requestPasswordReset(email: string, redirectTo: string): Promise<AuthFailureLike | null>;
  updatePassword(password: string): Promise<AuthFailureLike | null>;
  signOut(): Promise<AuthFailureLike | null>;
  bootstrapWorkspace(displayName: string, workspaceName?: string): Promise<AuthGatewayResult<string | null>>;
  onAuthStateChange(callback: (event: EnjazAuthEvent, session: EnjazAuthSession | null) => void): AuthSubscription;
}
