export type IntakeContractCommunicationSource =
  | 'public_intake_submission'
  | 'reviewed_intake_submission'
  | 'client_portal_approval_response'
  | 'engagement_contract_revision'
  | 'renewal'
  | 'communication'
  | 'client_portal_message'
  | 'notification'
  | 'audit_event';

export const INTAKE_CONTRACT_COMMUNICATION_AUTHORITY = Object.freeze({
  intakeForm: 'intake_forms',
  intakeLink: 'intake_links',
  intakeSubmission: 'intake_submissions',
  intakeReview: 'intake_submissions.review_state_and_review_mapping',
  lead: 'crm_leads',
  conversionAudit: 'crm_conversion_audits',
  engagement: 'commercial_engagements',
  contractRevision: 'engagement_contract_revisions',
  contractArtifact: 'documents_and_document_versions',
  renewal: 'renewals',
  portalApprovalTarget: 'client_portal_document_approval_targets',
  portalApprovalResponse: 'client_portal_document_approval_responses',
  portalRequest: 'client_portal_requests',
  portalMessage: 'client_portal_messages',
  communication: 'communications',
  notificationAttention: 'in_app_notifications',
  notificationDelivery: 'notification_deliveries',
  audit: 'audit_events',
} as const);

export const INTAKE_CONTRACT_COMMUNICATION_LAWS = Object.freeze({
  publicIntakeMayBecomeAuthoritativeWithoutReview: false,
  intakeFollowupMayCreateShadowSubmission: false,
  clientApprovalMayMutateContractTruthDirectly: false,
  portalMessageMayBecomeCanonicalContractState: false,
  communicationMayBecomeContractTruth: false,
  notificationMayBecomeCommunicationTruth: false,
  renewalReminderMayBecomeRenewalTruth: false,
  contractReminderMayCreateShadowRenewal: false,
  contractCommunicationMayBypassPortalOrCommunicationAuthority: false,
  crossWorkspaceReferencesAllowed: false,
  expiredOrRevokedIntakeLinkMayBeResurrected: false,
  terminalContractRevisionMayBeSilentlyReopened: false,
  optimisticConcurrencyRequired: true,
  idempotencyRequiredForRetryableCommands: true,
  clientDecisionProvenanceRequired: true,
  communicationEvidenceRequiredForExternallyVisibleRequest: true,
  auditRequiredForSensitiveWrites: true,
} as const);

export interface IntakeContractAuthorityDecision {
  readonly source: IntakeContractCommunicationSource;
  readonly role:
    | 'non_authoritative_external_input'
    | 'reviewed_intake_evidence'
    | 'client_decision_evidence'
    | 'canonical_contract_revision_truth'
    | 'canonical_renewal_truth'
    | 'canonical_communication_truth'
    | 'portal_interaction_evidence'
    | 'attention_projection_only'
    | 'audit_evidence';
  readonly mayDirectlyMutateContractTruth: boolean;
  readonly mayDirectlyMutateRenewalTruth: boolean;
  readonly mayDirectlyMutateIntakeReviewTruth: boolean;
}

const DECISIONS: Readonly<Record<IntakeContractCommunicationSource, IntakeContractAuthorityDecision>> = Object.freeze({
  public_intake_submission: Object.freeze({source:'public_intake_submission',role:'non_authoritative_external_input',mayDirectlyMutateContractTruth:false,mayDirectlyMutateRenewalTruth:false,mayDirectlyMutateIntakeReviewTruth:false}),
  reviewed_intake_submission: Object.freeze({source:'reviewed_intake_submission',role:'reviewed_intake_evidence',mayDirectlyMutateContractTruth:false,mayDirectlyMutateRenewalTruth:false,mayDirectlyMutateIntakeReviewTruth:true}),
  client_portal_approval_response: Object.freeze({source:'client_portal_approval_response',role:'client_decision_evidence',mayDirectlyMutateContractTruth:false,mayDirectlyMutateRenewalTruth:false,mayDirectlyMutateIntakeReviewTruth:false}),
  engagement_contract_revision: Object.freeze({source:'engagement_contract_revision',role:'canonical_contract_revision_truth',mayDirectlyMutateContractTruth:true,mayDirectlyMutateRenewalTruth:false,mayDirectlyMutateIntakeReviewTruth:false}),
  renewal: Object.freeze({source:'renewal',role:'canonical_renewal_truth',mayDirectlyMutateContractTruth:false,mayDirectlyMutateRenewalTruth:true,mayDirectlyMutateIntakeReviewTruth:false}),
  communication: Object.freeze({source:'communication',role:'canonical_communication_truth',mayDirectlyMutateContractTruth:false,mayDirectlyMutateRenewalTruth:false,mayDirectlyMutateIntakeReviewTruth:false}),
  client_portal_message: Object.freeze({source:'client_portal_message',role:'portal_interaction_evidence',mayDirectlyMutateContractTruth:false,mayDirectlyMutateRenewalTruth:false,mayDirectlyMutateIntakeReviewTruth:false}),
  notification: Object.freeze({source:'notification',role:'attention_projection_only',mayDirectlyMutateContractTruth:false,mayDirectlyMutateRenewalTruth:false,mayDirectlyMutateIntakeReviewTruth:false}),
  audit_event: Object.freeze({source:'audit_event',role:'audit_evidence',mayDirectlyMutateContractTruth:false,mayDirectlyMutateRenewalTruth:false,mayDirectlyMutateIntakeReviewTruth:false}),
});

export function intakeContractAuthorityDecision(source:IntakeContractCommunicationSource):IntakeContractAuthorityDecision {
  return DECISIONS[source];
}

export type IntakeContractBridgeAction =
  | 'request_missing_intake_information'
  | 'request_client_contract_approval'
  | 'record_client_contract_decision'
  | 'schedule_contract_renewal_attention'
  | 'record_contract_communication_evidence';

export interface GovernedIntakeContractBridgeInput {
  readonly boundary:'phase11.6-domain-command'|'direct-browser-table-write';
  readonly actorAuthenticated:boolean;
  readonly workspaceAuthorized:boolean;
  readonly sourceWorkspaceMatches:boolean;
  readonly targetWorkspaceMatches:boolean;
  readonly optimisticVersionMatched:boolean;
  readonly retryable:boolean;
  readonly idempotencyKeyPresent:boolean;
  readonly action:IntakeContractBridgeAction;
}

export function assertGovernedIntakeContractBridge(input:GovernedIntakeContractBridgeInput):void {
  if(input.boundary!=='phase11.6-domain-command') throw new Error('ENJAZ_116_GOVERNED_COMMAND_REQUIRED');
  if(!input.actorAuthenticated) throw new Error('ENJAZ_116_AUTH_REQUIRED');
  if(!input.workspaceAuthorized) throw new Error('ENJAZ_116_WORKSPACE_FORBIDDEN');
  if(!input.sourceWorkspaceMatches||!input.targetWorkspaceMatches) throw new Error('ENJAZ_116_CROSS_WORKSPACE_REFERENCE');
  if(!input.optimisticVersionMatched) throw new Error('ENJAZ_116_STALE_VERSION');
  if(input.retryable&&!input.idempotencyKeyPresent) throw new Error('ENJAZ_116_IDEMPOTENCY_REQUIRED');
}

export interface ContractRenewalEligibilityInput {
  readonly contractStatus:'draft'|'under_review'|'approved'|'signature_pending'|'signed'|'effective'|'expired'|'terminated'|'superseded';
  readonly effectiveOn:string|null;
  readonly expiresOn:string|null;
  readonly existingRenewalId:string|null;
}

const DATE=/^\d{4}-\d{2}-\d{2}$/;
export function contractRenewalAttentionAllowed(input:ContractRenewalEligibilityInput):boolean {
  if(input.contractStatus!=='effective') return false;
  if(!input.effectiveOn||!input.expiresOn||!DATE.test(input.effectiveOn)||!DATE.test(input.expiresOn)) return false;
  if(input.expiresOn<input.effectiveOn) throw new Error('ENJAZ_116_CONTRACT_DATE_RANGE_INVALID');
  return input.existingRenewalId!==null;
}

export interface ClientDecisionBindingInput {
  readonly requestType:string;
  readonly requiredPermission:string;
  readonly responseDecision:'approved'|'rejected';
  readonly targetWorkspaceMatches:boolean;
  readonly targetIsCanonicalContractArtifact:boolean;
}

export function clientDecisionMayFeedContractCommand(input:ClientDecisionBindingInput):boolean {
  return input.requestType==='approval'
    && input.requiredPermission==='approve_document'
    && input.targetWorkspaceMatches
    && input.targetIsCanonicalContractArtifact;
}
