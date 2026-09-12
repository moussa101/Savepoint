import Link from 'next/link';
import type { ReactNode } from 'react';
import Navbar from '@/components/layout/Navbar';

export type StatusAction = {
  href: string;
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: ReactNode;
};

type Props = {
  code?: string;
  title: string;
  description: string;
  icon?: ReactNode;
  actions?: StatusAction[];
  /** When false, skip Navbar (e.g. global-error has no app chrome). */
  showNavbar?: boolean;
  footer?: ReactNode;
};

export default function StatusPage({
  code,
  title,
  description,
  icon,
  actions = [],
  showNavbar = true,
  footer,
}: Props) {
  return (
    <>
      {showNavbar ? <Navbar /> : null}
      <main className="status-page">
        <div className="status-page-inner">
          {code ? (
            <div className="status-page-code font-display" aria-hidden="true">
              {code}
            </div>
          ) : null}
          {icon ? <div className="status-page-icon">{icon}</div> : null}
          <h1 className="status-page-title font-display">{title}</h1>
          <p className="status-page-text">{description}</p>
          {actions.length > 0 ? (
            <div className="status-page-actions">
              {actions.map((action) => (
                <Link
                  key={action.href + action.label}
                  href={action.href}
                  className={`btn btn-${action.variant || 'secondary'}`}
                >
                  {action.icon}
                  {action.label}
                </Link>
              ))}
            </div>
          ) : null}
          {footer}
        </div>
      </main>
    </>
  );
}
