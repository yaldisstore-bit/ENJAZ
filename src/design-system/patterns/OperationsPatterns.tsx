import type { ReactNode } from 'react';
import { Badge, Button, Card, CardBody, CardFooter, CardHeader, ProgressBar, type BadgeTone } from '../components/index.ts';
import {
  formatIqd,
  type AutomationState,
  type FollowUpState,
  type PatternDensity,
  type RiskLevel,
  type WorkflowState,
} from './patternContract.ts';

const RISK_TONES: Record<RiskLevel, BadgeTone> = {
  low: 'success',
  medium: 'warning',
  high: 'warning',
  critical: 'danger',
};

const RISK_LABELS: Record<RiskLevel, string> = {
  low: 'منخفض',
  medium: 'متوسط',
  high: 'مرتفع',
  critical: 'حرج',
};

export interface FinanceSummaryPatternProps {
  total: number;
  paid: number;
  outstanding: number;
  overdue?: number;
  periodLabel?: string;
  density?: PatternDensity;
  action?: ReactNode;
}

export function FinanceSummaryPattern({
  total,
  paid,
  outstanding,
  overdue = 0,
  periodLabel = 'الفترة الحالية',
  density = 'comfortable',
  action,
}: FinanceSummaryPatternProps) {
  const collectionRate = total > 0 ? Math.round((paid / total) * 100) : 0;

  return (
    <Card tone="prominent" className={`pattern-card pattern-card--finance pattern-density--${density}`}>
      <CardHeader
        title="الملخص المالي"
        subtitle={periodLabel}
        aside={<Badge tone={overdue > 0 ? 'warning' : 'success'}>{overdue > 0 ? 'توجد متأخرات' : 'مستقر'}</Badge>}
      />
      <CardBody>
        <div className="pattern-money-hero">
          <span className="type-caption">إجمالي الأتعاب</span>
          <strong className="type-title-md text-numeric">{formatIqd(total)}</strong>
        </div>
        <dl className="pattern-metric-grid pattern-metric-grid--finance">
          <div><dt>المقبوض</dt><dd className="text-numeric">{formatIqd(paid)}</dd></div>
          <div><dt>المتبقي</dt><dd className="text-numeric">{formatIqd(outstanding)}</dd></div>
          <div><dt>متأخر</dt><dd className="text-numeric">{formatIqd(overdue)}</dd></div>
        </dl>
        <ProgressBar value={collectionRate} label="نسبة التحصيل" className="pattern-progress" />
      </CardBody>
      {action ? <CardFooter>{action}</CardFooter> : null}
    </Card>
  );
}

export interface RiskSignalPatternProps {
  level: RiskLevel;
  title: string;
  reason: string;
  entityLabel?: string;
  nextAction?: string;
  density?: PatternDensity;
  action?: ReactNode;
}

export function RiskSignalPattern({
  level,
  title,
  reason,
  entityLabel,
  nextAction,
  density = 'comfortable',
  action,
}: RiskSignalPatternProps) {
  return (
    <section className={`pattern-risk pattern-risk--${level} pattern-density--${density}`} aria-label={`مؤشر خطر ${RISK_LABELS[level]}`}>
      <div className="pattern-risk__icon" aria-hidden="true">!</div>
      <div className="pattern-risk__copy text-container-safe">
        <div className="pattern-risk__heading">
          <h3 className="type-title-sm">{title}</h3>
          <Badge tone={RISK_TONES[level]}>{RISK_LABELS[level]}</Badge>
        </div>
        {entityLabel ? <p className="pattern-risk__entity type-caption text-clamp-2">{entityLabel}</p> : null}
        <p className="type-body">{reason}</p>
        {nextAction ? <p className="pattern-risk__next type-caption"><strong>الإجراء المقترح:</strong> {nextAction}</p> : null}
      </div>
      {action ? <div className="pattern-risk__action">{action}</div> : null}
    </section>
  );
}

export interface TimelineItem {
  id: string;
  title: string;
  meta: string;
  description?: string;
  tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger';
}

export interface TimelinePatternProps {
  title?: string;
  items: readonly TimelineItem[];
  density?: PatternDensity;
}

export function TimelinePattern({ title = 'التسلسل الزمني', items, density = 'comfortable' }: TimelinePatternProps) {
  return (
    <section className={`pattern-timeline pattern-density--${density}`} aria-labelledby="pattern-timeline-title">
      <div className="pattern-section-heading">
        <h3 id="pattern-timeline-title" className="type-title-sm">{title}</h3>
        <span className="type-caption text-numeric">{items.length}</span>
      </div>
      <ol className="pattern-timeline__list">
        {items.map((item) => (
          <li key={item.id} className={`pattern-timeline__item pattern-timeline__item--${item.tone ?? 'neutral'}`}>
            <span className="pattern-timeline__rail" aria-hidden="true"><span /></span>
            <div className="pattern-timeline__content text-container-safe">
              <div className="pattern-timeline__topline">
                <strong className="type-body">{item.title}</strong>
                <bdi className="type-caption text-numeric">{item.meta}</bdi>
              </div>
              {item.description ? <p className="type-caption">{item.description}</p> : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

const FOLLOW_UP_TONES: Record<FollowUpState, BadgeTone> = {
  upcoming: 'brand',
  overdue: 'danger',
  completed: 'success',
};

const FOLLOW_UP_LABELS: Record<FollowUpState, string> = {
  upcoming: 'قادمة',
  overdue: 'متأخرة',
  completed: 'مكتملة',
};

export interface FollowUpPatternProps {
  title: string;
  dateLabel: string;
  state: FollowUpState;
  entityLabel?: string;
  note?: string;
  owner?: string;
  density?: PatternDensity;
  action?: ReactNode;
}

export function FollowUpPattern({
  title,
  dateLabel,
  state,
  entityLabel,
  note,
  owner,
  density = 'comfortable',
  action,
}: FollowUpPatternProps) {
  return (
    <section className={`pattern-follow-up pattern-follow-up--${state} pattern-density--${density}`}>
      <div className="pattern-follow-up__date" aria-hidden="true">◷</div>
      <div className="pattern-follow-up__copy text-container-safe">
        <div className="pattern-follow-up__heading">
          <h3 className="type-title-sm">{title}</h3>
          <Badge tone={FOLLOW_UP_TONES[state]}>{FOLLOW_UP_LABELS[state]}</Badge>
        </div>
        <p className="pattern-follow-up__meta type-caption"><bdi className="text-numeric">{dateLabel}</bdi>{owner ? <span>{owner}</span> : null}</p>
        {entityLabel ? <p className="type-body text-clamp-2">{entityLabel}</p> : null}
        {note ? <p className="type-caption text-clamp-2">{note}</p> : null}
      </div>
      {action ? <div className="pattern-follow-up__action">{action}</div> : null}
    </section>
  );
}

export interface WorkflowStep {
  id: string;
  label: string;
  state: WorkflowState;
  meta?: string;
}

export interface WorkflowPatternProps {
  title: string;
  steps: readonly WorkflowStep[];
  density?: PatternDensity;
  action?: ReactNode;
}

export function WorkflowPattern({ title, steps, density = 'comfortable', action }: WorkflowPatternProps) {
  const completed = steps.filter((step) => step.state === 'completed').length;
  const progress = steps.length ? Math.round((completed / steps.length) * 100) : 0;

  return (
    <Card tone="raised" className={`pattern-card pattern-card--workflow pattern-density--${density}`}>
      <CardHeader title={title} subtitle="مسار العمل" aside={<Badge tone="brand">{completed}/{steps.length}</Badge>} />
      <CardBody>
        <ProgressBar value={progress} label="تقدم المسار" className="pattern-progress" />
        <ol className="pattern-workflow" aria-label="مراحل سير العمل">
          {steps.map((step, index) => (
            <li key={step.id} className={`pattern-workflow__step pattern-workflow__step--${step.state}`}>
              <span className="pattern-workflow__index text-numeric" aria-hidden="true">{index + 1}</span>
              <span className="pattern-workflow__copy text-container-safe">
                <strong className="type-body">{step.label}</strong>
                {step.meta ? <small className="type-caption">{step.meta}</small> : null}
              </span>
              <span className="pattern-workflow__state type-caption">
                {step.state === 'completed' ? 'مكتملة' : step.state === 'current' ? 'الحالية' : step.state === 'blocked' ? 'متوقفة' : 'قادمة'}
              </span>
            </li>
          ))}
        </ol>
      </CardBody>
      {action ? <CardFooter>{action}</CardFooter> : null}
    </Card>
  );
}

const AUTOMATION_TONES: Record<AutomationState, BadgeTone> = {
  active: 'success',
  paused: 'neutral',
  error: 'danger',
};

export interface AutomationPatternProps {
  title: string;
  trigger: string;
  outcome: string;
  state: AutomationState;
  lastRun?: string;
  density?: PatternDensity;
  action?: ReactNode;
}

export function AutomationPattern({
  title,
  trigger,
  outcome,
  state,
  lastRun,
  density = 'comfortable',
  action,
}: AutomationPatternProps) {
  const label = state === 'active' ? 'فعالة' : state === 'paused' ? 'متوقفة' : 'تحتاج إصلاح';

  return (
    <Card tone="surface" className={`pattern-card pattern-card--automation pattern-density--${density}`}>
      <CardHeader title={title} subtitle="قاعدة أتمتة" aside={<Badge tone={AUTOMATION_TONES[state]}>{label}</Badge>} />
      <CardBody>
        <div className="pattern-automation-flow">
          <div><span className="type-label">عند</span><p className="type-body">{trigger}</p></div>
          <span className="pattern-automation-arrow" aria-hidden="true">←</span>
          <div><span className="type-label">نفّذ</span><p className="type-body">{outcome}</p></div>
        </div>
        {lastRun ? <p className="pattern-automation-last type-caption">آخر تشغيل: <bdi className="text-numeric">{lastRun}</bdi></p> : null}
      </CardBody>
      {action ? <CardFooter>{action}</CardFooter> : null}
    </Card>
  );
}

export interface CommandMetric {
  label: string;
  value: string | number;
  tone?: 'neutral' | 'warning' | 'danger' | 'success';
}

export interface CommandModulePatternProps {
  title: string;
  description: string;
  icon?: ReactNode;
  metrics?: readonly CommandMetric[];
  density?: PatternDensity;
  onOpen?: () => void;
}

export function CommandModulePattern({
  title,
  description,
  icon = '⌘',
  metrics = [],
  density = 'comfortable',
  onOpen,
}: CommandModulePatternProps) {
  return (
    <section className={`pattern-command pattern-density--${density}`}>
      <div className="pattern-command__icon" aria-hidden="true">{icon}</div>
      <div className="pattern-command__copy text-container-safe">
        <h3 className="type-title-sm">{title}</h3>
        <p className="type-caption text-clamp-2">{description}</p>
        {metrics.length ? (
          <dl className="pattern-command__metrics">
            {metrics.map((metric) => (
              <div key={metric.label} className={`pattern-command__metric pattern-command__metric--${metric.tone ?? 'neutral'}`}>
                <dt>{metric.label}</dt><dd className="text-numeric">{metric.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
      <Button variant="secondary" className="pattern-command__button" {...(onOpen ? { onClick: onOpen } : {})}>فتح</Button>
    </section>
  );
}
