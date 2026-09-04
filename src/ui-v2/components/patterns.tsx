import type { ReactNode } from 'react';
import { EzBadge, EzChip, EzMetric, EzProgress, EzRow, EzSurface } from './primitives.tsx';

export function TransactionPattern(props: Readonly<{
  title: string;
  company: string;
  status: string;
  urgency?: 'normal' | 'urgent';
  progress: number;
  owner: string;
}>) {
  return (
    <EzSurface tone="paper" emphasis="raised" className="ez-pattern ez-pattern--transaction">
      <header className="ez-pattern__head">
        <div><span className="ez-pattern__eyebrow">معاملة</span><h3>{props.title}</h3><p>{props.company}</p></div>
        <EzBadge tone={props.urgency === 'urgent' ? 'danger' : 'gold'}>{props.status}</EzBadge>
      </header>
      <EzProgress value={props.progress} label="تقدم المعاملة" />
      <footer className="ez-pattern__foot"><span>المسؤول</span><strong>{props.owner}</strong></footer>
    </EzSurface>
  );
}

export function FinancePattern(props: Readonly<{
  collected: string;
  outstanding: string;
  percent: number;
  trend?: string;
}>) {
  return (
    <EzSurface tone="dark" emphasis="focus" className="ez-pattern ez-pattern--finance">
      <div className="ez-pattern__finance-top">
        <div><span className="ez-pattern__eyebrow">التحصيل النشط</span><strong>{props.collected}</strong><small>{props.trend ?? 'ضمن المعاملات النشطة'}</small></div>
        <EzMetric label="المتبقي" value={props.outstanding} tone="gold" />
      </div>
      <EzProgress value={props.percent} label="نسبة التحصيل" detail={`${props.percent}%`} />
    </EzSurface>
  );
}

export function FollowupPattern(props: Readonly<{
  items: readonly { time: string; title: string; detail: string; state: string; tone?: 'warning' | 'danger' | 'success' }[];
}>) {
  return (
    <EzSurface tone="warm" emphasis="quiet" className="ez-pattern ez-pattern--followups">
      <header className="ez-pattern__head ez-pattern__head--compact"><div><span className="ez-pattern__eyebrow">المتابعات</span><h3>خط العمل القادم</h3></div><EzChip tone="gold">{props.items.length} عناصر</EzChip></header>
      <div className="ez-timeline">
        {props.items.map((item) => (
          <div className="ez-timeline__item" key={`${item.time}-${item.title}`}>
            <time>{item.time}</time>
            <i aria-hidden="true" />
            <div><strong>{item.title}</strong><small>{item.detail}</small></div>
            <EzChip tone={item.tone ?? 'neutral'}>{item.state}</EzChip>
          </div>
        ))}
      </div>
    </EzSurface>
  );
}

export function WorkflowPattern(props: Readonly<{
  title: string;
  current: number;
  total: number;
  steps: readonly { title: string; state: 'done' | 'current' | 'next' }[];
}>) {
  const progress = props.total > 0 ? Math.round((props.current / props.total) * 100) : 0;
  return (
    <EzSurface tone="paper" emphasis="raised" className="ez-pattern ez-pattern--workflow">
      <header className="ez-pattern__head"><div><span className="ez-pattern__eyebrow">سير العمل</span><h3>{props.title}</h3></div><div className="ez-pattern__ring" style={{ '--progress': `${progress}%` } as React.CSSProperties}><strong>{props.current}/{props.total}</strong></div></header>
      <div className="ez-step-list">
        {props.steps.map((step, index) => (
          <div className={`ez-step ez-step--${step.state}`} key={step.title}><span>{String(index + 1).padStart(2, '0')}</span><strong>{step.title}</strong><small>{step.state === 'done' ? 'مكتملة' : step.state === 'current' ? 'المرحلة الحالية' : 'قادمة'}</small></div>
        ))}
      </div>
    </EzSurface>
  );
}

export function CommandPattern(props: Readonly<{
  title: string;
  headline: string;
  metrics: readonly { label: string; value: string; tone?: 'gold' | 'dark' | 'plain' }[];
  children?: ReactNode;
}>) {
  return (
    <EzSurface tone="dark" emphasis="focus" className="ez-pattern ez-pattern--command">
      <header className="ez-command__hero"><span className="ez-pattern__eyebrow">{props.title}</span><h3>{props.headline}</h3></header>
      <div className="ez-command__metrics">{props.metrics.map((metric) => <EzMetric key={metric.label} {...metric} />)}</div>
      {props.children ? <div className="ez-command__body">{props.children}</div> : null}
    </EzSurface>
  );
}

export function DenseOperationsPattern() {
  return (
    <EzSurface tone="paper" emphasis="raised" className="ez-pattern ez-pattern--operations">
      <header className="ez-pattern__head ez-pattern__head--compact"><div><span className="ez-pattern__eyebrow">العمليات</span><h3>العمل الجاري الآن</h3></div><EzBadge tone="success">مستقر</EzBadge></header>
      <div className="ez-pattern__rows">
        <EzRow index="01" title="مراجعة طلب تأسيس" detail="شركة الفجر • منذ 12 دقيقة" meta="أحمد" state={<EzChip tone="warning">قيد التنفيذ</EzChip>} />
        <EzRow index="02" title="تدقيق مستندات" detail="معاملة 1042 • 6 وثائق" meta="سارة" state={<EzChip tone="info">مراجعة</EzChip>} />
        <EzRow index="03" title="إغلاق متابعة" detail="موعد اليوم • 14:30" meta="علي" state={<EzChip tone="success">جاهزة</EzChip>} />
      </div>
    </EzSurface>
  );
}
