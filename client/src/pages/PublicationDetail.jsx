import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { ApiError } from '../lib/api';
import { useAuth, useToast, date, money, num, titleCase } from '../lib/store';
import {
  Avatar, Empty, Field, Loading, Modal, Rating, StatusOrbit, StatusBadge, UpgradePrompt,
} from '../components/UI';

function RequestModal({ open, onClose, publication, kind, onSent }) {
  const toast = useToast();
  const [form, setForm] = useState({ subject: '', message: '', amount: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const isInvestment = kind === 'investment';

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post('/requests/collaboration', {
        publicationId: publication.id,
        recipientId: publication.owner.id,
        requestType: kind,
        subject: form.subject,
        message: form.message,
        proposedAmount: isInvestment && form.amount ? Number(form.amount) : null,
      });
      toast.ok('Request sent');
      onSent?.();
      onClose();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isInvestment ? 'Send an investment request' : 'Send a collaboration request'}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" form="request-form" disabled={busy}>
            {busy ? 'Sending…' : 'Send request'}
          </button>
        </>
      }
    >
      {error?.isQuota ? (
        <UpgradePrompt message={error.message} />
      ) : (
        <form id="request-form" onSubmit={submit}>
          {error && <div className="notice notice-error" style={{ marginBottom: '1rem' }}>{error.message}</div>}
          <p className="small muted">
            Goes to {publication.owner.name} about “{publication.title}”.
          </p>
          <Field label="Subject" required>
            <input
              className="input" required minLength={5} value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder={isInvestment ? 'Seed funding for clinical validation' : 'Pilot with our engineering team'}
            />
          </Field>
          {isInvestment && (
            <Field label="Proposed amount (USD)" hint="Optional — leave blank to discuss first">
              <input
                className="input" type="number" min="0" step="100" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </Field>
          )}
          <Field label="Message" required hint="At least 20 characters. Say what you want to do and what you bring.">
            <textarea
              className="textarea" required minLength={20} value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </Field>
        </form>
      )}
    </Modal>
  );
}

function MeetingModal({ open, onClose, publication }) {
  const toast = useToast();
  const [form, setForm] = useState({ title: '', agenda: '', start: '', duration: 45, mode: 'online' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const start = new Date(form.start);
      const end = new Date(start.getTime() + Number(form.duration) * 60000);
      await api.post('/requests/meetings', {
        publicationId: publication.id,
        recipientId: publication.owner.id,
        title: form.title,
        agenda: form.agenda || null,
        meetingMode: form.mode,
        proposedStart: start.toISOString(),
        proposedEnd: end.toISOString(),
      });
      toast.ok('Meeting request sent');
      onClose();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Propose a meeting"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" form="meeting-form" disabled={busy}>
            {busy ? 'Sending…' : 'Send request'}
          </button>
        </>
      }
    >
      {error?.isQuota ? (
        <UpgradePrompt message={error.message} />
      ) : (
        <form id="meeting-form" onSubmit={submit}>
          {error && <div className="notice notice-error" style={{ marginBottom: '1rem' }}>{error.message}</div>}
          <Field label="Title" required>
            <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label="Agenda" hint="What you want to cover">
            <textarea className="textarea" style={{ minHeight: 90 }} value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} />
          </Field>
          <div className="grid grid-2" style={{ gap: '0 1rem' }}>
            <Field label="Start" required>
              <input
                className="input" type="datetime-local" required value={form.start}
                onChange={(e) => setForm({ ...form, start: e.target.value })}
              />
            </Field>
            <Field label="Length">
              <select className="select" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })}>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
              </select>
            </Field>
          </div>
          <Field label="Format">
            <select className="select" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
              <option value="online">Online</option>
              <option value="onsite">On site</option>
            </select>
          </Field>
        </form>
      )}
    </Modal>
  );
}

function DocumentModal({ open, onClose, publication, documentId }) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post(`/publications/${publication.id}/document-access`, { documentId, reason });
      toast.ok('Request sent to the owner');
      onClose();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Request the documents"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" form="doc-form" disabled={busy}>
            {busy ? 'Sending…' : 'Send request'}
          </button>
        </>
      }
    >
      {error?.isQuota ? (
        <UpgradePrompt message={error.message} />
      ) : (
        <form id="doc-form" onSubmit={submit}>
          {error && <div className="notice notice-error" style={{ marginBottom: '1rem' }}>{error.message}</div>}
          <Field label="Why do you need them?" required hint="The owner reads this before deciding. At least 15 characters.">
            <textarea className="textarea" required minLength={15} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </form>
      )}
    </Modal>
  );
}

export default function PublicationDetail() {
  const { slug } = useParams();
  const { user, isPremium } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [state, setState] = useState({ loading: true, data: null, access: null, gate: null });
  const [modal, setModal] = useState(null);
  const [docId, setDocId] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const res = await api.get(`/publications/${slug}`);
      setState({ loading: false, data: res.data, access: res.access, gate: null });
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        setState({ loading: false, data: err.payload.data, access: err.payload.access, gate: err.message });
      } else {
        setState({ loading: false, data: null, access: null, gate: null, error: err });
      }
    }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  const toggleSave = async () => {
    try {
      if (state.data.isSaved) {
        await api.del(`/publications/${state.data.id}/save`);
        toast.toast('Removed from saved');
      } else {
        await api.post(`/publications/${state.data.id}/save`, {});
        toast.ok('Saved');
      }
      load();
    } catch (err) {
      if (err.isQuota) toast.error(err.message);
      else toast.error(err.message);
    }
  };

  const submitFeedback = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/publications/${state.data.id}/feedback`, { rating, comment: comment || undefined });
      toast.ok('Feedback posted');
      setComment('');
      setRating(0);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (state.loading) return <div className="wrap"><Loading rows={5} /></div>;
  if (!state.data) {
    return (
      <div className="wrap-narrow">
        <Empty title="That publication is not available" action={<Link className="btn btn-primary" to="/explore">Browse publications</Link>}>
          It may have been removed, or it may still be waiting for approval.
        </Empty>
      </div>
    );
  }

  const p = state.data;
  const full = state.access?.level === 'full';
  const isOwner = p.isOwner;
  const canRequest = user && !isOwner && ['business', 'investor', 'researcher', 'student', 'university'].includes(user.role_code);

  return (
    <div className="wrap">
      <div className="split-wide">
        <article>
          <div className="wrap-row" style={{ marginBottom: '0.9rem' }}>
            <span className="badge badge-violet">{titleCase(p.publicationType)}</span>
            {p.categoryName && <span className="tag">{p.categoryName}</span>}
            {p.status !== 'approved' && <StatusOrbit status={p.status} />}
          </div>

          <h1 style={{ fontSize: 'var(--step-3)' }}>{p.title}</h1>

          <div className="row wrap-row" style={{ margin: '1rem 0 1.5rem' }}>
            <Avatar name={p.owner.name} url={p.owner.avatarUrl} />
            <div>
              <Link to={`/users/${p.owner.id}`} style={{ fontWeight: 500, color: 'var(--ink)' }}>{p.owner.name}</Link>
              <div className="small muted">
                {titleCase(p.owner.role)}
                {p.universityName ? ` · ${p.universityName}` : ''}
                {p.publishedAt ? ` · published ${date(p.publishedAt)}` : ''}
              </div>
            </div>
          </div>

          {p.status === 'rejected' && p.rejectionReason && (
            <div className="notice notice-error" style={{ marginBottom: '1.5rem' }}>
              <strong>Not approved.</strong> {p.rejectionReason}
            </div>
          )}

          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="eyebrow">Abstract</div>
            <p style={{ margin: '0.6rem 0 0', fontSize: 'var(--step-1)' }}>{p.abstract}</p>
          </div>

          {!full && (
            <div className="locked" style={{ marginBottom: '1.5rem' }}>
              <div className="eyebrow">
                {state.access?.reason === 'sign_in_required' ? 'Sign in' : 'Monthly limit reached'}
              </div>
              <h3 style={{ marginTop: '0.6rem' }}>
                {state.access?.reason === 'sign_in_required'
                  ? 'Sign in to read the full record'
                  : 'You have opened 20 publications this month'}
              </h3>
              <p className="muted" style={{ maxWidth: '48ch', margin: '0 auto 1.2rem' }}>
                {state.gate || 'Create a free account to read full descriptions, methodology, results and documents.'}
              </p>
              <div className="wrap-row" style={{ justifyContent: 'center' }}>
                {user ? (
                  <Link className="btn btn-primary" to="/pricing">See Premium</Link>
                ) : (
                  <>
                    <Link className="btn btn-primary" to="/register">Create a free account</Link>
                    <Link className="btn btn-ghost" to="/signin">Sign in</Link>
                  </>
                )}
              </div>
            </div>
          )}

          {full && (
            <>
              {p.description && (
                <section className="stack" style={{ marginBottom: '1.5rem' }}>
                  <h3>Description</h3>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{p.description}</p>
                </section>
              )}
              {p.methodology && (
                <section className="stack" style={{ marginBottom: '1.5rem' }}>
                  <h3>Methodology</h3>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{p.methodology}</p>
                </section>
              )}
              {p.results && (
                <section className="stack" style={{ marginBottom: '1.5rem' }}>
                  <h3>Results</h3>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{p.results}</p>
                </section>
              )}

              {p.documents?.length > 0 && (
                <section style={{ marginBottom: '1.5rem' }}>
                  <h3>Documents</h3>
                  <div className="stack" style={{ '--gap': '0.6rem' }}>
                    {p.documents.map((d) => (
                      <div key={d.id} className="card row-between" style={{ padding: '0.9rem 1.1rem' }}>
                        <div>
                          <strong>{d.file_name}</strong>
                          <div className="small muted mono">
                            {titleCase(d.doc_type)} · {d.file_size_kb ? `${Math.round(d.file_size_kb / 1024 * 10) / 10} MB` : '—'}
                          </div>
                        </div>
                        {d.downloadable ? (
                          <a className="btn btn-ghost btn-sm" href={d.file_url || '#'}>Download</a>
                        ) : isPremium ? (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => { setDocId(d.id); setModal('document'); }}
                          >
                            Request access
                          </button>
                        ) : (
                          <Link className="btn btn-ghost btn-sm" to="/pricing">Premium to request</Link>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {/* feedback */}
          <section style={{ marginTop: '2.5rem' }}>
            <h3>Feedback</h3>
            {user && !isOwner && (
              <form onSubmit={submitFeedback} className="card" style={{ marginBottom: '1rem' }}>
                <div className="row" style={{ marginBottom: '0.6rem' }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n} type="button"
                      onClick={() => setRating(n)}
                      className="btn btn-quiet btn-sm"
                      aria-label={`${n} out of 5`}
                      style={{ color: n <= rating ? 'var(--violet-600)' : 'var(--graphite-200)', fontSize: '1.3rem', padding: '0 0.15rem' }}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <textarea
                  className="textarea" style={{ minHeight: 80 }} value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="What stood out, and what would you want to see next?"
                />
                <button className="btn btn-primary btn-sm" style={{ marginTop: '0.6rem' }} disabled={!rating}>
                  Post feedback
                </button>
              </form>
            )}
            {p.feedback?.length ? (
              <div className="stack">
                {p.feedback.map((f, i) => (
                  <div key={i} className="card">
                    <div className="row-between">
                      <div className="row">
                        <Avatar name={f.full_name} url={f.avatar_url} />
                        <strong>{f.full_name}</strong>
                      </div>
                      <Rating value={f.rating} />
                    </div>
                    {f.comment && <p style={{ margin: '0.7rem 0 0' }}>{f.comment}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted small">No feedback yet.</p>
            )}
          </section>
        </article>

        {/* ------------------------------------------------------ sidebar */}
        <aside className="sidebar stack">
          <div className="card">
            {isOwner ? (
              <>
                <div className="eyebrow">Your publication</div>
                <div style={{ margin: '0.8rem 0' }}><StatusOrbit status={p.status} /></div>
                {['draft', 'rejected'].includes(p.status) && (
                  <Link className="btn btn-primary btn-block" to={`/publications/${p.id}/edit`}>Edit and publish</Link>
                )}
                <div className="grid grid-2" style={{ marginTop: '1rem', gap: '0.6rem' }}>
                  <div><div className="stat-value mono" style={{ fontSize: 'var(--step-2)' }}>{num(p.viewCount)}</div><div className="stat-label">views</div></div>
                  <div><div className="stat-value mono" style={{ fontSize: 'var(--step-2)' }}>{num(p.saveCount)}</div><div className="stat-label">saves</div></div>
                </div>
              </>
            ) : (
              <>
                <div className="eyebrow">Get involved</div>
                <div className="stack" style={{ '--gap': '0.6rem', marginTop: '0.8rem' }}>
                  <button className="btn btn-ghost btn-block" onClick={toggleSave} disabled={!user}>
                    {p.isSaved ? 'Saved ✓' : 'Save publication'}
                  </button>
                  {p.openToCollaboration && (
                    <button
                      className="btn btn-primary btn-block"
                      disabled={!canRequest}
                      onClick={() => setModal('collaboration')}
                    >
                      Request collaboration
                    </button>
                  )}
                  {p.openToInvestment && (
                    <button
                      className="btn btn-ghost btn-block"
                      disabled={!canRequest}
                      onClick={() => setModal('investment')}
                    >
                      Offer investment
                    </button>
                  )}
                  {isPremium ? (
                    <button className="btn btn-ghost btn-block" onClick={() => setModal('meeting')}>
                      Propose a meeting
                    </button>
                  ) : (
                    <Link className="btn btn-ghost btn-block" to="/pricing">
                      Meetings — Premium
                    </Link>
                  )}
                </div>
                {!user && <p className="small muted" style={{ marginTop: '0.8rem', marginBottom: 0 }}>Sign in to save or send a request.</p>}
              </>
            )}
          </div>

          {p.fundingRequired ? (
            <div className="card card-accent">
              <div className="eyebrow">Funding sought</div>
              <div className="price" style={{ marginTop: '0.4rem' }}>{money(p.fundingRequired, p.fundingCurrency || 'USD')}</div>
            </div>
          ) : null}

          <div className="card">
            <div className="eyebrow">Details</div>
            <table className="table" style={{ marginTop: '0.6rem' }}>
              <tbody>
                <tr><td className="muted small">Type</td><td>{titleCase(p.publicationType)}</td></tr>
                {p.categoryName && <tr><td className="muted small">Category</td><td>{p.categoryName}</td></tr>}
                {p.universityName && <tr><td className="muted small">University</td><td>{p.universityName}</td></tr>}
                {full && p.academicYear && <tr><td className="muted small">Year</td><td className="mono">{p.academicYear}</td></tr>}
                <tr><td className="muted small">Rating</td><td><Rating value={p.ratingAvg} count={p.ratingCount} /></td></tr>
              </tbody>
            </table>
          </div>

          {p.technologies?.length > 0 && (
            <div className="card">
              <div className="eyebrow">Technology</div>
              <div className="wrap-row" style={{ marginTop: '0.6rem' }}>
                {p.technologies.map((t) => (
                  <Link key={t.id} className="tag" to={`/explore?technology=${t.slug}`}>{t.name}</Link>
                ))}
              </div>
            </div>
          )}

          {p.authors?.length > 0 && (
            <div className="card">
              <div className="eyebrow">Authors</div>
              <div className="stack" style={{ '--gap': '0.5rem', marginTop: '0.6rem' }}>
                {p.authors.map((a, i) => (
                  <div key={i} className="row-between small">
                    <span>{a.display_name}</span>
                    <StatusBadge status={a.author_role} label={titleCase(a.author_role)} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      <RequestModal
        open={modal === 'collaboration' || modal === 'investment'}
        kind={modal === 'investment' ? 'investment' : 'collaboration'}
        publication={p}
        onClose={() => setModal(null)}
        onSent={load}
      />
      <MeetingModal open={modal === 'meeting'} publication={p} onClose={() => setModal(null)} />
      <DocumentModal open={modal === 'document'} publication={p} documentId={docId} onClose={() => setModal(null)} />
    </div>
  );
}
