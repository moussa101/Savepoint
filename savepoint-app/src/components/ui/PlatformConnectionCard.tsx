import type { ReactNode } from 'react';

type Props = {
  icon: ReactNode;
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  status?: { kind: 'ok' | 'error'; text: string } | null;
  hint?: ReactNode;
  className?: string;
};

/** Shared Steam / PSN / Xbox connection block for Settings + Library. */
export default function PlatformConnectionCard({
  icon,
  title,
  meta,
  actions,
  children,
  status,
  hint,
  className = '',
}: Props) {
  return (
    <div className={`platform-connect-card ${className}`.trim()}>
      <div className="platform-connect-header">
        <div className="platform-connect-title-row">
          {icon}
          <strong>{title}</strong>
        </div>
        {actions ? <div className="platform-connect-actions">{actions}</div> : null}
      </div>
      {meta ? <div className="platform-connect-meta">{meta}</div> : null}
      {children}
      {status ? (
        <p className={`platform-connect-status is-${status.kind}`} role="status">
          {status.text}
        </p>
      ) : null}
      {hint ? <div className="platform-connect-hint">{hint}</div> : null}
    </div>
  );
}
