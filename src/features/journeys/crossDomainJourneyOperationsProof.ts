import type { FieldOperationsCommandGateway } from '../field-operations/fieldOperationsCommands.ts';
import type { GovernanceCommandGateway } from '../governance/governanceCommands.ts';
import type { FinanceCommandGateway } from '../finance/financeCommands.ts';
import type { EngagementContractGateway } from '../engagements/engagementContractCommands.ts';
import type { CrossDomainJourneyReadProof } from './crossDomainJourneyReadProof.ts';

// Existing services remain the only business authorities. This is a read-only
// acceptance crosscheck, not a joined persistence model or a new action gateway.
export class CrossDomainOperationsProofError extends Error {
  readonly reason: 'FIELD_AUTHORITY' | 'FIELD_LINK_DRIFT' | 'FIELD_DUPLICATE' |
    'GOVERNANCE_LINK_DRIFT' | 'ENGAGEMENT_LINK_DRIFT' | 'CONTRACT_LINK_DRIFT' | 'CONTRACT_DUPLICATE';
  constructor(reason: CrossDomainOperationsProofError['reason']) {
    super(`Cross-domain operations proof rejected: ${reason}`);
    this.name = 'CrossDomainOperationsProofError';
    this.reason = reason;
  }
}

export interface CrossDomainOperationsReadProof {
  readonly workspaceId: string;
  readonly transactionId: string;
  readonly companyId: string;
  readonly linkedAssignmentCount: number;
  readonly linkedVisitCount: number;
  readonly linkedEngagementCount: number;
  readonly linkedContractRevisionCount: number;
  readonly governanceObserved: true;
  readonly proofKind: 'SCOPED_EXISTING_DOMAIN_READ_ONLY_CROSSCHECK';
  readonly governanceActionAuthorized: false;
  readonly fieldActionAuthorized: false;
  readonly engagementSignatureCertified: false;
  readonly durableMultiDomainJourneyCertified: false;
}

export interface CrossDomainOperationsReaders {
  readonly field: Pick<FieldOperationsCommandGateway, 'loadContext'>;
  readonly governance: Pick<GovernanceCommandGateway, 'loadContext'>;
  readonly finance: Pick<FinanceCommandGateway, 'loadContext'>;
  readonly contracts: Pick<EngagementContractGateway, 'list'>;
}

/** Read the existing field, governance, engagement and retainer service
 *  authorities for a single already-sourced company/transaction. */
export async function verifyCrossDomainOperationsRead(
  source: CrossDomainJourneyReadProof,
  readers: CrossDomainOperationsReaders,
): Promise<CrossDomainOperationsReadProof> {
  const ws = source.workspaceId;
  const tx = source.transaction.id;
  const company = source.company.id;
  const [field, governance, finance] = await Promise.all([
    readers.field.loadContext(ws),
    readers.governance.loadContext(ws, company),
    readers.finance.loadContext(ws),
  ]);
  if (field.authority !== 'field_assignments_visits_evidence_receipts' ||
      field.transactionWriteAuthority !== 'none' || field.financeWriteAuthority !== 'none' ||
      field.workflowWriteAuthority !== 'existing_workflow_rpc_only' ||
      field.automationWriteAuthority !== 'existing_automation_rpc_only')
    throw new CrossDomainOperationsProofError('FIELD_AUTHORITY');
  if (governance.companyId !== company)
    throw new CrossDomainOperationsProofError('GOVERNANCE_LINK_DRIFT');

  const assignments = field.assignments.filter(row => row.transactionId === tx);
  const assignmentsById = new Map<string, (typeof assignments)[number]>();
  for (const row of assignments) {
    if (assignmentsById.has(row.id))
      throw new CrossDomainOperationsProofError('FIELD_DUPLICATE');
    assignmentsById.set(row.id, row);
  }
  const visits = field.visits.filter(row => row.transactionId === tx || assignmentsById.has(row.assignmentId));
  const visitIds = new Set<string>();
  for (const row of visits) {
    const assignment = assignmentsById.get(row.assignmentId);
    // Reassignment rewrites only checked-in visits. A completed visit must
    // retain its historical assignee even when the assignment moves later.
    if (row.transactionId !== tx || !assignment ||
        (row.status === 'checked_in' && row.assignedUserId !== assignment.assignedUserId))
      throw new CrossDomainOperationsProofError('FIELD_LINK_DRIFT');
    if (visitIds.has(row.id)) throw new CrossDomainOperationsProofError('FIELD_DUPLICATE');
    visitIds.add(row.id);
  }

  const linked = finance.engagements.filter(row => row.transactionIds.includes(tx));
  const engagementIds = new Set<string>();
  for (const row of linked) {
    if (row.companyId !== company)
      throw new CrossDomainOperationsProofError('ENGAGEMENT_LINK_DRIFT');
    if (engagementIds.has(row.id))
      throw new CrossDomainOperationsProofError('CONTRACT_DUPLICATE');
    engagementIds.add(row.id);
  }
  const revisionGroups = await Promise.all(linked.map(row => readers.contracts.list(ws, row.id)));
  let revisionCount = 0;
  const contractIds = new Set<string>();
  for (let i = 0; i < linked.length; i += 1) {
    const engagement = linked[i];
    if (!engagement) throw new CrossDomainOperationsProofError('ENGAGEMENT_LINK_DRIFT');
    const revisions = revisionGroups[i] ?? [];
    const numbers = new Set<number>();
    for (const row of revisions) {
      if (row.workspaceId !== ws || row.engagementId !== engagement.id ||
          !Number.isSafeInteger(row.revision) || row.revision < 1 ||
          row.supersedesRevision !== (row.revision === 1 ? null : row.revision - 1))
        throw new CrossDomainOperationsProofError('CONTRACT_LINK_DRIFT');
      if (contractIds.has(row.id) || numbers.has(row.revision))
        throw new CrossDomainOperationsProofError('CONTRACT_DUPLICATE');
      contractIds.add(row.id);
      numbers.add(row.revision);
      revisionCount += 1;
    }
    // Check the complete predecessor chain, not only each visible row's
    // numeric supersedes marker: a prior version must be formally superseded
    // before a newer revision can exist in the authoritative SQL contract.
    const byRevision = new Map(revisions.map(row => [row.revision, row] as const));
    for (let number = 1; number <= numbers.size; number += 1) {
      const current = byRevision.get(number);
      if (!current || (number < numbers.size && current.status !== 'superseded'))
        throw new CrossDomainOperationsProofError('CONTRACT_LINK_DRIFT');
    }
  }
  return Object.freeze({
    workspaceId: ws, transactionId: tx, companyId: company,
    linkedAssignmentCount: assignments.length, linkedVisitCount: visits.length,
    linkedEngagementCount: linked.length, linkedContractRevisionCount: revisionCount,
    governanceObserved: true as const,
    proofKind: 'SCOPED_EXISTING_DOMAIN_READ_ONLY_CROSSCHECK' as const,
    governanceActionAuthorized: false as const, fieldActionAuthorized: false as const,
    engagementSignatureCertified: false as const,
    durableMultiDomainJourneyCertified: false as const,
  });
}
