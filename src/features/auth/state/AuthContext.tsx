import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthGateway, EnjazAuthUser } from '../../../core/auth/authGateway.ts';
import { createAuthService, type AuthService } from '../services/authService.ts';

export type AuthStatus = 'checking' | 'authenticated' | 'anonymous';

export interface AuthContextValue {
  readonly status: AuthStatus;
  readonly user: EnjazAuthUser | null;
  readonly service: AuthService;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider(props: { readonly gateway: AuthGateway; readonly children?: ReactNode }) {
  const service = useMemo(() => createAuthService(props.gateway), [props.gateway]);
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [user, setUser] = useState<EnjazAuthUser | null>(null);

  useEffect(() => {
    let active = true;
    void service.getVerifiedUser().then((verifiedUser) => {
      if (!active) return;
      setUser(verifiedUser);
      setStatus(verifiedUser ? 'authenticated' : 'anonymous');
    }).catch(() => {
      if (!active) return;
      setUser(null);
      setStatus('anonymous');
    });

    const subscription = service.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setStatus(session?.user ? 'authenticated' : 'anonymous');
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [service]);

  const value = useMemo<AuthContextValue>(() => Object.freeze({ status, user, service }), [service, status, user]);
  return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider is missing');
  return value;
}
