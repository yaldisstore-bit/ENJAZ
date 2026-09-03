import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { toAppError } from '../../../core/errors/AppError.ts';
import { ROUTES } from '../../../core/routing/routes.ts';
import { useAuth } from '../state/AuthContext.tsx';
import { AuthShell } from '../ui/AuthShell.tsx';

export function UpdatePasswordPage() {
  const { service } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      await service.updatePassword(password);
      navigate(ROUTES.appHome, { replace: true });
    } catch (error) {
      setErrorMessage(toAppError(error).userMessage);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="كلمة مرور جديدة" subtitle="اختر كلمة مرور جديدة لهذا الحساب.">
      <form className="auth-form" onSubmit={submit} noValidate>
        <label>كلمة المرور الجديدة<input type="password" autoComplete="new-password" minLength={10} value={password} onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.currentTarget.value)} required /></label>
        {errorMessage ? <p className="auth-error" role="alert">{errorMessage}</p> : null}
        <button type="submit" disabled={busy}>{busy ? 'جارٍ الحفظ…' : 'حفظ كلمة المرور'}</button>
      </form>
    </AuthShell>
  );
}
