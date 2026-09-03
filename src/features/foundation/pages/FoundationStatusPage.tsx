import { Link } from 'react-router';
import { ROUTES } from '../../../core/routing/routes';
import { APP_VERSION, FOUNDATION_SCHEMA_VERSION } from '../../../core/version/version';

const checks = [
  'React + TypeScript application shell',
  'Central route registry',
  'Strict runtime configuration validation',
  'Typed application errors',
  'Deep redacting logger',
  'Boot state machine + double-boot protection',
  'Unhandled error/rejection reporting',
  'Global React error boundary',
  'Architecture boundary audit',
  'RTL + safe-area + focus baseline',
  'No legacy runtime code',
  'ENJAZ Visual Identity 2.1',
  'Strict Design Token Contract 2.2',
] as const;

export function FoundationStatusPage() {
  return (
    <main className="foundation-page" id="main-content">
      <section className="foundation-card" aria-labelledby="status-title">
        <p className="foundation-eyebrow">Foundation Status</p>
        <h1 id="status-title">أساس إنجاز</h1>
        <ul>
          {checks.map((check) => <li key={check}>{check}</li>)}
        </ul>
        <dl className="foundation-meta">
          <div><dt>App</dt><dd>{APP_VERSION}</dd></div>
          <div><dt>Foundation schema</dt><dd>{FOUNDATION_SCHEMA_VERSION}</dd></div>
        </dl>
        <Link className="foundation-link" to={ROUTES.identity}>فتح مختبر الهوية 2.1</Link>
        <br />
        <Link className="foundation-link" to={ROUTES.tokens}>فتح مختبر Design Tokens 2.2</Link>
        <br />
        <Link className="foundation-link" to={ROUTES.root}>العودة</Link>
      </section>
    </main>
  );
}
