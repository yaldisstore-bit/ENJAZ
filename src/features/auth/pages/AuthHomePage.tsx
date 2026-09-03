import { useState } from 'react';
import { toAppError } from '../../../core/errors/AppError.ts';
import { useAuth } from '../state/AuthContext.tsx';

export function AuthHomePage() {
  const { user, service } = useAuth();
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    <main className="foundation-page" id="main-content">
      <section className="foundation-card">
        <p className="foundation-eyebrow">ENJAZ · Phase 1.3</p>
        <h1>الجلسة موثقة</h1>
        <p>تم اجتياز حارس المصادقة. هذه شاشة مؤقتة حتى تبدأ مرحلة الواجهة الفعلية.</p>
        <p><strong>معرّف المستخدم:</strong> <span dir="ltr">{user?.id}</span></p>
        {errorMessage ? <p role="alert">{errorMessage}</p> : null}
        <button type="button" onClick={signOut} disabled={busy}>{busy ? 'جارٍ الخروج…' : 'تسجيل الخروج'}</button>
      </section>
    </main>
  );
}
