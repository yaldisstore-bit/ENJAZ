import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ROUTES } from '../../../core/routing/routes.ts';

export function AuthShell(props: { readonly title: string; readonly subtitle: string; readonly children?: ReactNode }) {
  return (
    <main className="auth-page" id="main-content">
      <section className="auth-card" aria-labelledby="auth-title">
        <p className="auth-brand">إنجاز</p>
        <h1 id="auth-title">{props.title}</h1>
        <p className="auth-subtitle">{props.subtitle}</p>
        {props.children}
        <Link className="auth-foundation-link" to={ROUTES.foundation}>حالة الأساس الهندسي</Link>
      </section>
    </main>
  );
}
