import { useState, type FormEvent } from 'react';
import type { AuthService } from '../../features/auth/services/authService.ts';

type AuthMode = 'signin' | 'signup';

export function R2AuthScreen({ service }: Readonly<{ service: AuthService }>) {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === 'signin') {
        await service.signIn({ email, password });
      } else {
        const trimmedWorkspaceName = workspaceName.trim();
        const result = await service.signUp({
          email,
          password,
          displayName,
          ...(trimmedWorkspaceName ? { workspaceName: trimmedWorkspaceName } : {}),
        });
        if (result.confirmationRequired) {
          setMessage('تم إنشاء الحساب. افتح رسالة التأكيد في بريدك ثم سجّل الدخول للمتابعة.');
        }
      }
    } catch (reason: unknown) {
      const candidate = reason as Readonly<{ userMessage?: unknown; message?: unknown }>;
      setError(typeof candidate.userMessage === 'string'
        ? candidate.userMessage
        : typeof candidate.message === 'string'
          ? candidate.message
          : 'تعذر إكمال عملية الدخول.');
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError(null);
    setMessage(null);
  };

  return (
    <main className="r2-auth" data-r2-auth="true">
      <section className="r2-auth__identity" aria-label="إنجاز">
        <span className="r2-auth__mark">إ</span>
        <p className="r2-eyebrow">ENJAZ Workspace</p>
        <h1>إنجاز</h1>
        <p>مساحة عمل واحدة للمعاملات والسجلات والمتابعات والقرار اليومي.</p>
        <div className="r2-auth__identity-note"><strong>Rebirth 2.0</strong><small>نفس البيانات والصلاحيات، بواجهة إنجاز الجديدة.</small></div>
      </section>

      <section className="r2-auth__panel">
        <header><p className="r2-eyebrow">مساحة العمل المحمية</p><h2>{mode === 'signin' ? 'سجّل الدخول إلى إنجاز' : 'أنشئ مساحة إنجاز جديدة'}</h2><p>المصادقة تمر عبر خدمة Auth الحالية وSupabase؛ هذه الواجهة لا تنشئ مسار بيانات بديلًا.</p></header>

        <div className="r2-auth__modes" role="group" aria-label="نوع الدخول">
          <button type="button" aria-pressed={mode === 'signin'} onClick={() => switchMode('signin')}>تسجيل الدخول</button>
          <button type="button" aria-pressed={mode === 'signup'} onClick={() => switchMode('signup')}>حساب جديد</button>
        </div>

        {error ? <div className="r2-auth__notice" role="alert"><strong>تعذر المتابعة</strong><p>{error}</p></div> : null}
        {message ? <div className="r2-auth__notice" role="status"><strong>تحقق من بريدك</strong><p>{message}</p></div> : null}

        <form className="r2-auth__form" onSubmit={(event) => { void submit(event); }}>
          {mode === 'signup' ? <label><span>الاسم</span><input autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.currentTarget.value)} placeholder="اسمك داخل إنجاز" required /></label> : null}
          {mode === 'signup' ? <label><span>اسم مساحة العمل</span><input value={workspaceName} onChange={(event) => setWorkspaceName(event.currentTarget.value)} placeholder="مثال: مكتب إنجاز" /></label> : null}
          <label><span>البريد الإلكتروني</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.currentTarget.value)} placeholder="name@example.com" required /></label>
          <label><span>كلمة المرور</span><input type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.currentTarget.value)} placeholder="••••••••••" required /></label>
          <button type="submit" className="r2-auth__submit" disabled={busy}>{busy ? 'جارٍ التحقق…' : mode === 'signin' ? 'دخول إلى إنجاز' : 'إنشاء الحساب'}</button>
        </form>
      </section>
    </main>
  );
}
