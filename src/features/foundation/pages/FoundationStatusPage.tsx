import { Link } from 'react-router';
import { ROUTES } from '../../../core/routing/routes';
import { APP_VERSION, FOUNDATION_SCHEMA_VERSION } from '../../../core/version/version';

const checks = [
  'React + TypeScript application foundation',
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
  'Arabic Typography & RTL System 2.3',
  'Core Component System 2.4',
  'Motion & Interaction System 2.5',
  'Mobile / Android Hardening 2.6',
  'Premium Pattern Library 2.7',
  'Visual Destruction & Quality Gate 2.8',
  'App Shell 3.1',
  'Navigation Architecture 3.2',
  'Global Interaction Surfaces 3.3',
  'Shell Destruction Gate 3.4',
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
        <Link className="foundation-link" to={ROUTES.typography}>فتح مختبر Typography & RTL 2.3</Link>
        <br />
        <Link className="foundation-link" to={ROUTES.components}>فتح مختبر المكونات 2.4</Link>
        <br />
        <Link className="foundation-link" to={ROUTES.motion}>فتح مختبر Motion & Interaction 2.5</Link>
        <br />
        <Link className="foundation-link" to={ROUTES.mobile}>فتح مختبر Mobile / Android 2.6</Link>
        <br />
        <Link className="foundation-link" to={ROUTES.patterns}>فتح Premium Pattern Library 2.7</Link>
        <br />
        <Link className="foundation-link" to={ROUTES.destruction}>فتح Visual Destruction & Quality Gate 2.8</Link>
        <br />
        <Link className="foundation-link" to={ROUTES.shellPreview}>فتح App Shell 3.1</Link>
        <br />
        <Link className="foundation-link" to={ROUTES.navigationPreview}>فتح Navigation Architecture 3.2</Link>
        <br />
        <Link className="foundation-link" to={ROUTES.interactionsPreview}>فتح Global Interaction Surfaces 3.3</Link>
        <br />
        <Link className="foundation-link" to={ROUTES.shellDestructionPreview}>فتح Shell Destruction Gate 3.4</Link>
        <br />
        <Link className="foundation-link" to={ROUTES.root}>العودة</Link>
      </section>
    </main>
  );
}
