import { useEffect, useState } from 'react';
import { Outlet } from 'react-router';
import { toAppError } from '../core/errors/AppError.ts';
import { useAuth } from '../features/auth/state/AuthContext.tsx';
import { AppShellFrame } from '../shared/shell/AppShellFrame.tsx';
import { resolveShellNetworkState, type ShellNetworkState } from '../shared/shell/shellContract.ts';

export function AppShell() {
  const { user, service } = useAuth();
  const initialNetworkState = resolveShellNetworkState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  const [networkState, setNetworkState] = useState<ShellNetworkState>(initialNetworkState);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => setNetworkState('online');
    const handleOffline = () => setNetworkState('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const signOut = async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      await service.signOut();
    } catch (error) {
      setErrorMessage(toAppError(error).userMessage);
      setBusy(false);
    }
  };

  return (
    <AppShellFrame
      userLabel={user?.email ?? user?.id ?? 'حساب إنجاز'}
      networkState={networkState}
      busy={busy}
      errorMessage={errorMessage}
      onSignOut={signOut}
    >
      <Outlet />
    </AppShellFrame>
  );
}
