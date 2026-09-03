import type { ReactNode } from 'react';
import { classNames } from './classNames.ts';
import type { ButtonVariant, ControlSize, IconButtonTone } from './componentContract.ts';

export interface ButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ControlSize;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

export function Button({
  children,
  variant = 'primary',
  size = 'default',
  type = 'button',
  disabled = false,
  loading = false,
  onClick,
  className,
}: ButtonProps) {
  return (
    <button
      className={classNames('ui-button', `ui-button--${variant}`, `ui-button--${size}`, className)}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={onClick}
    >
      {loading ? <span className="ui-button__spinner" aria-hidden="true" /> : null}
      <span className="ui-button__label">{children}</span>
    </button>
  );
}

export interface IconButtonProps {
  label: string;
  icon: ReactNode;
  tone?: IconButtonTone;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

export function IconButton({
  label,
  icon,
  tone = 'neutral',
  type = 'button',
  disabled = false,
  onClick,
  className,
}: IconButtonProps) {
  return (
    <button
      className={classNames('ui-icon-button', `ui-icon-button--${tone}`, className)}
      type={type}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="ui-icon-button__glyph" aria-hidden="true">{icon}</span>
    </button>
  );
}
