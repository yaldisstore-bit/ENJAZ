import { Navigate, Outlet } from 'react-router';
import { ROUTES } from '../../../core/routing/routes.ts';
import { SessionChecking } from '../../../shared/session/SessionChecking.tsx';
import { useAuth } from '../state/AuthContext.tsx';

export function ProtectedRoute() {
  const { status } = useAuth();
  if (status === 'checking') return <SessionChecking />;
  if (status === 'anonymous') return <Navigate to={ROUTES.login} replace />;
  return <Outlet />;
}

export function AnonymousOnlyRoute() {
  const { status } = useAuth();
  if (status === 'checking') return <SessionChecking />;
  if (status === 'authenticated') return <Navigate to={ROUTES.appHome} replace />;
  return <Outlet />;
}

export function RootRoute() {
  const { status } = useAuth();
  if (status === 'checking') return <SessionChecking />;
  return <Navigate to={status === 'authenticated' ? ROUTES.appHome : ROUTES.login} replace />;
}
