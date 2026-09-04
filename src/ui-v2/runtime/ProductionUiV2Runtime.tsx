import { useState, type FormEvent } from 'react';
import { createSupabaseAuthGateway } from '../../core/auth/SupabaseAuthGateway.ts';
import { createRuntimeConfig } from '../../core/config/env.ts';
import { createEnjazSupabaseClient } from '../../core/supabase/client.ts';
import { createEnjazDataLayerFactory, type EnjazDataLayerFactory } from '../../data/createDataLayer.ts';
import { DataLayerProvider } from '../../data/react/DataLayerContext.tsx';
import type { AuthService } from '../../features/auth/services/authService.ts';
import { AuthProvider, useAuth } from '../../features/auth/state/AuthContext.tsx';
import { CurrentUserIdProvider } from '../../shared/session/CurrentUserIdContext.tsx';
import { EzButton, EzField, EzNotice, EzSegmented } from '../components/primitives.tsx';
import { CoreApp } from './CoreApp.tsx';

type RuntimeResources = Readonly<{
  authGateway: ReturnType<typeof createSupabaseAuthGateway>;
  dataFactory: EnjazDataLayerFactory;
}>;

type AuthMode = 'signin' | 'signup';

function createResources(): RuntimeResources {
  const config = createRuntimeConfig(import.meta.env as unknown as Readonly<Record<string, unknown>>);
  const client = createEnjazSupabaseClient(config);
  return Object.freeze({
    authGateway: createSupabaseAuthGateway(client),
    dataFactory: createEnjazDataLayerFactory(client),
  });
}

function ProductAuthScreen(props: Readonly<{ service: AuthService }>) {
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
        await props.service.signIn({ email, password });
      } else {
        const result = await props.service.signUp({ email, password, displayName, workspaceName: workspaceName || undefined });
        if (result.confirmationRequired) {
          setMessage('تم إنشاء الحساب. افتح رسالة التأكيد في بريدك ثم سجّل الدخول للمتابعة.');
        }
      }
    } catch (reason: unknown) {
      const candidate = reason as Readonly<{ userMessage?: unknown; message?: unknown }>;
      setError(typeof candidate.userMessage === 'string' ? candidate.userMessage : typeof candidate.message === 'string' ? candidate.message : 'تعذر إكمال عملية الدخول.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="ez-auth-runtime" data-auth-runtime="true">
      <section className="ez-auth-runtime__brand">
        <span>ENJAZ</span>
        <h1>إنجاز</h1>
        <p>مساحة عمل واحدة للمعاملات والشركات والمتابعات والقرار اليومي.</p>
        <div><strong>UI/UX 2.0</strong><small>واجهة إنجاز الرسمية</small></div>
      </section>
      <section className="ez-auth-runtime__panel">
        <header><span>مرحبًا بك</span><h2>{mode === 'signin' ? 'سجّل الدخول إلى مساحة عملك' : 'أنشئ مساحة إنجاز جديدة'}</h2><p>بياناتك تبقى داخل مساحة العمل المحمية بصلاحيات Supabase.</p></header>
        <EzSegmented value={mode} options={[{ value: 'signin', label: 'تسجيل الدخول' }, { value: 'signup', label: 'حساب جديد' }]} onChange={(value) => { setMode(value as AuthMode); setError(null); setMessage(null); }} />
        {error ? <EzNotice title="تعذر المتابعة" body={error} tone="danger" /> : null}
        {message ? <EzNotice title="تحقق من بريدك" body={message} tone="success" /> : null}
        <form onSubmit={(event) => { void submit(event); }}>
          {mode === 'signup' ? <EzField label="الاسم" autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.currentTarget.value)} placeholder="اسمك داخل إنجاز" required /> : null}
          {mode === 'signup' ? <EzField label="اسم مساحة العمل" value={workspaceName} onChange={(event) => setWorkspaceName(event.currentTarget.value)} placeholder="مثال: مكتب إنجاز" /> : null}
          <EzField label="البريد الإلكتروني" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.currentTarget.value)} placeholder="name@example.com" required />
          <EzField label="كلمة المرور" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.currentTarget.value)} placeholder="••••••••••" required />
          <EzButton type="submit" tone="dark" size="lg" disabled={busy}>{busy ? 'جارٍ التحقق…' : mode === 'signin' ? 'دخول إلى إنجاز' : 'إنشاء الحساب'}</EzButton>
        </form>
      </section>
    </main>
  );
}

function AuthenticatedRuntime(props: Readonly<{ dataFactory: EnjazDataLayerFactory }>) {
  const auth = useAuth();
  if (auth.status === 'checking') {
    return <main className="ez-auth-runtime ez-auth-runtime--loading"><section><span>إنجاز</span><strong>جاري التحقق من الجلسة…</strong></section></main>;
  }
  if (auth.status === 'anonymous' || !auth.user) return <ProductAuthScreen service={auth.service} />;
  return (
    <DataLayerProvider factory={props.dataFactory}>
      <CurrentUserIdProvider userId={auth.user.id}>
        <CoreApp dailyWorkMode="live" />
      </CurrentUserIdProvider>
    </DataLayerProvider>
  );
}

export function ProductionUiV2Runtime() {
  const [runtime] = useState<Readonly<{ resources: RuntimeResources | null; error: string | null }>>(() => {
    try {
      return Object.freeze({ resources: createResources(), error: null });
    } catch {
      return Object.freeze({ resources: null, error: 'إعدادات الاتصال بإنجاز غير مكتملة. لم يتم تشغيل وضع البيانات الحية.' });
    }
  });

  if (!runtime.resources) {
    return <main className="ez-auth-runtime ez-auth-runtime--loading"><EzNotice title="تعذر تشغيل إنجاز" body={runtime.error ?? 'إعدادات التشغيل غير صالحة.'} tone="danger" /></main>;
  }

  return (
    <AuthProvider gateway={runtime.resources.authGateway}>
      <AuthenticatedRuntime dataFactory={runtime.resources.dataFactory} />
    </AuthProvider>
  );
}
