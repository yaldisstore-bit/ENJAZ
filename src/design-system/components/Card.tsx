import type { ReactNode } from 'react';
import { classNames } from './classNames.ts';
import type { CardTone } from './componentContract.ts';

export interface CardProps {
  children: ReactNode;
  tone?: CardTone;
  className?: string;
}

export function Card({ children, tone = 'surface', className }: CardProps) {
  return <section className={classNames('ui-card', `ui-card--${tone}`, className)}>{children}</section>;
}

export interface CardHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  aside?: ReactNode;
}

export function CardHeader({ title, subtitle, aside }: CardHeaderProps) {
  return (
    <header className="ui-card__header">
      <div className="ui-card__heading text-container-safe">
        <h3 className="ui-card__title type-title-sm">{title}</h3>
        {subtitle ? <p className="ui-card__subtitle type-caption">{subtitle}</p> : null}
      </div>
      {aside ? <div className="ui-card__aside">{aside}</div> : null}
    </header>
  );
}

export function CardBody({ children }: { children: ReactNode }) {
  return <div className="ui-card__body type-body">{children}</div>;
}

export function CardFooter({ children }: { children: ReactNode }) {
  return <footer className="ui-card__footer">{children}</footer>;
}
