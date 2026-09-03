import { Navigate, Outlet } from 'react-router';
import { ROUTES } from '../../../core/routing/routes.ts';
import { useAuth } from '../state/AuthContext.tsx';

function CheckingSession() {
  return <main className="auth-page" id="main-content"><p role="status">جارٍ التحقق من الجلسة…</p></main>;
}

export function ProtectedRoute() {
  const { status } = useAuth();
  if (status === 'checking') return <CheckingSession />;
  if (status === 'anonymous') return <Navigate to={ROUTES.login} replace />;
  return <Outlet />;
}

export function AnonymousOnlyRoute() {
  const { status } = useAuth();
  if (status === 'checking') return <CheckingSession />;
  if (status === 'authenticated') return <Navigate to={ROUTES.appHome} replace />;
  return <Outlet />;
}

export function RootRoute() {
  const { status } = useAuth();
  if (status === 'checking') return <CheckingSession />;
  return <Navigate to={status === 'authenticated' ? ROUTES.appHome : ROUTES.login} replace />;
}
