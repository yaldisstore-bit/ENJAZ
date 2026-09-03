import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router';
import { toAppError } from '../../../core/errors/AppError.ts';
import { ROUTES } from '../../../core/routing/routes.ts';
import { useAuth } from '../state/AuthContext.tsx';
import { AuthShell } from '../ui/AuthShell.tsx';

export function ForgotPasswordPage() {
  const { service } = useAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      const redirectTo = new URL(ROUTES.updatePassword, globalThis.location.origin).toString();
      await service.requestPasswordReset(email, redirectTo);
      setMessage('إذا كان البريد مسجلاً فستصلك رسالة استعادة.');
    } catch (error) {
      setErrorMessage(toAppError(error).userMessage);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="استعادة كلمة المرور" subtitle="سنرسل رابطاً آمناً لإعادة تعيين كلمة المرور.">
      <form className="auth-form" onSubmit={submit} noValidate>
        <label>البريد الإلكتروني<input type="email" autoComplete="email" inputMode="email" value={email} onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.currentTarget.value)} required /></label>
        {message ? <p className="auth-success" role="status">{message}</p> : null}
        {errorMessage ? <p className="auth-error" role="alert">{errorMessage}</p> : null}
        <button type="submit" disabled={busy}>{busy ? 'جارٍ الإرسال…' : 'إرسال رابط الاستعادة'}</button>
      </form>
      <div className="auth-links"><Link to={ROUTES.login}>العودة لتسجيل الدخول</Link></div>
    </AuthShell>
  );
}
