import type { ReactNode } from 'react';
import { EzButton } from './primitives.tsx';

export function EzDialog(props: Readonly<{
  open: boolean;
  title: string;
  body: string;
  onClose(): void;
  primaryLabel?: string;
  onPrimary?(): void;
}>) {
  if (!props.open) return null;
  return (
    <div className="ez-overlay" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) props.onClose(); }}>
      <section className="ez-dialog" role="dialog" aria-modal="true" aria-labelledby="ez-dialog-title">
        <div className="ez-dialog__mark" aria-hidden="true">!</div>
        <div className="ez-dialog__copy"><span>تأكيد الإجراء</span><h2 id="ez-dialog-title">{props.title}</h2><p>{props.body}</p></div>
        <div className="ez-dialog__actions">
          <EzButton tone="ghost" onClick={props.onClose}>إلغاء</EzButton>
          {props.primaryLabel && props.onPrimary ? <EzButton tone="dark" onClick={props.onPrimary}>{props.primaryLabel}</EzButton> : null}
        </div>
      </section>
    </div>
  );
}

export function EzSheet(props: Readonly<{
  open: boolean;
  title: string;
  eyebrow?: string;
  onClose(): void;
  children: ReactNode;
}>) {
  if (!props.open) return null;
  return (
    <div className="ez-overlay ez-overlay--sheet" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) props.onClose(); }}>
      <section className="ez-sheet" role="dialog" aria-modal="true" aria-labelledby="ez-sheet-title">
        <span className="ez-sheet__grabber" aria-hidden="true" />
        <header className="ez-sheet__head">
          <div>{props.eyebrow ? <span>{props.eyebrow}</span> : null}<h2 id="ez-sheet-title">{props.title}</h2></div>
          <button type="button" className="ez-sheet__close" onClick={props.onClose} aria-label="إغلاق">×</button>
        </header>
        <div className="ez-sheet__body">{props.children}</div>
      </section>
    </div>
  );
}

export function EzMenu(props: Readonly<{
  open: boolean;
  anchorLabel: string;
  items: readonly { id: string; label: string; detail?: string; danger?: boolean }[];
  onSelect(id: string): void;
}>) {
  if (!props.open) return null;
  return (
    <div className="ez-menu" role="menu" aria-label={props.anchorLabel}>
      {props.items.map((item) => (
        <button key={item.id} type="button" role="menuitem" className={item.danger ? 'is-danger' : ''} onClick={() => props.onSelect(item.id)}>
          <span><strong>{item.label}</strong>{item.detail ? <small>{item.detail}</small> : null}</span>
          <span aria-hidden="true">←</span>
        </button>
      ))}
    </div>
  );
}
