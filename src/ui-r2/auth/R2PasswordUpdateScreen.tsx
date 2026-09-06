import { useState, type FormEvent } from 'react';
import type { AuthService } from '../../features/auth/services/authService.ts';

export function R2PasswordUpdateScreen({ service, onDone }: Readonly<{ service: AuthService; onDone(): void }>) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    if (password !== confirm) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await service.updatePassword(password);
      setDone(true);
    } catch (reason: unknown) {
      const candidate = reason as Readonly<{ userMessage?: unknown; message?: unknown }>;
      setError(typeof candidate.userMessage === 'string'
        ? candidate.userMessage
        : typeof candidate.message === 'string'
          ? candidate.message
          : 'تعذر تحديث كلمة المرور.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="r2-auth" data-r2-password-update="true">
      <section className="r2-auth__identity" aria-label="إنجاز">
        <span className="r2-auth__mark">إ</span>
        <p className="r2-eyebrow">استعادة الحساب</p>
        <h1>إنجاز</h1>
        <p>أنهِ الاستعادة داخل جلسة Supabase الموثوقة ثم عد إلى مساحة العمل.</p>
      </section>
      <section className="r2-auth__panel">
        <header><p className="r2-eyebrow">جلسة استعادة محمية</p><h2>تعيين كلمة مرور جديدة</h2><p>لا يتم تغيير كلمة المرور إلا عبر AuthService الحالي.</p></header>
        {error ? <div className="r2-auth__notice" role="alert"><strong>تعذر التحديث</strong><p>{error}</p></div> : null}
        {done ? <div className="r2-auth__notice" role="status"><strong>تم تحديث كلمة المرور</strong><p>يمكنك العودة الآن إلى مساحة العمل.</p></div> : null}
        {!done ? (
          <form className="r2-auth__form" onSubmit={(event) => { void submit(event); }}>
            <label><span>كلمة المرور الجديدة</span><input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.currentTarget.value)} required /></label>
            <label><span>تأكيد كلمة المرور</span><input type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.currentTarget.value)} required /></label>
            <button type="submit" className="r2-auth__submit" disabled={busy}>{busy ? 'جارٍ التحديث…' : 'تحديث كلمة المرور'}</button>
          </form>
        ) : <button type="button" className="r2-auth__submit" onClick={onDone}>العودة إلى إنجاز</button>}
      </section>
    </main>
  );
}
