import { useEffect, useId, useRef } from 'react';
import { Link } from 'react-router-dom';
import { initials, titleCase } from '../lib/store';

/* --------------------------------------------------------------- logo */
export function LogoMark({ size = 32 }) {
  const gradientId = useId();
  // Concentric orbit rings with nodes — a simplified redraw of the mark.
  const nodes = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return { x: 50 + Math.cos(a) * 41, y: 50 + Math.sin(a) * 41, r: i % 3 === 0 ? 4 : 2.6 };
  });
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="ProjectVerse">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#241266" />
          <stop offset="100%" stopColor="#9b2fa0" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="41" fill="none" stroke={`url(#${gradientId})`} strokeWidth="1.1" opacity="0.55" />
      <ellipse cx="50" cy="50" rx="41" ry="20" fill="none" stroke={`url(#${gradientId})`} strokeWidth="1" opacity="0.4" transform="rotate(30 50 50)" />
      <ellipse cx="50" cy="50" rx="41" ry="20" fill="none" stroke={`url(#${gradientId})`} strokeWidth="1" opacity="0.4" transform="rotate(-30 50 50)" />
      {nodes.map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r={n.r} fill={`url(#${gradientId})`} />
      ))}
      <text
        x="50" y="50" textAnchor="middle" dominantBaseline="central"
        fontFamily="Sora, sans-serif" fontWeight="700" fontSize="46" fill={`url(#${gradientId})`}
      >
        P
      </text>
    </svg>
  );
}

export function Wordmark({ inverted = false }) {
  return (
    <Link to="/" className="row wordmark" style={{ textDecoration: 'none', gap: '0.55rem' }}>
      <LogoMark size={30} />
      <span
        style={{
          fontFamily: 'var(--display)', fontWeight: 700, fontSize: '1.1rem',
          letterSpacing: '-0.02em', color: inverted ? '#fff' : 'var(--ink)',
        }}
      >
        Project<span style={{ color: 'var(--violet-600)' }}>Verse</span>
      </span>
    </Link>
  );
}

/* ------------------------------------ SIGNATURE: the approval orbit ---- */
const STAGES = ['draft', 'pending', 'approved'];
const STAGE_LABEL = { draft: 'Draft', pending: 'In review', approved: 'Live' };

/**
 * The three nodes an author actually walks: saved as a draft, sent to the
 * administrator, published. A rejected publication shows the middle node in
 * red because that is exactly where it stopped.
 */
export function StatusOrbit({ status, showLabel = true }) {
  const rejected = status === 'rejected';
  const archived = status === 'archived';
  const index = rejected ? 1 : STAGES.indexOf(status);

  return (
    <span className="orbit" title={`Status: ${STAGE_LABEL[status] || titleCase(status)}`}>
      <span className="orbit-track" aria-hidden="true">
        {STAGES.map((stage, i) => (
          <span key={stage} style={{ display: 'contents' }}>
            {i > 0 && <span className={`orbit-link ${i <= index ? 'reached' : ''}`} />}
            <span
              className={[
                'orbit-node',
                i < index ? 'reached' : '',
                i === index && rejected ? 'blocked' : '',
                i === index && !rejected ? (status === 'approved' ? 'reached' : 'current') : '',
              ].join(' ')}
            />
          </span>
        ))}
      </span>
      {showLabel && (
        <span
          className="orbit-label"
          style={{ color: rejected ? 'var(--stop)' : status === 'approved' ? 'var(--ok)' : 'var(--violet-700)' }}
        >
          {rejected ? 'Needs changes' : archived ? 'Archived' : STAGE_LABEL[status] || titleCase(status)}
        </span>
      )}
    </span>
  );
}

/* -------------------------------------------------------------- badges */
const STATUS_TONE = {
  draft: '', pending: 'badge-warn', approved: 'badge-ok', rejected: 'badge-stop',
  active: 'badge-ok', out_of_stock: 'badge-warn', archived: '',
  accepted: 'badge-ok', declined: 'badge-stop', withdrawn: '', granted: 'badge-ok',
  denied: 'badge-stop', paid: 'badge-ok', delivered: 'badge-ok', shipped: 'badge-violet',
  cancelled: 'badge-stop', verified: 'badge-ok', unverified: '', suspended: 'badge-stop',
};

export function StatusBadge({ status, label }) {
  return <span className={`badge ${STATUS_TONE[status] ?? ''}`}>{label || titleCase(status || '')}</span>;
}

export function PlanBadge({ plan }) {
  return plan === 'premium'
    ? <span className="badge badge-solid">Premium</span>
    : <span className="badge">Basic</span>;
}

export function Avatar({ name, url, large = false }) {
  if (url) {
    return (
      <img
        src={url} alt={name}
        className={`avatar ${large ? 'avatar-lg' : ''}`}
        style={{ objectFit: 'cover' }}
      />
    );
  }
  return <span className={`avatar ${large ? 'avatar-lg' : ''}`} aria-hidden="true">{initials(name)}</span>;
}

/* --------------------------------------------------------------- shell */
export function PageHead({ eyebrow, title, description, actions }) {
  return (
    <header className="page-head row-between" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 style={{ fontSize: 'var(--step-3)', marginTop: eyebrow ? '0.35rem' : 0 }}>{title}</h1>
        {description && <p className="muted" style={{ margin: '0.25rem 0 0', maxWidth: '62ch' }}>{description}</p>}
      </div>
      {actions && <div className="wrap-row">{actions}</div>}
    </header>
  );
}

export function Empty({ title, children, action }) {
  return (
    <div className="empty">
      <h4>{title}</h4>
      {children && <p className="muted" style={{ maxWidth: '46ch', margin: '0 auto 1rem' }}>{children}</p>}
      {action}
    </div>
  );
}

export function Loading({ rows = 3 }) {
  return (
    <div className="stack" style={{ '--gap': '0.6rem' }} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: i === 0 ? '2rem' : '4.5rem' }} />
      ))}
    </div>
  );
}

export function ErrorNote({ error, children }) {
  if (!error && !children) return null;
  return <div className="notice notice-error" role="alert">{children || error?.message}</div>;
}

/* --------------------------------------------------------------- modal */
export function Modal({ open, title, children, onClose, footer, width }) {
  const modalRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const focusable = () => [...modalRef.current.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')]
      .filter((el) => !el.disabled && el.tabIndex >= 0 && el.getClientRects().length);
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); closeRef.current?.(); }
      if (e.key !== 'Tab') return;
      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first) { e.preventDefault(); modalRef.current.focus(); }
      else if (e.shiftKey && (document.activeElement === first || !modalRef.current.contains(document.activeElement))) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !modalRef.current.contains(document.activeElement))) {
        e.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    (focusable()[0] || modalRef.current).focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div ref={modalRef} tabIndex={-1} className="modal" role="dialog" aria-modal="true" aria-label={title} style={width ? { width } : undefined}>
        <div className="modal-head row-between">
          <h3 style={{ fontSize: 'var(--step-2)', margin: 0 }}>{title}</h3>
          <button type="button" className="btn btn-quiet" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- forms */
export function Field({ label, hint, error, children, required }) {
  return (
    <label className="field">
      <span className="label">
        {label}
        {required && <span style={{ color: 'var(--magenta-500)' }}> *</span>}
      </span>
      {children}
      {hint && !error && <span className="hint">{hint}</span>}
      {error && <span className="error-text">{error}</span>}
    </label>
  );
}

export function Stat({ value, label, accent = false }) {
  return (
    <div className={`stat ${accent ? 'stat-accent' : ''}`}>
      <div className="stat-value mono">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

/* ---------------------------------------------------------- plan meter */
const METRIC_LABEL = {
  publication_full_view: 'Full publication views',
  saved_publication: 'Saved publications',
  outgoing_request: 'Collaboration & investment requests',
  meeting_request: 'Meeting requests',
  document_request: 'Document access requests',
};

export function UsageMeter({ metric, used, limit, unlimited }) {
  const pct = unlimited ? 0 : Math.min(100, limit ? (used / limit) * 100 : 100);
  return (
    <div className="meter">
      <div className="meter-head">
        <span>{METRIC_LABEL[metric] || titleCase(metric)}</span>
        <span className="mono muted">{unlimited ? 'Unlimited' : `${used} / ${limit}`}</span>
      </div>
      {!unlimited && (
        <div className="meter-bar">
          <div className={`meter-fill ${pct >= 100 ? 'full' : ''}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

/** Shown when the API answers 402 — the action is real, the plan is the blocker. */
export function UpgradePrompt({ message, compact = false }) {
  return (
    <div className={compact ? 'notice notice-info' : 'locked'}>
      {!compact && <div className="eyebrow">Premium</div>}
      <p style={{ margin: compact ? 0 : '0.5rem 0 1rem' }}>{message}</p>
      {!compact && (
        <Link className="btn btn-primary" to="/pricing">
          See Premium
        </Link>
      )}
      {compact && (
        <Link to="/pricing" style={{ fontWeight: 500 }}>
          Compare plans →
        </Link>
      )}
    </div>
  );
}

export function Pagination({ meta, onPage }) {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <nav className="row" style={{ justifyContent: 'center', marginTop: '2rem' }} aria-label="Pagination">
      <button className="btn btn-ghost btn-sm" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>
        Previous
      </button>
      <span className="mono small muted">
        {meta.page} of {meta.totalPages}
      </span>
      <button
        className="btn btn-ghost btn-sm"
        disabled={meta.page >= meta.totalPages}
        onClick={() => onPage(meta.page + 1)}
      >
        Next
      </button>
    </nav>
  );
}

export function Rating({ value, count }) {
  const rating = Math.min(5, Math.max(0, Number(value) || 0));
  const filled = Math.round(rating);
  return (
    <span className="row small" style={{ gap: '0.3rem' }}>
      <span style={{ color: 'var(--violet-600)', letterSpacing: '1px' }} aria-hidden="true">
        {'★'.repeat(filled)}
        <span style={{ color: 'var(--graphite-200)' }}>{'★'.repeat(5 - filled)}</span>
      </span>
      <span className="mono muted">
        {rating.toFixed(1)}
        {count != null && ` (${count})`}
      </span>
    </span>
  );
}
