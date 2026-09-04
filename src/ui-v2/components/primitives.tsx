import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

export type EzTone = 'neutral' | 'gold' | 'dark' | 'success' | 'warning' | 'danger' | 'info';

export function EzButton(props: Readonly<ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'gold' | 'dark' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
}>) {
  const { tone = 'gold', size = 'md', icon, className = '', children, ...buttonProps } = props;
  return (
    <button
      {...buttonProps}
      className={`ez-button ez-button--${tone} ez-button--${size} ${className}`.trim()}
    >
      {icon ? <span className="ez-button__icon" aria-hidden="true">{icon}</span> : null}
      <span>{children}</span>
    </button>
  );
}

export function EzIconButton(props: Readonly<ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon: ReactNode;
}>) {
  const { label, icon, className = '', ...buttonProps } = props;
  return (
    <button {...buttonProps} className={`ez-icon-button ${className}`.trim()} aria-label={label} title={label}>
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}

export function EzField(props: Readonly<Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> & {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  prefix?: ReactNode;
}>) {
  const { label, hint, error, prefix, className = '', id, ...inputProps } = props;
  const fieldId = id ?? `field-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <label className={`ez-field ${error ? 'ez-field--error' : ''} ${className}`.trim()} htmlFor={fieldId}>
      <span className="ez-field__label">{label}</span>
      <span className="ez-field__control">
        {prefix ? <span className="ez-field__prefix" aria-hidden="true">{prefix}</span> : null}
        <input {...inputProps} id={fieldId} />
      </span>
      {error ? <span className="ez-field__message" role="alert">{error}</span> : hint ? <span className="ez-field__hint">{hint}</span> : null}
    </label>
  );
}

export function EzChip(props: Readonly<{ children: ReactNode; tone?: EzTone; dot?: boolean }>) {
  const { children, tone = 'neutral', dot = false } = props;
  return <span className={`ez-chip ez-chip--${tone}`}>{dot ? <i aria-hidden="true" /> : null}{children}</span>;
}

export function EzBadge(props: Readonly<{ children: ReactNode; tone?: EzTone }>) {
  const { children, tone = 'gold' } = props;
  return <span className={`ez-badge ez-badge--${tone}`}>{children}</span>;
}

export function EzSurface(props: Readonly<{
  children: ReactNode;
  tone?: 'paper' | 'warm' | 'dark' | 'gold';
  emphasis?: 'quiet' | 'raised' | 'focus';
  className?: string;
}>) {
  const { children, tone = 'paper', emphasis = 'quiet', className = '' } = props;
  return <section className={`ez-surface ez-surface--${tone} ez-surface--${emphasis} ${className}`.trim()}>{children}</section>;
}

export function EzMetric(props: Readonly<{
  label: string;
  value: string;
  detail?: string;
  tone?: 'gold' | 'dark' | 'plain';
}>) {
  const { label, value, detail, tone = 'plain' } = props;
  return (
    <div className={`ez-metric ez-metric--${tone}`}>
      <small>{label}</small>
      <strong>{value}</strong>
      {detail ? <span>{detail}</span> : null}
    </div>
  );
}

export function EzRow(props: Readonly<{
  index?: string;
  title: string;
  detail?: string;
  meta?: ReactNode;
  state?: ReactNode;
  onClick?: () => void;
}>) {
  const content = (
    <>
      {props.index ? <span className="ez-row__index">{props.index}</span> : null}
      <span className="ez-row__copy"><strong>{props.title}</strong>{props.detail ? <small>{props.detail}</small> : null}</span>
      {props.meta ? <span className="ez-row__meta">{props.meta}</span> : null}
      {props.state ? <span className="ez-row__state">{props.state}</span> : null}
    </>
  );
  return props.onClick ? <button type="button" className="ez-row ez-row--interactive" onClick={props.onClick}>{content}</button> : <div className="ez-row">{content}</div>;
}

export function EzNotice(props: Readonly<{
  title: string;
  body: string;
  tone?: 'info' | 'success' | 'warning' | 'danger';
  action?: ReactNode;
}>) {
  const { title, body, tone = 'info', action } = props;
  return (
    <div className={`ez-notice ez-notice--${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <span className="ez-notice__mark" aria-hidden="true" />
      <span className="ez-notice__copy"><strong>{title}</strong><small>{body}</small></span>
      {action ? <span className="ez-notice__action">{action}</span> : null}
    </div>
  );
}

export function EzProgress(props: Readonly<{ value: number; label: string; detail?: string }>) {
  const value = Math.max(0, Math.min(100, props.value));
  return (
    <div className="ez-progress">
      <span className="ez-progress__head"><strong>{props.label}</strong><small>{props.detail ?? `${Math.round(value)}%`}</small></span>
      <progress max={100} value={value} aria-label={`${props.label} ${Math.round(value)}%`} />
    </div>
  );
}

export function EzSegmented(props: Readonly<{
  value: string;
  options: readonly { value: string; label: string }[];
  onChange(value: string): void;
}>) {
  return (
    <div className="ez-segmented" role="group" aria-label="خيارات العرض">
      {props.options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={props.value === option.value ? 'is-active' : ''}
          aria-pressed={props.value === option.value}
          onClick={() => props.onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
