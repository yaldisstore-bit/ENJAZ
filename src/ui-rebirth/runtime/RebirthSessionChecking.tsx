import './session-checking.css';

export function RebirthSessionChecking() {
  return (
    <main className="rebirth-session" id="main-content" data-enjaz-ui="rebirth">
      <div className="rebirth-session__pulse" aria-hidden="true" />
      <p role="status">جارٍ التحقق من الجلسة…</p>
    </main>
  );
}
