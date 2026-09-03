import type { ReactNode } from 'react';
import { Badge, Card, CardBody, CardFooter, CardHeader, ProgressBar, type BadgeTone } from '../components/index.ts';
import { clampPercent, type PatternDensity, type RiskLevel, type TransactionState } from './patternContract.ts';

const TRANSACTION_LABELS: Record<TransactionState, string> = {
  active: 'جارية',
  stalled: 'متلكئة',
  completed: 'منجزة',
  archived: 'مؤرشفة',
};

const TRANSACTION_TONES: Record<TransactionState, BadgeTone> = {
  active: 'brand',
  stalled: 'danger',
  completed: 'success',
  archived: 'neutral',
};

const RISK_LABELS: Record<RiskLevel, string> = {
  low: 'مستقرة',
  medium: 'تحتاج انتباه',
  high: 'عالية الأولوية',
  critical: 'حرجة',
};

const RISK_TONES: Record<RiskLevel, BadgeTone> = {
  low: 'success',
  medium: 'warning',
  high: 'warning',
  critical: 'danger',
};

export interface TransactionPatternProps {
  title: string;
  reference: string;
  company: string;
  state: TransactionState;
  progress: number;
  stage: string;
  dueLabel?: string;
  owner?: string;
  risk?: RiskLevel;
  followUpLabel?: string;
  density?: PatternDensity;
  action?: ReactNode;
}

export function TransactionPattern({
  title,
  reference,
  company,
  state,
  progress,
  stage,
  dueLabel,
  owner,
  risk = 'low',
  followUpLabel,
  density = 'comfortable',
  action,
}: TransactionPatternProps) {
  const safeProgress = clampPercent(progress);

  return (
    <Card tone={state === 'stalled' ? 'prominent' : 'raised'} className={`pattern-card pattern-card--transaction pattern-density--${density}`}>
      <CardHeader
        title={<span className="text-container-safe">{title}</span>}
        subtitle={<bdi className="text-code pattern-reference">{reference}</bdi>}
        aside={<Badge tone={TRANSACTION_TONES[state]}>{TRANSACTION_LABELS[state]}</Badge>}
      />
      <CardBody>
        <div className="pattern-entity-copy">
          <p className="pattern-entity-name type-body text-clamp-2">{company}</p>
          <div className="pattern-chip-row" aria-label="ملخص المعاملة">
            <Badge tone={RISK_TONES[risk]}>{RISK_LABELS[risk]}</Badge>
            <span className="pattern-inline-fact type-caption"><span aria-hidden="true">◈</span>{stage}</span>
            {dueLabel ? <span className="pattern-inline-fact type-caption"><span aria-hidden="true">◷</span>{dueLabel}</span> : null}
          </div>
        </div>
        <ProgressBar value={safeProgress} label="تقدم المعاملة" className="pattern-progress" />
        {(owner || followUpLabel) ? (
          <dl className="pattern-facts pattern-facts--two">
            {owner ? <div><dt>المسؤول</dt><dd>{owner}</dd></div> : null}
            {followUpLabel ? <div><dt>المتابعة</dt><dd>{followUpLabel}</dd></div> : null}
          </dl>
        ) : null}
      </CardBody>
      {action ? <CardFooter>{action}</CardFooter> : null}
    </Card>
  );
}

export interface CompanyPatternProps {
  name: string;
  legalForm?: string;
  location?: string;
  activeTransactions: number;
  stalledTransactions?: number;
  receivableLabel?: string;
  statusLabel?: string;
  density?: PatternDensity;
  action?: ReactNode;
}

export function CompanyPattern({
  name,
  legalForm = 'محدودة المسؤولية',
  location,
  activeTransactions,
  stalledTransactions = 0,
  receivableLabel,
  statusLabel = 'نشطة',
  density = 'comfortable',
  action,
}: CompanyPatternProps) {
  const attention = stalledTransactions > 0;

  return (
    <Card tone="raised" className={`pattern-card pattern-card--company pattern-density--${density}`}>
      <CardHeader
        title={<span className="text-container-safe">{name}</span>}
        subtitle={legalForm}
        aside={<Badge tone={attention ? 'warning' : 'success'}>{statusLabel}</Badge>}
      />
      <CardBody>
        {location ? <p className="pattern-location type-caption"><span aria-hidden="true">⌖</span>{location}</p> : null}
        <dl className="pattern-metric-grid">
          <div><dt>المعاملات الجارية</dt><dd className="text-numeric type-title-sm">{activeTransactions}</dd></div>
          <div><dt>المتلكئة</dt><dd className="text-numeric type-title-sm">{stalledTransactions}</dd></div>
          {receivableLabel ? <div><dt>المستحق</dt><dd className="text-numeric type-title-sm">{receivableLabel}</dd></div> : null}
        </dl>
      </CardBody>
      {action ? <CardFooter>{action}</CardFooter> : null}
    </Card>
  );
}

export interface ContactPatternProps {
  name: string;
  role: string;
  company?: string;
  phone?: string;
  openItems?: number;
  status?: 'active' | 'attention' | 'inactive';
  density?: PatternDensity;
  action?: ReactNode;
}

export function ContactPattern({
  name,
  role,
  company,
  phone,
  openItems = 0,
  status = 'active',
  density = 'comfortable',
  action,
}: ContactPatternProps) {
  const statusTone: BadgeTone = status === 'active' ? 'success' : status === 'attention' ? 'warning' : 'neutral';
  const statusLabel = status === 'active' ? 'متاح' : status === 'attention' ? 'متابعة' : 'غير نشط';

  return (
    <Card tone="surface" className={`pattern-card pattern-card--contact pattern-density--${density}`}>
      <CardHeader title={name} subtitle={role} aside={<Badge tone={statusTone}>{statusLabel}</Badge>} />
      <CardBody>
        <dl className="pattern-facts">
          {company ? <div><dt>الجهة</dt><dd className="text-clamp-2">{company}</dd></div> : null}
          {phone ? <div><dt>الهاتف</dt><dd><bdi className="text-numeric">{phone}</bdi></dd></div> : null}
          <div><dt>العناصر المفتوحة</dt><dd className="text-numeric">{openItems}</dd></div>
        </dl>
      </CardBody>
      {action ? <CardFooter>{action}</CardFooter> : null}
    </Card>
  );
}
