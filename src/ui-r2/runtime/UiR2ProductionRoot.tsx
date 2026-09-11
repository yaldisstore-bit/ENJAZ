import { useMemo, useState } from 'react';
import type { AuthGateway } from '../../core/auth/authGateway.ts';
import { createSupabaseAuthGateway } from '../../core/auth/SupabaseAuthGateway.ts';
import { createRuntimeConfig } from '../../core/config/env.ts';
import { createEnjazSupabaseClient } from '../../core/supabase/client.ts';
import { createEnjazDataLayerFactory, type EnjazDataLayerFactory } from '../../data/createDataLayer.ts';
import { DataLayerProvider } from '../../data/react/DataLayerContext.tsx';
import { AutomationCommandProvider } from '../../features/automation/AutomationCommandContext.tsx';
import { createAutomationCommandGateway, type AutomationCommandGateway } from '../../features/automation/automationCommands.ts';
import { AuthProvider, useAuth } from '../../features/auth/state/AuthContext.tsx';
import { FieldOperationsCommandProvider } from '../../features/field-operations/FieldOperationsCommandContext.tsx';
import { createFieldOperationsCommandGateway, type FieldOperationsCommandGateway } from '../../features/field-operations/fieldOperationsCommands.ts';
import { FinanceCommandProvider } from '../../features/finance/FinanceCommandContext.tsx';
import { createSupabaseFinanceCommandGateway, type FinanceCommandGateway } from '../../features/finance/financeCommands.ts';
import { GovernanceCommandProvider } from '../../features/governance/GovernanceCommandContext.tsx';
import { createGovernanceCommandGateway, type GovernanceCommandGateway } from '../../features/governance/governanceCommands.ts';
import { createSearchIntelligenceGateway, type SearchIntelligenceGateway } from '../../features/searchIntelligence/searchIntelligenceCommands.ts';
import { GovernmentProcedureCommandProvider } from '../../features/workflow/GovernmentProcedureCommandContext.tsx';
import { createGovernmentProcedureRuntimeGateway, type GovernmentProcedureRuntimeGateway } from '../../features/workflow/governmentProcedureRuntime.ts';
import { CurrentUserIdProvider } from '../../shared/session/CurrentUserIdContext.tsx';
import { SessionChecking } from '../../shared/session/SessionChecking.tsx';
import { R2AuthScreen } from '../auth/R2AuthScreen.tsx';
import { R2PasswordUpdateScreen } from '../auth/R2PasswordUpdateScreen.tsx';
import { LazyLiveProductionPortals } from './LazyLiveProductionPortals.tsx';
import { UiR2LiveRoot } from './UiR2LiveRoot.tsx';
import './shell-base.css';
import './shell.css';
import '../golden/golden.css';
import '../golden/golden-journey.css';
import '../golden/golden-mobile-hardening.css';
import '../core-work/core-work.css';
import '../records/records.css';
import '../operational-intelligence/operational-intelligence.css';
import '../automation/automation.css';
import '../field-operations/field-operations.css';
import '../command/command-center.css';
import '../home/home-connected.css';
import '../auth/auth.css';
import '../workflow/workflow.css';
import '../search-intelligence/search-intelligence.css';
import './accessibility-hardening.css';

export type UiR2ProductionResources = Readonly<{
  authGateway: AuthGateway;
  dataFactory: EnjazDataLayerFactory;
  financeCommands: FinanceCommandGateway;
  governanceCommands: GovernanceCommandGateway;
  workflowCommands: GovernmentProcedureRuntimeGateway;
  automationCommands: AutomationCommandGateway;
  fieldOperationsCommands: FieldOperationsCommandGateway;
  searchIntelligence: SearchIntelligenceGateway;
}>;

function createProductionResources(): UiR2ProductionResources {
  const config = createRuntimeConfig(import.meta.env as unknown as Readonly<Record<string, unknown>>);
  const client = createEnjazSupabaseClient(config);
  return Object.freeze({
    authGateway: createSupabaseAuthGateway(client),
    dataFactory: createEnjazDataLayerFactory(client),
    financeCommands: createSupabaseFinanceCommandGateway(client),
    governanceCommands: createGovernanceCommandGateway(client),
    workflowCommands: createGovernmentProcedureRuntimeGateway(client),
    automationCommands: createAutomationCommandGateway(client),
    fieldOperationsCommands: createFieldOperationsCommandGateway(client),
    searchIntelligence: createSearchIntelligenceGateway(client),
  });
}

function RuntimeFailure({ message }: Readonly<{ message: string }>) {
  return <main className="r2-auth" data-r2-runtime-error="true"><section className="r2-auth__panel"><header><p className="r2-eyebrow">تشغيل إنجاز</p><h1>تعذر تشغيل مساحة العمل</h1><p>{message}</p></header></section></main>;
}

function leaveRecoveryMode() {
  const url = new URL(window.location.href);
  url.searchParams.delete('auth');
  window.location.replace(url.toString());
}

function AuthenticatedR2Runtime({ dataFactory, financeCommands, governanceCommands, workflowCommands, automationCommands, fieldOperationsCommands, searchIntelligence }: Readonly<{
  dataFactory: EnjazDataLayerFactory;
  financeCommands: FinanceCommandGateway;
  governanceCommands: GovernanceCommandGateway;
  workflowCommands: GovernmentProcedureRuntimeGateway;
  automationCommands: AutomationCommandGateway;
  fieldOperationsCommands: FieldOperationsCommandGateway;
  searchIntelligence: SearchIntelligenceGateway;
}>) {
  const auth = useAuth();
  const workspace = useMemo(() => auth.user ? dataFactory.resolveWorkspaceId(auth.user.id) : Promise.resolve(null), [auth.user?.id, dataFactory]);
  if (auth.status === 'checking') return <SessionChecking />;
  if (auth.status === 'anonymous' || !auth.user) return <R2AuthScreen service={auth.service} />;
  const recoveryMode = new URLSearchParams(window.location.search).get('auth') === 'update-password';
  if (recoveryMode) return <R2PasswordUpdateScreen service={auth.service} onDone={leaveRecoveryMode} />;
  const signOut = async () => { await auth.service.signOut(); };

  return <DataLayerProvider factory={dataFactory}><FinanceCommandProvider gateway={financeCommands}><GovernanceCommandProvider gateway={governanceCommands}><GovernmentProcedureCommandProvider gateway={workflowCommands}><AutomationCommandProvider gateway={automationCommands}><FieldOperationsCommandProvider gateway={fieldOperationsCommands}><CurrentUserIdProvider userId={auth.user.id}>
    <UiR2LiveRoot accountLabel={auth.user.email ?? 'حساب إنجاز'} onSignOut={signOut} searchIntelligence={searchIntelligence} searchWorkspace={workspace} searchUserId={auth.user.id} />
    <LazyLiveProductionPortals />
  </CurrentUserIdProvider></FieldOperationsCommandProvider></AutomationCommandProvider></GovernmentProcedureCommandProvider></GovernanceCommandProvider></FinanceCommandProvider></DataLayerProvider>;
}

export function UiR2ProductionRoot({ resources }: Readonly<{ resources?: UiR2ProductionResources | undefined }> = {}) {
  const [runtime] = useState<Readonly<{ resources: UiR2ProductionResources | null; error: string | null }>>(() => {
    if (resources) return Object.freeze({ resources, error: null });
    try { return Object.freeze({ resources: createProductionResources(), error: null }); }
    catch { return Object.freeze({ resources: null, error: 'إعدادات الاتصال بإنجاز غير مكتملة. لم يتم تشغيل قناة بيانات بديلة أو وضع وهمي.' }); }
  });
  if (!runtime.resources) return <RuntimeFailure message={runtime.error ?? 'إعدادات التشغيل غير صالحة.'} />;
  return <AuthProvider gateway={runtime.resources.authGateway}><AuthenticatedR2Runtime
    dataFactory={runtime.resources.dataFactory}
    financeCommands={runtime.resources.financeCommands}
    governanceCommands={runtime.resources.governanceCommands}
    workflowCommands={runtime.resources.workflowCommands}
    automationCommands={runtime.resources.automationCommands}
    fieldOperationsCommands={runtime.resources.fieldOperationsCommands}
    searchIntelligence={runtime.resources.searchIntelligence}
  /></AuthProvider>;
}
