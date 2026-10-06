import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { useAsync, useAuth, useToast, money, dateTime, timeAgo, titleCase } from '../lib/store';
import { Avatar, Empty, Loading, Modal, PageHead, StatusBadge, Field } from '../components/UI';

function RespondModal({ request, onClose, onDone }) {
  const toast = useToast();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const respond = async (status) => {
    setBusy(true);
    try {
      await api.patch(`/requests/collaboration/${request.id}`, { status, responseNote: note || undefined });
      toast.ok(`Request ${status}`);
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
      open={!!request}
      onClose={onClose}
      title={request?.subject}
      footer={
        <>
          <button className="btn btn-ghost" onClick={() => respond('declined')} disabled={busy}>Decline</button>
          <button className="btn btn-primary" onClick={() => respond('accepted')} disabled={busy}>
            Accept and open a thread
          </button>
        </>
      }
    >
      {request && (
        <>
          <div className="row" style={{ marginBottom: '1rem' }}>
            <Avatar name={request.requester_name} url={request.requester_avatar} />
            <div>
              <strong>{request.requester_name}</strong>
              <div className="small muted">
                {titleCase(request.requester_role)}{request.requester_org ? ` · ${request.requester_org}` : ''}
              </div>
            </div>
          </div>
          {request.publication_title && (
            <p className="small muted">About: <Link to={`/publications/${request.publication_slug}`}>{request.publication_title}</Link></p>
          )}
          {request.proposed_amount ? (
            <div className="card card-accent" style={{ marginBottom: '1rem' }}>
              <div className="eyebrow">Proposed</div>
              <div className="price">{money(request.proposed_amount, request.currency)}</div>
            </div>
          ) : null}
          <p style={{ whiteSpace: 'pre-wrap' }}>{request.message}</p>
          <Field label="Your reply" hint="Sent with your decision">
            <textarea className="textarea" style={{ minHeight: 90 }} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </>
      )}
    </Modal>
  );
}

function Inbox() {
  const { data, loading, reload } = useAsync(() => api.get('/requests/inbox'), []);
  const [active, setActive] = useState(null);

  if (loading) return <Loading rows={3} />;
  const rows = data?.data || [];
  if (!rows.length) {
    return <Empty title="No requests yet">When someone wants to collaborate on or fund your work, it lands here.</Empty>;
  }

  return (
    <>
      <div className="stack">
        {rows.map((r) => (
          <div key={r.id} className="card row-between" style={{ alignItems: 'flex-start' }}>
            <div className="row" style={{ alignItems: 'flex-start', gap: '0.9rem' }}>
              <Avatar name={r.requester_name} url={r.requester_avatar} />
              <div>
                <div className="wrap-row" style={{ marginBottom: '0.3rem' }}>
                  <span className="badge badge-violet">{titleCase(r.request_type)}</span>
                  <StatusBadge status={r.status} />
                  <span className="small mono muted">{timeAgo(r.created_at)}</span>
                </div>
                <strong>{r.subject}</strong>
                <div className="small muted">
                  {r.requester_name}{r.requester_org ? ` · ${r.requester_org}` : ''}
                  {r.publication_title ? ` — ${r.publication_title}` : ''}
                </div>
                <p className="small truncate-2" style={{ margin: '0.5rem 0 0', maxWidth: '60ch' }}>{r.message}</p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {r.proposed_amount ? <div className="price" style={{ fontSize: 'var(--step-1)' }}>{money(r.proposed_amount)}</div> : null}
              {r.status === 'pending' ? (
                <button className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }} onClick={() => setActive(r)}>
                  Respond
                </button>
              ) : (
                r.response_note && <div className="small muted" style={{ maxWidth: 220 }}>{r.response_note}</div>
              )}
            </div>
          </div>
        ))}
      </div>
      <RespondModal request={active} onClose={() => setActive(null)} onDone={reload} />
    </>
  );
}

function Sent() {
  const { data, loading } = useAsync(() => api.get('/requests/sent'), []);
  if (loading) return <Loading rows={3} />;
  const rows = data?.data || [];
  if (!rows.length) {
    return (
      <Empty title="You have not sent any requests" action={<Link className="btn btn-primary" to="/explore">Find a project</Link>}>
        Open a publication and send a collaboration or investment request to its owner.
      </Empty>
    );
  }
  return (
    <div className="card table-wrap" style={{ padding: 0 }}>
      <table className="table">
        <thead><tr><th>Subject</th><th>To</th><th>Type</th><th>Amount</th><th>Status</th><th>Sent</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <strong>{r.subject}</strong>
                {r.publication_title && (
                  <div className="small muted">
                    <Link to={`/publications/${r.publication_slug}`}>{r.publication_title}</Link>
                  </div>
                )}
                {r.response_note && <div className="small muted">Reply: {r.response_note}</div>}
              </td>
              <td>{r.recipient_name}</td>
              <td className="small">{titleCase(r.request_type)}</td>
              <td className="mono">{r.proposed_amount ? money(r.proposed_amount) : '—'}</td>
              <td><StatusBadge status={r.status} /></td>
              <td className="small muted">{timeAgo(r.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Meetings() {
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, reload } = useAsync(() => api.get('/requests/meetings'), []);

  const respond = async (id, status) => {
    try {
      await api.patch(`/requests/meetings/${id}`, { status });
      toast.ok(`Meeting ${status}`);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <Loading rows={2} />;
  const rows = data?.data || [];
  if (!rows.length) {
    return (
      <Empty title="No meetings scheduled">
        {user.plan_code === 'premium'
          ? 'Open a publication and propose a time with its owner.'
          : 'Scheduling meetings with project owners is a Premium feature.'}
      </Empty>
    );
  }

  return (
    <div className="stack">
      {rows.map((m) => (
        <div key={m.id} className="card row-between">
          <div>
            <div className="wrap-row" style={{ marginBottom: '0.3rem' }}>
              <StatusBadge status={m.status} />
              <span className="badge">{titleCase(m.meeting_mode)}</span>
              <span className="small mono muted">{m.direction === 'sent' ? 'you proposed' : 'proposed to you'}</span>
            </div>
            <strong>{m.title}</strong>
            <div className="small muted">
              {m.direction === 'sent' ? `With ${m.recipient_name}` : `From ${m.requester_name}`}
              {m.publication_title ? ` · ${m.publication_title}` : ''}
            </div>
            <div className="small mono">{dateTime(m.proposed_start)}</div>
            {m.agenda && <p className="small muted" style={{ margin: '0.4rem 0 0' }}>{m.agenda}</p>}
          </div>
          <div className="stack" style={{ '--gap': '0.4rem', textAlign: 'right' }}>
            {m.status === 'pending' && m.direction === 'received' && (
              <>
                <button className="btn btn-primary btn-sm" onClick={() => respond(m.id, 'accepted')}>Accept</button>
                <button className="btn btn-ghost btn-sm" onClick={() => respond(m.id, 'declined')}>Decline</button>
              </>
            )}
            {m.status === 'accepted' && m.meeting_link && (
              <a className="btn btn-ghost btn-sm" href={m.meeting_link} target="_blank" rel="noreferrer">Join link</a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Documents() {
  const toast = useToast();
  const { data, loading, reload } = useAsync(() => api.get('/requests/documents'), []);

  const decide = async (id, status) => {
    try {
      await api.patch(`/requests/documents/${id}`, { status, days: 30 });
      toast.ok(`Access ${status}`);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <Loading rows={2} />;
  const rows = data?.data || [];
  if (!rows.length) return <Empty title="No document requests">Requests to read your project files appear here.</Empty>;

  return (
    <div className="stack">
      {rows.map((d) => (
        <div key={d.id} className="card row-between" style={{ alignItems: 'flex-start' }}>
          <div>
            <div className="wrap-row" style={{ marginBottom: '0.3rem' }}>
              <StatusBadge status={d.status} />
              <span className="small mono muted">{d.direction === 'received' ? 'asked of you' : 'you asked'}</span>
            </div>
            <strong>{d.file_name || 'All project documents'}</strong>
            <div className="small muted">
              <Link to={`/publications/${d.publication_slug}`}>{d.publication_title}</Link>
              {d.direction === 'received' ? ` · ${d.requester_name}` : ''}
            </div>
            <p className="small" style={{ margin: '0.5rem 0 0', maxWidth: '60ch' }}>{d.reason}</p>
          </div>
          {d.direction === 'received' && d.status === 'pending' && (
            <div className="stack" style={{ '--gap': '0.4rem' }}>
              <button className="btn btn-primary btn-sm" onClick={() => decide(d.id, 'granted')}>Grant for 30 days</button>
              <button className="btn btn-ghost btn-sm" onClick={() => decide(d.id, 'denied')}>Deny</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Threads() {
  const { user } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const openId = params.get('thread');

  const { data, loading, reload } = useAsync(() => api.get('/requests/threads'), []);
  const [messages, setMessages] = useState(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  const threads = data?.data || [];
  const active = threads.find((t) => String(t.id) === String(openId));

  useEffect(() => {
    if (!openId) { setMessages(null); return; }
    setMessages(null);
    api.get(`/requests/threads/${openId}`)
      .then((r) => setMessages(r.data))
      .catch((err) => toast.error(err.message));
  }, [openId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    setSending(true);
    try {
      await api.post(`/requests/threads/${openId}`, { body: draft.trim() });
      const r = await api.get(`/requests/threads/${openId}`);
      setMessages(r.data);
      setDraft('');
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <Loading rows={3} />;
  if (!threads.length) {
    return (
      <Empty title="No conversations yet">
        Accepting a collaboration or investment request opens a private thread with the other party. It appears here.
      </Empty>
    );
  }

  return (
    <div className="split" style={{ '--split-columns': '300px minmax(0, 1fr)' }}>
      <aside className="stack" style={{ '--gap': '0.5rem' }}>
        {threads.map((t) => (
          <button
            key={t.id}
            className="card card-hover"
            style={{
              textAlign: 'left', cursor: 'pointer', padding: '0.85rem',
              borderColor: String(t.id) === String(openId) ? 'var(--violet-600)' : undefined,
            }}
            onClick={() => setParams({ tab: 'threads', thread: String(t.id) })}
          >
            <div className="row" style={{ gap: '0.6rem' }}>
              <Avatar name={t.other_name} url={t.other_avatar} />
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="row-between" style={{ gap: '0.4rem' }}>
                  <strong className="truncate-2" style={{ fontSize: 'var(--step-0)' }}>{t.other_name}</strong>
                  {t.unread > 0 && <span className="badge badge-solid mono">{t.unread}</span>}
                </div>
                <div className="small muted truncate-2">{t.subject}</div>
              </div>
            </div>
            {t.last_body && <p className="small muted truncate-2" style={{ margin: '0.5rem 0 0' }}>{t.last_body}</p>}
            <div className="small mono muted" style={{ marginTop: '0.3rem' }}>{timeAgo(t.last_message_at)}</div>
          </button>
        ))}
      </aside>

      <div>
        {!active ? (
          <Empty title="Pick a conversation">Choose a thread on the left to read it and reply.</Empty>
        ) : (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 460 }}>
            <div className="row-between" style={{ borderBottom: 'var(--edge)', paddingBottom: '0.8rem' }}>
              <div className="row">
                <Avatar name={active.other_name} url={active.other_avatar} />
                <div>
                  <strong>{active.other_name}</strong>
                  <div className="small muted">
                    {titleCase(active.other_role)}
                    {active.publication_title ? ' · ' : ''}
                    {active.publication_slug && (
                      <Link to={`/publications/${active.publication_slug}`}>{active.publication_title}</Link>
                    )}
                  </div>
                </div>
              </div>
              <span className="badge">{active.subject}</span>
            </div>

            <div className="grow stack" style={{ '--gap': '0.8rem', padding: '1rem 0', overflowY: 'auto', maxHeight: 380 }}>
              {messages === null && <Loading rows={2} />}
              {messages?.map((m) => {
                const mine = m.sender_id === user.id;
                return (
                  <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                    <div
                      style={{
                        maxWidth: '78%', padding: '0.65rem 0.9rem', borderRadius: 'var(--radius)',
                        background: mine ? 'var(--violet-600)' : 'var(--graphite-100)',
                        color: mine ? '#fff' : 'var(--graphite-800)',
                      }}
                    >
                      <div style={{ whiteSpace: 'pre-wrap' }}>{m.body}</div>
                      <div
                        className="small mono"
                        style={{ opacity: 0.7, marginTop: '0.3rem', color: mine ? '#fff' : 'var(--graphite-500)' }}
                      >
                        {mine ? 'You' : m.sender_name} · {timeAgo(m.sent_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            <form onSubmit={send} className="row" style={{ borderTop: 'var(--edge)', paddingTop: '0.9rem' }}>
              <input
                className="input grow"
                placeholder="Write a reply"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                aria-label="Message"
              />
              <button className="btn btn-primary" disabled={sending || !draft.trim()}>
                {sending ? 'Sending…' : 'Send'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

const TABS = [
  ['inbox', 'Received'],
  ['sent', 'Sent'],
  ['threads', 'Messages'],
  ['meetings', 'Meetings'],
  ['documents', 'Documents'],
];

export default function Requests() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'inbox';

  if (user?.role_code === 'admin') return <Navigate to="/admin?tab=moderation" replace />;

  return (
    <div className="wrap">
      <PageHead
        eyebrow="Connections"
        title="Requests"
        description="Collaboration and investment requests, meeting proposals and document access — in one place."
      />
      <div className="tabs" role="tablist">
        {TABS.map(([key, label]) => (
          <button
            key={key} className="tab" role="tab" aria-selected={tab === key}
            onClick={() => setParams({ tab: key })}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'inbox' && <Inbox />}
      {tab === 'sent' && <Sent />}
      {tab === 'threads' && <Threads />}
      {tab === 'meetings' && <Meetings />}
      {tab === 'documents' && <Documents />}
    </div>
  );
}
