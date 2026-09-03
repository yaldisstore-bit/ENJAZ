import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { toAppError } from '../../../core/errors/AppError.ts';
import { ROUTES } from '../../../core/routing/routes.ts';
import { useAuth } from '../state/AuthContext.tsx';
import { AuthShell } from '../ui/AuthShell.tsx';

export function LoginPage() {
  const { service } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      await service.signIn({ email, password });
      navigate(ROUTES.appHome, { replace: true });
    } catch (error) {
      setErrorMessage(toAppError(error).userMessage);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="تسجيل الدخول" subtitle="دخول آمن إلى مساحة إنجاز الخاصة بك.">
      <form className="auth-form" onSubmit={submit} noValidate>
        <label>البريد الإلكتروني<input type="email" autoComplete="email" inputMode="email" value={email} onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.currentTarget.value)} required /></label>
        <label>كلمة المرور<input type="password" autoComplete="current-password" value={password} onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.currentTarget.value)} required /></label>
        {errorMessage ? <p className="auth-error" role="alert">{errorMessage}</p> : null}
        <button type="submit" disabled={busy}>{busy ? 'جارٍ التحقق…' : 'دخول'}</button>
      </form>
      <div className="auth-links"><Link to={ROUTES.forgotPassword}>نسيت كلمة المرور؟</Link><Link to={ROUTES.signUp}>إنشاء حساب</Link></div>
    </AuthShell>
  );
}
