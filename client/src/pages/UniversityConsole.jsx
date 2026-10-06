import { useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useAsync, useToast, money, num, timeAgo, titleCase } from '../lib/store';
import { Empty, Loading, PageHead, Stat, StatusBadge } from '../components/UI';

function Verifications() {
  const toast = useToast();
  const { data, loading, reload } = useAsync(() => api.get('/university/verifications'), []);

  const decide = async (id, decision) => {
    const note = decision === 'rejected' ? window.prompt('What was missing? The member sees this.') : undefined;
    if (decision === 'rejected' && !note) return;
    try {
      await api.post(`/university/verifications/${id}`, { decision, note });
      toast.ok(`Member ${decision}`);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <Loading rows={3} />;
  const rows = data?.data || [];
  const pending = rows.filter((r) => r.status === 'pending');
  const done = rows.filter((r) => r.status !== 'pending');

  return (
    <>
      <h3>Waiting ({pending.length})</h3>
      {pending.length === 0 ? (
        <Empty title="Everyone is verified">New students and researchers appear here when they register with your institution.</Empty>
      ) : (
        <div className="stack" style={{ marginBottom: '2rem' }}>
          {pending.map((v) => (
            <div key={v.id} className="card row-between" style={{ alignItems: 'flex-start' }}>
              <div>
                <div className="wrap-row" style={{ marginBottom: '0.3rem' }}>
                  <span className="badge badge-violet">{titleCase(v.role_code)}</span>
                  <span className="small mono muted">registered {timeAgo(v.registered_at)}</span>
                </div>
                <strong style={{ fontSize: 'var(--step-1)' }}>{v.full_name}</strong>
                <div className="small muted mono">{v.email}</div>
                <div className="small muted">
                  {v.student_number && `Student number ${v.student_number} · `}
                  {v.degree_program || v.designation || ''}
                  {v.faculty || v.department ? ` · ${v.faculty || v.department}` : ''}
                </div>
                {v.evidence_url && (
                  <a className="small" href={v.evidence_url} target="_blank" rel="noreferrer">View submitted evidence</a>
                )}
              </div>
              <div className="stack" style={{ '--gap': '0.4rem' }}>
                <button className="btn btn-primary btn-sm" onClick={() => decide(v.id, 'approved')}>Verify</button>
                <button className="btn btn-ghost btn-sm" onClick={() => decide(v.id, 'rejected')}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {done.length > 0 && (
        <>
          <h3>Decided</h3>
          <div className="card table-wrap" style={{ padding: 0 }}>
            <table className="table">
              <thead><tr><th>Member</th><th>Role</th><th>Decision</th><th>When</th></tr></thead>
              <tbody>
                {done.map((v) => (
                  <tr key={v.id}>
                    <td><strong>{v.full_name}</strong><div className="small muted mono">{v.email}</div></td>
                    <td className="small">{titleCase(v.role_code)}</td>
                    <td><StatusBadge status={v.status === 'approved' ? 'verified' : 'declined'} /></td>
                    <td className="small muted">{timeAgo(v.reviewed_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

function Projects() {
  const toast = useToast();
  const { data, loading, reload } = useAsync(() => api.get('/university/publications'), []);

  const feature = async (id) => {
    try {
      const res = await api.post(`/university/publications/${id}/feature`, {});
      toast.ok(res.message);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <Loading rows={3} />;
  const rows = data?.data || [];
  if (!rows.length) return <Empty title="No projects yet">Work published by your members appears here.</Empty>;

  return (
    <div className="card table-wrap" style={{ padding: 0 }}>
      <table className="table">
        <thead><tr><th>Publication</th><th>Owner</th><th>Status</th><th>Views</th><th>Requests</th><th /></tr></thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id}>
              <td>
                <Link to={`/publications/${p.slug}`} style={{ fontWeight: 500, color: 'var(--ink)' }}>{p.title}</Link>
                <div className="small muted">{titleCase(p.publication_type)}{p.category_name ? ` · ${p.category_name}` : ''}</div>
              </td>
              <td className="small">{p.owner_name}<div className="small muted">{titleCase(p.owner_role)}</div></td>
              <td><StatusBadge status={p.status} /></td>
              <td className="mono">{num(p.view_count)}</td>
              <td className="mono">{num(p.request_count)}</td>
              <td style={{ textAlign: 'right' }}>
                {p.status === 'approved' && (
                  <button className="btn btn-ghost btn-sm" onClick={() => feature(p.id)}>
                    {p.is_featured ? 'Unfeature' : 'Promote'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Members() {
  const { data, loading } = useAsync(() => api.get('/university/members'), []);
  if (loading) return <Loading rows={3} />;
  const rows = data?.data || [];
  if (!rows.length) return <Empty title="No members yet" />;

  return (
    <div className="card table-wrap" style={{ padding: 0 }}>
      <table className="table">
        <thead><tr><th>Member</th><th>Role</th><th>Programme / field</th><th>Live publications</th><th>Verification</th></tr></thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.id}>
              <td><strong>{m.full_name}</strong><div className="small muted mono">{m.email}</div></td>
              <td className="small">{titleCase(m.role_code)}</td>
              <td className="small">{m.degree_program || m.research_field || '—'}</td>
              <td className="mono">{num(m.approved_publications)}</td>
              <td><StatusBadge status={m.verification_status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Collaborations() {
  const { data, loading } = useAsync(() => api.get('/university/collaborations'), []);
  if (loading) return <Loading rows={3} />;
  const rows = data?.data || [];
  if (!rows.length) {
    return <Empty title="No collaborations yet">Requests sent to your members about their published work show up here.</Empty>;
  }
  return (
    <div className="card table-wrap" style={{ padding: 0 }}>
      <table className="table">
        <thead><tr><th>Subject</th><th>Member</th><th>Partner</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id}>
              <td>
                <strong>{c.subject}</strong>
                <div className="small muted"><Link to={`/publications/${c.publication_slug}`}>{c.publication_title}</Link></div>
              </td>
              <td className="small">{c.member_name}</td>
              <td className="small">{c.partner_name}<div className="small muted">{c.partner_org || titleCase(c.partner_role)}</div></td>
              <td className="small">{titleCase(c.request_type)}</td>
              <td className="mono">{c.proposed_amount ? money(c.proposed_amount) : '—'}</td>
              <td><StatusBadge status={c.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const TABS = [
  ['verifications', 'Verification'],
  ['projects', 'Projects'],
  ['members', 'Members'],
  ['collaborations', 'Collaborations'],
];

export default function UniversityConsole() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'verifications';
  const { data } = useAsync(() => api.get('/university/stats'), []);
  const s = data?.data;

  return (
    <div className="wrap">
      <PageHead
        eyebrow="Institution"
        title="University console"
        description="Verify your people, watch what they publish, and promote the work that deserves attention."
      />

      {s && (
        <div className="grid grid-4" style={{ marginBottom: '1.75rem' }}>
          <Stat value={num(s.members.total)} label="Members" accent />
          <Stat value={num(s.pendingVerifications)} label="Awaiting verification" />
          <Stat value={num(s.publications.approved)} label="Live publications" />
          <Stat value={num(s.collaborations.total)} label="Collaboration requests" />
        </div>
      )}

      <div className="tabs" role="tablist">
        {TABS.map(([key, label]) => (
          <button key={key} className="tab" role="tab" aria-selected={tab === key} onClick={() => setParams({ tab: key })}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'verifications' && <Verifications />}
      {tab === 'projects' && <Projects />}
      {tab === 'members' && <Members />}
      {tab === 'collaborations' && <Collaborations />}
    </div>
  );
}
