import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { toAppError } from '../../../core/errors/AppError.ts';
import { ROUTES } from '../../../core/routing/routes.ts';
import { useAuth } from '../state/AuthContext.tsx';
import { AuthShell } from '../ui/AuthShell.tsx';

export function SignUpPage() {
  const { service } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setErrorMessage(null);
    setMessage(null);
    try {
      const result = await service.signUp({ displayName, email, password });
      if (result.confirmationRequired) {
        setMessage('تم إنشاء الحساب. تحقق من بريدك الإلكتروني ثم سجّل الدخول لإكمال تهيئة إنجاز.');
      } else {
        navigate(ROUTES.appHome, { replace: true });
      }
    } catch (error) {
      setErrorMessage(toAppError(error).userMessage);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="إنشاء حساب" subtitle="حساب جديد بقاعدة بيانات معزولة حسب هوية المستخدم.">
      <form className="auth-form" onSubmit={submit} noValidate>
        <label>الاسم<input autoComplete="name" value={displayName} onChange={(event: ChangeEvent<HTMLInputElement>) => setDisplayName(event.currentTarget.value)} required /></label>
        <label>البريد الإلكتروني<input type="email" autoComplete="email" inputMode="email" value={email} onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.currentTarget.value)} required /></label>
        <label>كلمة المرور<input type="password" autoComplete="new-password" minLength={10} value={password} onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.currentTarget.value)} required /></label>
        <small>10 أحرف على الأقل. لا تُحفظ كلمة المرور داخل كود التطبيق.</small>
        {message ? <p className="auth-success" role="status">{message}</p> : null}
        {errorMessage ? <p className="auth-error" role="alert">{errorMessage}</p> : null}
        <button type="submit" disabled={busy}>{busy ? 'جارٍ الإنشاء…' : 'إنشاء الحساب'}</button>
      </form>
      <div className="auth-links"><Link to={ROUTES.login}>لدي حساب بالفعل</Link></div>
    </AuthShell>
  );
}
