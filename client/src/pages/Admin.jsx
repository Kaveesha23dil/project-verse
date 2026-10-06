import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { useAsync, useToast, money, num, dateTime, timeAgo, titleCase } from '../lib/store';
import { Empty, ErrorNote, Field, Loading, Modal, PageHead, Stat, StatusBadge } from '../components/UI';

/* ------------------------------------------------------------ moderation */
function ReviewModal({ item, kind, onClose, onDone }) {
  const toast = useToast();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [aiReview, setAiReview] = useState(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState(null);
  const aiRequest = useRef(0);

  useEffect(() => {
    setNote(''); setAiReview(null); setAiError(null); setAiBusy(false);
    aiRequest.current += 1;
    return () => { aiRequest.current += 1; };
  }, [item?.id, kind]);

  const requestAiReview = async () => {
    const id = ++aiRequest.current;
    setAiBusy(true); setAiError(null); setAiReview(null);
    try {
      const result = await api.post(`/admin/publications/${item.id}/ai-review`, {});
      if (id === aiRequest.current) setAiReview(result.data);
    } catch (err) {
      if (id === aiRequest.current) setAiError(err);
    } finally {
      if (id === aiRequest.current) setAiBusy(false);
    }
  };

  const decide = async (decision) => {
    if (decision === 'rejected' && note.trim().length < 5) {
      toast.error('Tell the owner what needs to change');
      return;
    }
    setBusy(true);
    try {
      const path = kind === 'publication'
        ? `/admin/publications/${item.id}/review`
        : `/admin/products/${item.id}/review`;
      await api.post(path, { decision, note: note || undefined });
      toast.ok(`${kind === 'publication' ? 'Publication' : 'Listing'} ${decision}`);
      onDone();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={!!item}
      onClose={onClose}
      title="Review submission"
      width="640px"
      footer={
        <>
          <button className="btn btn-danger" onClick={() => decide('rejected')} disabled={busy}>Reject</button>
          <button className="btn btn-primary" onClick={() => decide('approved')} disabled={busy}>Approve and publish</button>
        </>
      }
    >
      {item && (
        <>
          <h3 style={{ fontSize: 'var(--step-2)' }}>{item.title}</h3>
          <div className="wrap-row" style={{ margin: '0.5rem 0 1rem' }}>
            {kind === 'publication' ? (
              <>
                <span className="badge badge-violet">{titleCase(item.publication_type)}</span>
                {item.category_name && <span className="tag">{item.category_name}</span>}
                {item.university_name && <span className="badge">{item.university_name}</span>}
              </>
            ) : (
              <>
                <span className="badge badge-violet">{titleCase(item.product_type)}</span>
                <span className="tag">{item.category_name}</span>
                <span className="badge">{money(item.price, item.currency)}</span>
              </>
            )}
          </div>

          <p className="small muted">
            From {item.owner_name || item.seller_name} ({titleCase(item.owner_role || item.seller_role)}) ·
            submitted {timeAgo(item.submitted_at || item.created_at)}
          </p>

          <p style={{ whiteSpace: 'pre-wrap' }}>{item.abstract || item.short_description}</p>

          {item.technologies && (
            <p className="small muted"><strong>Technology:</strong> {item.technologies}</p>
          )}
          {item.keywords && <p className="small muted"><strong>Keywords:</strong> {item.keywords}</p>}
          {item.document_count > 0 && (
            <p className="small muted"><strong>Documents attached:</strong> {item.document_count}</p>
          )}

          {kind === 'publication' && (
            <section className="card" style={{ background: 'var(--violet-50)', borderColor: 'var(--violet-100)', marginBottom: '1rem' }} aria-label="AI Review Assistant" aria-busy={aiBusy}>
              <div className="row-between" style={{ marginBottom: '0.5rem' }}>
                <h4 style={{ margin: 0 }}>AI Review Assistant</h4>
                <button type="button" className="btn btn-primary btn-sm" disabled={aiBusy || busy} onClick={requestAiReview}>
                  {aiBusy ? 'Reviewing…' : aiReview ? 'Review again' : 'AI Review'}
                </button>
              </div>
              <p className="small muted" style={{ marginBottom: aiReview ? '1rem' : 0 }}>
                Reviews the title, abstract, keywords and category using AI. Attached documents are not read. You make the final decision.
              </p>
              <div aria-live="polite">
                {aiBusy && <p className="small" style={{ marginTop: '0.75rem' }}>Preparing a summary and suggested feedback…</p>}
                {aiError && <div style={{ marginTop: '0.75rem' }}><ErrorNote error={aiError} /></div>}
                {aiReview && (
                  <div className="stack" style={{ '--gap': '0.9rem' }}>
                    <div><strong>Summary</strong><p className="small" style={{ margin: '0.25rem 0 0' }}>{aiReview.summary}</p></div>
                    <div><strong>Missing or unclear information</strong>
                      {aiReview.missingInformation.length ? <ul className="small" style={{ paddingLeft: '1.25rem', marginBlock: '0.25rem' }}>{aiReview.missingInformation.map((text, i) => <li key={i}>{text}</li>)}</ul> : <p className="small" style={{ margin: '0.25rem 0 0' }}>No specific gaps identified in the supplied information.</p>}
                    </div>
                    <div><strong>Questions for the author</strong>
                      {aiReview.questions.length ? <ul className="small" style={{ paddingLeft: '1.25rem', marginBlock: '0.25rem' }}>{aiReview.questions.map((text, i) => <li key={i}>{text}</li>)}</ul> : <p className="small" style={{ margin: '0.25rem 0 0' }}>No additional questions suggested.</p>}
                    </div>
                    <div><strong>Suggested feedback</strong><p className="small" style={{ marginTop: '0.25rem', whiteSpace: 'pre-wrap' }}>{aiReview.suggestedFeedback}</p>
                      <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => {
                        if (note.trim()) { toast.error('Clear the existing note before applying suggested feedback.'); return; }
                        setNote(aiReview.suggestedFeedback);
                      }}>Use as note to owner</button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          <Field label="Note to the owner" hint="Required when rejecting. Say what to fix.">
            <textarea className="textarea" style={{ minHeight: 90 }} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </>
      )}
    </Modal>
  );
}

function Moderation() {
  const { data, loading, error, reload } = useAsync(() => api.get('/admin/moderation'), []);
  const [review, setReview] = useState(null);

  useEffect(() => {
    const refresh = () => { if (!document.hidden && !review) reload(); };
    const timer = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [reload, review]);

  if (loading) return <Loading rows={3} />;
  if (error) return <><ErrorNote error={error} /><button className="btn btn-ghost" onClick={reload}>Retry loading submissions</button></>;
  const pubs = data?.data?.publications || [];
  const products = data?.data?.products || [];

  if (!pubs.length && !products.length) {
    return <Empty title="The queue is clear" action={<button className="btn btn-ghost" onClick={reload}>Refresh submissions</button>}>Nothing is waiting for a decision. This queue checks for new submissions every 30 seconds.</Empty>;
  }

  return (
    <>
      <div className="wrap-row" style={{ justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button className="btn btn-ghost btn-sm" onClick={reload}>Refresh submissions</button>
      </div>
      {pubs.length > 0 && (
        <section style={{ marginBottom: '2rem' }}>
          <h3>Publications ({pubs.length})</h3>
          <div className="stack">
            {pubs.map((p) => (
              <div key={p.id} className="card row-between" style={{ alignItems: 'flex-start' }}>
                <div>
                  <div className="wrap-row" style={{ marginBottom: '0.35rem' }}>
                    <span className="badge badge-warn">Waiting {timeAgo(p.submitted_at)}</span>
                    <span className="badge badge-violet">{titleCase(p.publication_type)}</span>
                    {p.category_name && <span className="tag">{p.category_name}</span>}
                  </div>
                  <strong style={{ fontSize: 'var(--step-1)' }}>{p.title}</strong>
                  <div className="small muted">
                    {p.owner_name} · {titleCase(p.owner_role)}{p.university_name ? ` · ${p.university_name}` : ''}
                  </div>
                  <p className="small truncate-2" style={{ margin: '0.5rem 0 0', maxWidth: '70ch' }}>{p.abstract}</p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setReview({ item: p, kind: 'publication' })}>
                  Review
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {products.length > 0 && (
        <section>
          <h3>Marketplace listings ({products.length})</h3>
          <div className="stack">
            {products.map((p) => (
              <div key={p.id} className="card row-between" style={{ alignItems: 'flex-start' }}>
                <div>
                  <div className="wrap-row" style={{ marginBottom: '0.35rem' }}>
                    <span className="badge badge-warn">Waiting {timeAgo(p.created_at)}</span>
                    <span className="badge badge-violet">{titleCase(p.product_type)}</span>
                    <span className="badge">{money(p.price, p.currency)}</span>
                  </div>
                  <strong style={{ fontSize: 'var(--step-1)' }}>{p.title}</strong>
                  <div className="small muted">{p.seller_name} · {titleCase(p.seller_role)}</div>
                  <p className="small truncate-2" style={{ margin: '0.5rem 0 0', maxWidth: '70ch' }}>{p.short_description}</p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setReview({ item: p, kind: 'product' })}>
                  Review
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <ReviewModal
        item={review?.item}
        kind={review?.kind}
        onClose={() => setReview(null)}
        onDone={reload}
      />
    </>
  );
}

/* ----------------------------------------------------------------- users */
function Users() {
  const toast = useToast();
  const [filters, setFilters] = useState({ role: '', status: '', q: '' });
  const { data, loading, reload } = useAsync(
    () => api.get('/admin/users', filters),
    [filters.role, filters.status, filters.q]
  );

  const setStatus = async (id, accountStatus) => {
    const reason = accountStatus === 'suspended' ? window.prompt('Reason for suspending this account?') : undefined;
    if (accountStatus === 'suspended' && !reason) return;
    try {
      await api.patch(`/admin/users/${id}/status`, { accountStatus, reason });
      toast.ok(`Account ${accountStatus}`);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <div className="wrap-row" style={{ marginBottom: '1rem' }}>
        <input
          className="input" style={{ maxWidth: 260 }} placeholder="Search name or email"
          value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })}
        />
        <select className="select" style={{ width: 'auto' }} value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })}>
          <option value="">All roles</option>
          {['student', 'researcher', 'university', 'business', 'investor', 'admin'].map((r) => (
            <option key={r} value={r}>{titleCase(r)}</option>
          ))}
        </select>
        <select className="select" style={{ width: 'auto' }} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="deactivated">Deactivated</option>
        </select>
      </div>

      {loading ? <Loading rows={3} /> : (
        <div className="card table-wrap" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Role</th><th>Plan</th><th>Publications</th><th>Listings</th><th>Status</th><th>Joined</th><th /></tr>
            </thead>
            <tbody>
              {data?.data?.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.full_name}</strong>
                    <div className="small muted mono">{u.email}</div>
                    {u.university_name && <div className="small muted">{u.university_name}</div>}
                  </td>
                  <td className="small">{u.role_name}</td>
                  <td><StatusBadge status={u.plan_code} label={titleCase(u.plan_code)} /></td>
                  <td className="mono">{num(u.publication_count)}</td>
                  <td className="mono">{num(u.listing_count)}</td>
                  <td><StatusBadge status={u.account_status} /></td>
                  <td className="small muted">{timeAgo(u.created_at)}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {u.role_code !== 'admin' && (
                      u.account_status === 'active'
                        ? <button className="btn btn-danger btn-sm" onClick={() => setStatus(u.id, 'suspended')}>Suspend</button>
                        : <button className="btn btn-ghost btn-sm" onClick={() => setStatus(u.id, 'active')}>Restore</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------- overview */
function Overview() {
  const { data, loading } = useAsync(() => api.get('/admin/stats'), []);
  if (loading) return <Loading rows={3} />;
  const s = data?.data;
  if (!s) return null;

  return (
    <>
      <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
        <Stat value={num(s.users.total)} label="Accounts" accent />
        <Stat value={num(s.publications.approved)} label="Live publications" />
        <Stat value={num(s.publications.pending)} label="Waiting for review" />
        <Stat value={money(s.orders.gmv)} label="Marketplace volume" />
      </div>
      <div className="grid grid-4" style={{ marginBottom: '2rem' }}>
        <Stat value={num(s.subscriptions.premium || 0)} label="Premium accounts" accent />
        <Stat value={money(s.revenue.subscription_revenue)} label="Subscription revenue" />
        <Stat value={money(s.orders.fees)} label="Platform fees" />
        <Stat value={num(s.users.new_30d)} label="New in 30 days" />
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h4>Accounts by role</h4>
          <table className="table" style={{ marginTop: '0.6rem' }}>
            <tbody>
              {s.byRole.map((r) => (
                <tr key={r.code}>
                  <td>{r.name}</td>
                  <td className="mono" style={{ textAlign: 'right' }}>{num(r.n)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h4>Publications approved per month</h4>
          {s.trend.length ? (
            <div className="stack" style={{ '--gap': '0.6rem', marginTop: '0.8rem' }}>
              {s.trend.map((t) => {
                const max = Math.max(...s.trend.map((x) => x.n));
                return (
                  <div key={t.month}>
                    <div className="row-between small"><span className="mono">{t.month}</span><span className="mono">{t.n}</span></div>
                    <div className="meter-bar"><div className="meter-fill" style={{ width: `${(t.n / max) * 100}%` }} /></div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="muted small">Nothing approved in the last six months.</p>
          )}
        </div>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- logs */
function Logs() {
  const { data, loading } = useAsync(() => api.get('/admin/logs'), []);
  if (loading) return <Loading rows={3} />;
  const mod = data?.data?.moderation || [];
  const act = data?.data?.activity || [];

  return (
    <div className="grid grid-2">
      <div>
        <h3>Moderation decisions</h3>
        <div className="card table-wrap" style={{ padding: 0 }}>
          <table className="table">
            <thead><tr><th>Action</th><th>Entity</th><th>By</th><th>When</th></tr></thead>
            <tbody>
              {mod.map((m) => (
                <tr key={m.id}>
                  <td className="small">{m.action}{m.note ? <div className="small muted truncate-2">{m.note}</div> : null}</td>
                  <td className="small mono">{m.entity_type} #{m.entity_id}</td>
                  <td className="small">{m.actor_name || 'system'}</td>
                  <td className="small muted">{timeAgo(m.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <h3>Account activity</h3>
        <div className="card table-wrap" style={{ padding: 0 }}>
          <table className="table">
            <thead><tr><th>Action</th><th>User</th><th>When</th></tr></thead>
            <tbody>
              {act.map((a) => (
                <tr key={a.id}>
                  <td className="small mono">{a.action}</td>
                  <td className="small">{a.full_name || '—'}</td>
                  <td className="small muted">{timeAgo(a.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Projects() {
  const { data, loading, error, reload } = useAsync(() => api.get('/admin/projects'), []);
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState('');
  const [until, setUntil] = useState('');
  const [busy, setBusy] = useState(false);
  const open = (project, action) => { setSelected({ project, action }); setReason(''); setUntil(''); };
  const submit = async () => {
    if (reason.trim().length < 5) { toast.error('Provide a reason of at least 5 characters'); return; }
    if (selected.action === 'hide' && (!until || new Date(until) <= new Date())) { toast.error('Choose a future date and time'); return; }
    setBusy(true);
    try {
      const result = await api.post('/admin/projects/' + selected.project.id + '/manage', {
        action: selected.action, reason,
        ...(selected.action === 'hide' ? { until: new Date(until).toISOString() } : {}),
      });
      toast.ok(result.message); setSelected(null); reload();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };
  if (loading) return <Loading rows={3} />;
  if (error) return <><ErrorNote error={error} /><button className="btn btn-ghost" onClick={reload}>Retry</button></>;
  const projects = (data?.data || []).filter(p => (p.title + ' ' + p.owner_name).toLowerCase().includes(search.toLowerCase()));
  return <>
    <div className="row-between" style={{ marginBottom: '1rem' }}>
      <h3>Manage projects</h3><button className="btn btn-ghost btn-sm" onClick={reload}>Refresh</button>
    </div>
    <Field label="Search projects"><input className="input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Title or owner" /></Field>
    <p className="small muted">Hidden projects return automatically at the selected time. Deleting removes a project from the site.</p>
    <div className="stack">
      {!projects.length && <Empty title="No matching projects" />}
      {projects.map(p => <div className="card" key={p.id}>
        <div className="row-between">
          <div><h4>{p.title}</h4><p className="small muted">{p.owner_name}</p><StatusBadge status={p.status} />
            {p.is_hidden ? <p className="small">Hidden until {dateTime(p.hidden_until)}</p> : null}
          </div>
          <div className="wrap-row">
            <Link className="btn btn-ghost btn-sm" to={'/publications/' + p.slug}>View</Link>
            {p.status === 'approved' && <button className="btn btn-ghost btn-sm" onClick={() => open(p, 'hide')}>{p.is_hidden ? 'Change hide time' : 'Hide temporarily'}</button>}
            {p.is_hidden ? <button className="btn btn-ghost btn-sm" onClick={() => open(p, 'restore')}>Show now</button> : null}
            <button className="btn btn-danger btn-sm" onClick={() => open(p, 'delete')}>Delete</button>
          </div>
        </div>
      </div>)}
    </div>
    <Modal open={!!selected} onClose={() => { if (!busy) setSelected(null); }} title={selected?.action === 'delete' ? 'Delete project' : selected?.action === 'restore' ? 'Show project now' : 'Hide project temporarily'}
      footer={<><button className="btn btn-ghost" disabled={busy} onClick={() => setSelected(null)}>Cancel</button><button className={selected?.action === 'delete' ? 'btn btn-danger' : 'btn btn-primary'} disabled={busy} onClick={submit}>{busy ? 'Saving…' : selected?.action === 'delete' ? 'Confirm delete' : 'Confirm'}</button></>}>
      <h4>{selected?.project.title}</h4>
      {selected?.action === 'delete' && <p>This removes the project from public pages and the owner's project list. The database record is retained for audit purposes.</p>}
      {selected?.action === 'hide' && <Field label="Hide until" required hint="Your local date and time. The project returns automatically."><input className="input" type="datetime-local" value={until} onChange={e => setUntil(e.target.value)} /></Field>}
      <Field label="Reason" required hint="The owner will be notified."><textarea className="textarea" maxLength={600} value={reason} onChange={e => setReason(e.target.value)} /></Field>
    </Modal>
  </>;
}

const TABS = [
  ['moderation', 'Moderation queue'],
  ['projects', 'Projects'],
  ['overview', 'Overview'],
  ['users', 'Users'],
  ['logs', 'Audit log'],
];

export default function Admin() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'moderation';

  return (
    <div className="wrap">
      <PageHead
        eyebrow="Administration"
        title="Platform control"
        description="Nothing reaches the public catalogue without passing through this queue."
        actions={<Link className="btn btn-ghost" to="/dashboard">Dashboard</Link>}
      />
      <div className="tabs" role="tablist">
        {TABS.map(([key, label]) => (
          <button key={key} className="tab" role="tab" aria-selected={tab === key} onClick={() => setParams({ tab: key })}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'moderation' && <Moderation />}
      {tab === 'projects' && <Projects />}
      {tab === 'overview' && <Overview />}
      {tab === 'users' && <Users />}
      {tab === 'logs' && <Logs />}
    </div>
  );
}
