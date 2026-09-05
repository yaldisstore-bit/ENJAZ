import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from 'react';

export type R2SurfaceTone = 'canvas' | 'warm' | 'depth' | 'interactive';
export type R2Elevation = 0 | 1 | 2 | 3;
export type R2ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'critical';
export type R2NoticeKind = 'info' | 'success' | 'warning' | 'critical';

function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

export interface R2SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  tone?: R2SurfaceTone;
  elevation?: R2Elevation;
}

export function R2Surface({
  tone = 'canvas',
  elevation = 0,
  className,
  ...props
}: R2SurfaceProps) {
  return (
    <div
      {...props}
      className={cx('ez-r2-surface', className)}
      data-tone={tone}
      data-elevation={elevation || undefined}
    />
  );
}

export interface R2ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: R2ButtonVariant;
  leadingIcon?: ReactNode;
}

export function R2Button({
  variant = 'primary',
  leadingIcon,
  className,
  children,
  type = 'button',
  ...props
}: R2ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={cx('ez-r2-button', className)}
      data-variant={variant}
    >
      {leadingIcon}
      {children}
    </button>
  );
}

export interface R2TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string;
  hint?: string;
  message?: string;
}

export function R2TextField({
  id,
  label,
  hint,
  message,
  className,
  'aria-describedby': ariaDescribedBy,
  ...props
}: R2TextFieldProps) {
  const hintId = id && hint ? `${id}-hint` : undefined;
  const messageId = id && message ? `${id}-message` : undefined;
  const describedBy = [ariaDescribedBy, hintId, messageId].filter(Boolean).join(' ') || undefined;

  return (
    <label className="ez-r2-field" htmlFor={id}>
      <span className="ez-r2-field__label">{label}</span>
      <input
        {...props}
        id={id}
        className={cx('ez-r2-field__control', className)}
        aria-describedby={describedBy}
      />
      {hint ? <span id={hintId} className="ez-r2-field__hint">{hint}</span> : null}
      {message ? <span id={messageId} className="ez-r2-field__message">{message}</span> : null}
    </label>
  );
}

export interface R2TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  message?: string;
}

export function R2TextArea({
  id,
  label,
  hint,
  message,
  className,
  'aria-describedby': ariaDescribedBy,
  ...props
}: R2TextAreaProps) {
  const hintId = id && hint ? `${id}-hint` : undefined;
  const messageId = id && message ? `${id}-message` : undefined;
  const describedBy = [ariaDescribedBy, hintId, messageId].filter(Boolean).join(' ') || undefined;

  return (
    <label className="ez-r2-field" htmlFor={id}>
      <span className="ez-r2-field__label">{label}</span>
      <textarea
        {...props}
        id={id}
        className={cx('ez-r2-field__control', className)}
        aria-describedby={describedBy}
      />
      {hint ? <span id={hintId} className="ez-r2-field__hint">{hint}</span> : null}
      {message ? <span id={messageId} className="ez-r2-field__message">{message}</span> : null}
    </label>
  );
}

export interface R2OverlayFrameProps extends HTMLAttributes<HTMLDivElement> {
  labelledBy: string;
  children: ReactNode;
}

export function R2DialogFrame({ labelledBy, className, children, ...props }: R2OverlayFrameProps) {
  return (
    <div className="ez-r2-overlay" role="presentation">
      <div className="ez-r2-overlay__backdrop" aria-hidden="true" />
      <div
        {...props}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cx('ez-r2-dialog', 'ez-r2-enter', className)}
      >
        {children}
      </div>
    </div>
  );
}

export function R2SheetFrame({ labelledBy, className, children, ...props }: R2OverlayFrameProps) {
  return (
    <div className="ez-r2-overlay" role="presentation">
      <div className="ez-r2-overlay__backdrop" aria-hidden="true" />
      <div
        {...props}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cx('ez-r2-sheet', 'ez-r2-enter', className)}
      >
        {children}
      </div>
    </div>
  );
}

export function R2List({ className, ...props }: HTMLAttributes<HTMLUListElement>) {
  return <ul {...props} className={cx('ez-r2-list', className)} />;
}

export interface R2ListRowProps extends Omit<HTMLAttributes<HTMLLIElement>, 'title'> {
  title: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
}

export function R2ListRow({ title, meta, trailing, className, ...props }: R2ListRowProps) {
  return (
    <li {...props} className={cx('ez-r2-list-row', className)}>
      <div className="ez-r2-list-row__main">
        <p className="ez-r2-list-row__title ez-r2-bidi">{title}</p>
        {meta ? <p className="ez-r2-list-row__meta ez-r2-bidi">{meta}</p> : null}
      </div>
      {trailing}
    </li>
  );
}

export function R2TableFrame({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cx('ez-r2-table-wrap', className)} />;
}

export interface R2PageHeaderProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  kicker?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  location?: ReactNode;
}

export function R2PageHeader({
  kicker,
  title,
  description,
  actions,
  location,
  className,
  ...props
}: R2PageHeaderProps) {
  return (
    <header {...props} className={cx('ez-r2-page-header', className)}>
      {location}
      {kicker ? <p className="ez-r2-kicker">{kicker}</p> : null}
      <div className="ez-r2-page-header__line">
        <div className="ez-r2-stack">
          <h1 className="ez-r2-title ez-r2-bidi">{title}</h1>
          {description ? <p className="ez-r2-body ez-r2-bidi">{description}</p> : null}
        </div>
        {actions ? <div className="ez-r2-cluster">{actions}</div> : null}
      </div>
      <div className="ez-r2-accent-rule" aria-hidden="true" />
    </header>
  );
}

export interface R2LocationProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}

export function R2Location({ className, ...props }: R2LocationProps) {
  return <nav {...props} aria-label="الموقع الحالي" className={cx('ez-r2-location', className)} />;
}

export function R2Nav({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <nav {...props} className={cx('ez-r2-nav', className)} />;
}

export interface R2NavItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  icon?: ReactNode;
}

export function R2NavItem({ active = false, icon, className, children, type = 'button', ...props }: R2NavItemProps) {
  return (
    <button
      {...props}
      type={type}
      aria-current={active ? 'page' : undefined}
      className={cx('ez-r2-nav-item', className)}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

export interface R2NoticeProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  kind: R2NoticeKind;
  title: ReactNode;
  icon: ReactNode;
  children?: ReactNode;
}

export function R2Notice({ kind, title, icon, children, className, ...props }: R2NoticeProps) {
  return (
    <div {...props} className={cx('ez-r2-notice', className)} data-kind={kind} role={kind === 'critical' ? 'alert' : 'status'}>
      <span aria-hidden="true">{icon}</span>
      <div>
        <p className="ez-r2-notice__title">{title}</p>
        {children ? <div className="ez-r2-notice__body">{children}</div> : null}
      </div>
    </div>
  );
}

export function R2Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} aria-hidden="true" className={cx('ez-r2-skeleton', className)} />;
}

export interface R2EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: ReactNode;
  description: ReactNode;
  action?: ReactNode;
}

export function R2EmptyState({ title, description, action, className, ...props }: R2EmptyStateProps) {
  return (
    <div {...props} className={cx('ez-r2-empty-state', className)}>
      <span className="ez-r2-state-mark" aria-hidden="true" />
      <h2 className="ez-r2-heading">{title}</h2>
      <p className="ez-r2-body">{description}</p>
      {action}
    </div>
  );
}

export function R2Frame({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cx('ez-r2-frame', className)} />;
}

export function R2Stack({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cx('ez-r2-stack', className)} />;
}

export function R2Cluster({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cx('ez-r2-cluster', className)} />;
}

export interface R2SplitProps extends HTMLAttributes<HTMLDivElement> {
  layout?: 'single' | 'sidebar';
}

export function R2Split({ layout = 'single', className, ...props }: R2SplitProps) {
  return <div {...props} data-layout={layout} className={cx('ez-r2-split', className)} />;
}
