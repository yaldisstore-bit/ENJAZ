import './session-checking.css';

export function SessionChecking() {
  return (
    <main className="enjaz-session-checking" id="main-content" aria-busy="true">
      <span className="enjaz-session-checking__spinner" aria-hidden="true" />
      <p role="status">جارٍ التحقق من الجلسة…</p>
    </main>
  );
}
