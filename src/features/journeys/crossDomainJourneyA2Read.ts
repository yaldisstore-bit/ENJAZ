import type { EnjazDataLayerFactory } from '../../data/createDataLayer.ts';
import type { ClientPortalGateway } from '../client-portal/clientPortalGateway.ts';
import type { FinanceCommandGateway } from '../finance/financeCommands.ts';
import type { CrossDomainOperationsReaders } from './crossDomainJourneyOperationsProof.ts';
import { loadCrossDomainJourneyReadProof } from './crossDomainJourneyReadProof.ts';
import { verifyCrossDomainFinanceRead } from './crossDomainJourneyFinanceProof.ts';
import { verifyCrossDomainOperationsRead } from './crossDomainJourneyOperationsProof.ts';
import { verifyCrossDomainClientPortalRead } from './crossDomainJourneyPortalProof.ts';

// Acceptance harness for internal reviewers only. The portal gateway MUST use
// an independently signed-in client, not the staff/finance session.
// Composing read-only observations does NOT establish an atomic snapshot,
// server-enforced Auth/RLS, a durable write journey, or real browser coverage.
export interface CrossDomainA2ReadObservation {
  readonly workspaceId: string;
  readonly companyId: string;
  readonly transactionId: string;
  readonly observedNetPaymentCents: bigint;
  readonly linkedAssignmentCount: number;
  readonly linkedVisitCount: number;
  readonly linkedEngagementCount: number;
  readonly linkedContractRevisionCount: number;
  readonly clientPrincipalId: string;
  readonly targetTransactionVisible: boolean;
  readonly observedClientDocumentCount: number;
  readonly observedClientReceiptCount: number;
  readonly proofKind: 'A2_COMPOSED_READ_ONLY_SOURCE_OBSERVATION';
  readonly actualHostedAuthRlsCertified: false;
  readonly durableWriteJourneyCertified: false;
  readonly atomicCrossPrincipalSnapshotCertified: false;
  readonly publishedBrowserCertified: false;
  readonly dataMutationAuthorized: false;
}

export async function verifyCrossDomainA2Read(
  factory: EnjazDataLayerFactory,
  staffUserId: string,
  companyId: string,
  transactionId: string,
  finance: Pick<FinanceCommandGateway, 'getReceipt' | 'loadContext'>,
  operations: Pick<CrossDomainOperationsReaders, 'field' | 'governance' | 'contracts'>,
  independentlyAuthenticatedPortal: Pick<ClientPortalGateway, 'authority' | 'readModel'>,
  now = new Date(),
): Promise<CrossDomainA2ReadObservation> {
  // No partial "passed" observation: a failure in any existing authority
  // stops the sequence before later independent client projection checks.
  const source = await loadCrossDomainJourneyReadProof(factory, staffUserId, companyId, transactionId);
  const money = await verifyCrossDomainFinanceRead(source, finance);
  const fieldAndContracts = await verifyCrossDomainOperationsRead(source, { ...operations, finance });
  const client = await verifyCrossDomainClientPortalRead(source, independentlyAuthenticatedPortal, now);
  if (money.companyId !== source.company.id || money.transactionId !== source.transaction.id ||
      fieldAndContracts.workspaceId !== source.workspaceId ||
      fieldAndContracts.companyId !== source.company.id ||
      fieldAndContracts.transactionId !== source.transaction.id ||
      client.workspaceId !== source.workspaceId) {
    throw new Error('A2 composed read returned a mismatched scope');
  }
  return Object.freeze({
    workspaceId: source.workspaceId,
    companyId: source.company.id,
    transactionId: source.transaction.id,
    observedNetPaymentCents: money.observedNetPaymentCents,
    linkedAssignmentCount: fieldAndContracts.linkedAssignmentCount,
    linkedVisitCount: fieldAndContracts.linkedVisitCount,
    linkedEngagementCount: fieldAndContracts.linkedEngagementCount,
    linkedContractRevisionCount: fieldAndContracts.linkedContractRevisionCount,
    clientPrincipalId: client.principalId,
    targetTransactionVisible: client.targetTransactionVisible,
    observedClientDocumentCount: client.observedDocumentCount,
    observedClientReceiptCount: client.observedReceiptCount,
    proofKind: 'A2_COMPOSED_READ_ONLY_SOURCE_OBSERVATION' as const,
    actualHostedAuthRlsCertified: false as const,
    durableWriteJourneyCertified: false as const,
    atomicCrossPrincipalSnapshotCertified: false as const,
    publishedBrowserCertified: false as const,
    dataMutationAuthorized: false as const,
  });
}
