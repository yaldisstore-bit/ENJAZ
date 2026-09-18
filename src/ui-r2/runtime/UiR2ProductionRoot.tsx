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
import type { DocumentFactoryGateway } from '../../features/documents/documentFactoryCommands.ts';
import type { DocumentIntelligenceGateway } from '../../features/documents/documentIntelligenceCommands.ts';
import type { DocumentVaultGateway } from '../../features/documents/documentVaultCommands.ts';
import type { EngagementContractGateway } from '../../features/engagements/engagementContractCommands.ts';
import { FieldOperationsCommandProvider } from '../../features/field-operations/FieldOperationsCommandContext.tsx';
import { createFieldOperationsCommandGateway, type FieldOperationsCommandGateway } from '../../features/field-operations/fieldOperationsCommands.ts';
import { FinanceCommandProvider } from '../../features/finance/FinanceCommandContext.tsx';
import { createSupabaseFinanceCommandGateway, type FinanceCommandGateway } from '../../features/finance/financeCommands.ts';
import { GovernanceCommandProvider } from '../../features/governance/GovernanceCommandContext.tsx';
import { createGovernanceCommandGateway, type GovernanceCommandGateway } from '../../features/governance/governanceCommands.ts';
import { NotificationCommandProvider } from '../../features/notifications/NotificationCommandContext.tsx';
import { createNotificationCommandGateway, type NotificationCommandGateway } from '../../features/notifications/notificationCommands.ts';
import { ProcessRuntimeProvider, type ProcessRuntimeFactory } from '../../features/process-intelligence/ProcessMiningHistoryContext.tsx';
import { createRegulatoryKnowledgeGateway, type RegulatoryKnowledgeGateway } from '../../features/regulatory/regulatoryKnowledgeCommands.ts';
import { SchedulingCommandProvider } from '../../features/scheduling/SchedulingCommandContext.tsx';
import { createSchedulingCommandGateway, type SchedulingCommandGateway } from '../../features/scheduling/schedulingCommands.ts';
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

export type DocumentVaultFactory = () => Promise<DocumentVaultGateway>;
export type DocumentIntelligenceFactory = () => Promise<DocumentIntelligenceGateway>;
export type DocumentFactoryFactory = () => Promise<DocumentFactoryGateway>;
export type EngagementContractFactory = () => Promise<EngagementContractGateway>;

type VaultResource =
  | { documentVaultFactory:DocumentVaultFactory; documentVault?: never }
  | { documentVault:DocumentVaultGateway; documentVaultFactory?:never };

type BaseResources = {
  authGateway: AuthGateway;
  dataFactory: EnjazDataLayerFactory;
  financeCommands: FinanceCommandGateway;
  governanceCommands: GovernanceCommandGateway;
  workflowCommands: GovernmentProcedureRuntimeGateway;
  automationCommands: AutomationCommandGateway;
  fieldOperationsCommands: FieldOperationsCommandGateway;
  notificationCommands: NotificationCommandGateway;
  schedulingCommands: SchedulingCommandGateway;
  searchIntelligence: SearchIntelligenceGateway;
  regulatoryKnowledge: RegulatoryKnowledgeGateway;
  copilotInvoke: (body: Readonly<Record<string, unknown>>) => Promise<Response>;
  documentIntelligenceFactory?: DocumentIntelligenceFactory;
  documentFactoryFactory?: DocumentFactoryFactory;
  engagementContractFactory?: EngagementContractFactory;
  processRuntime?: ProcessRuntimeFactory;
};

export type UiR2ProductionResources = Readonly<BaseResources & VaultResource>;

function createProductionResources(): UiR2ProductionResources {
  const config = createRuntimeConfig(import.meta.env as unknown as Readonly<Record<string, unknown>>);
  const client = createEnjazSupabaseClient(config);
  const dataFactory=createEnjazDataLayerFactory(client);
  const processRuntime: ProcessRuntimeFactory = () => import('../../features/process-intelligence/processMiningRuntime.ts')
    .then(module=>module.createProcessRuntimeGateway(client,dataFactory));
  let vault: Promise<DocumentVaultGateway> | undefined;
  const documentVaultFactory:DocumentVaultFactory = () => vault ??= import('../../features/documents/documentVaultCommands.ts')
    .then((module) => module.createDocumentVaultGateway(client, config.supabaseUrl, config.supabasePublishableKey));
  let intelligence: Promise<DocumentIntelligenceGateway> | undefined;
  const documentIntelligenceFactory:DocumentIntelligenceFactory = () => intelligence ??= import('../../features/documents/documentIntelligenceCommands.ts')
    .then((module) => module.createDocumentIntelligenceGateway(client, config.supabaseUrl, config.supabasePublishableKey));
  let documentFactory: Promise<DocumentFactoryGateway> | undefined;
  const documentFactoryFactory:DocumentFactoryFactory = () => documentFactory ??= import('../../features/documents/documentFactoryCommands.ts')
    .then((module) => module.createDocumentFactoryGateway(client, config.supabaseUrl, config.supabasePublishableKey));
  let engagementContract: Promise<EngagementContractGateway> | undefined;
  const engagementContractFactory:EngagementContractFactory = () => engagementContract ??= import('../../features/engagements/engagementContractCommands.ts')
    .then((module) => module.createEngagementContractGateway(client));

  return Object.freeze({
    authGateway: createSupabaseAuthGateway(client),
    dataFactory,
    financeCommands: createSupabaseFinanceCommandGateway(client),
    governanceCommands: createGovernanceCommandGateway(client),
    workflowCommands: createGovernmentProcedureRuntimeGateway(client),
    automationCommands: createAutomationCommandGateway(client),
    fieldOperationsCommands: createFieldOperationsCommandGateway(client),
    notificationCommands: createNotificationCommandGateway(client),
    schedulingCommands: createSchedulingCommandGateway(client),
    searchIntelligence: createSearchIntelligenceGateway(client),
    regulatoryKnowledge: createRegulatoryKnowledgeGateway(client),
    copilotInvoke:body=>client.edge('enjaz-copilot-context',{method:'POST',body:JSON.stringify(body)}),
    documentVaultFactory,
    documentIntelligenceFactory,
    documentFactoryFactory,
    engagementContractFactory,
    processRuntime,
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

type RuntimeProps = Omit<BaseResources, 'authGateway' | 'processRuntime' | 'documentIntelligenceFactory' | 'documentFactoryFactory' | 'engagementContractFactory'> & {
  documentVaultFactory: DocumentVaultFactory;
  documentIntelligenceFactory: DocumentIntelligenceFactory | undefined;
  documentFactoryFactory: DocumentFactoryFactory | undefined;
  engagementContractFactory: EngagementContractFactory | undefined;
  processRuntime: ProcessRuntimeFactory | undefined;
};

function AuthenticatedR2Runtime({
  dataFactory,
  financeCommands,
  governanceCommands,
  workflowCommands,
  automationCommands,
  fieldOperationsCommands,
  notificationCommands,
  schedulingCommands,
  searchIntelligence,
  regulatoryKnowledge,
  copilotInvoke,
  documentVaultFactory,
  documentIntelligenceFactory,
  documentFactoryFactory,
  engagementContractFactory,
  processRuntime,
}: RuntimeProps) {
  const auth = useAuth();
  const workspace = useMemo(() => auth.user ? dataFactory.resolveWorkspaceId(auth.user.id) : Promise.resolve(null), [auth.user?.id, dataFactory]);
  if (auth.status === 'checking') return <SessionChecking />;
  if (auth.status === 'anonymous' || !auth.user) return <R2AuthScreen service={auth.service} />;
  const recoveryMode = new URLSearchParams(window.location.search).get('auth') === 'update-password';
  if (recoveryMode) return <R2PasswordUpdateScreen service={auth.service} onDone={leaveRecoveryMode} />;
  const signOut=()=>auth.service.signOut();

  return <DataLayerProvider factory={dataFactory}><FinanceCommandProvider gateway={financeCommands}><GovernanceCommandProvider gateway={governanceCommands}><GovernmentProcedureCommandProvider gateway={workflowCommands}><AutomationCommandProvider gateway={automationCommands}><FieldOperationsCommandProvider gateway={fieldOperationsCommands}><NotificationCommandProvider gateway={notificationCommands}><SchedulingCommandProvider gateway={schedulingCommands}><CurrentUserIdProvider userId={auth.user.id}><ProcessRuntimeProvider factory={processRuntime??null}>
    <UiR2LiveRoot accountLabel={auth.user.email ?? 'حساب إنجاز'} onSignOut={signOut} searchIntelligence={searchIntelligence} searchWorkspace={workspace} searchUserId={auth.user.id} />
    <LazyLiveProductionPortals regulatoryKnowledge={regulatoryKnowledge} regulatoryWorkspace={workspace} copilotInvoke={copilotInvoke} documentVaultFactory={documentVaultFactory} documentIntelligenceFactory={documentIntelligenceFactory} documentFactoryFactory={documentFactoryFactory} engagementContractFactory={engagementContractFactory} documentWorkspace={workspace} />
  </ProcessRuntimeProvider></CurrentUserIdProvider></SchedulingCommandProvider></NotificationCommandProvider></FieldOperationsCommandProvider></AutomationCommandProvider></GovernmentProcedureCommandProvider></GovernanceCommandProvider></FinanceCommandProvider></DataLayerProvider>;
}

export function UiR2ProductionRoot({ resources }: Readonly<{ resources?: UiR2ProductionResources | undefined }> = {}) {
  const [runtime] = useState<Readonly<{ resources: UiR2ProductionResources | null; error: string | null }>>(() => {
    if (resources) return Object.freeze({ resources, error: null });
    try { return Object.freeze({ resources: createProductionResources(), error: null }); }
    catch { return Object.freeze({ resources: null, error: 'إعدادات الاتصال بإنجاز غير مكتملة. لم يتم تشغيل قناة بيانات بديلة أو وضع وهمي.' }); }
  });

  if (!runtime.resources) return <RuntimeFailure message={runtime.error ?? 'إعدادات التشغيل غير صالحة.'} />;
  const documentVaultFactory = runtime.resources.documentVaultFactory ?? (() => Promise.resolve(runtime.resources!.documentVault!));

  return <AuthProvider gateway={runtime.resources.authGateway}><AuthenticatedR2Runtime
    dataFactory={runtime.resources.dataFactory}
    financeCommands={runtime.resources.financeCommands}
    governanceCommands={runtime.resources.governanceCommands}
    workflowCommands={runtime.resources.workflowCommands}
    automationCommands={runtime.resources.automationCommands}
    fieldOperationsCommands={runtime.resources.fieldOperationsCommands}
    notificationCommands={runtime.resources.notificationCommands}
    schedulingCommands={runtime.resources.schedulingCommands}
    searchIntelligence={runtime.resources.searchIntelligence}
    regulatoryKnowledge={runtime.resources.regulatoryKnowledge}
    copilotInvoke={runtime.resources.copilotInvoke}
    documentVaultFactory={documentVaultFactory}
    documentIntelligenceFactory={runtime.resources.documentIntelligenceFactory}
    documentFactoryFactory={runtime.resources.documentFactoryFactory}
    engagementContractFactory={runtime.resources.engagementContractFactory}
    processRuntime={runtime.resources.processRuntime}
  /></AuthProvider>;
}
