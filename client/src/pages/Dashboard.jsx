import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useAsync, useAuth, useToast, money, num, date, timeAgo, titleCase } from '../lib/store';
import {
  Empty, Loading, PageHead, PlanBadge, Stat, StatusBadge, StatusOrbit, UsageMeter,
} from '../components/UI';

/* -------------------------------------------------------- shared blocks */
function UsageCard({ usage, plan }) {
  return (
    <div className="card">
      <div className="row-between" style={{ marginBottom: '0.9rem' }}>
        <h4 style={{ margin: 0 }}>This month</h4>
        <PlanBadge plan={plan} />
      </div>
      <div className="stack" style={{ '--gap': '0.9rem' }}>
        {usage?.metrics
          ?.filter((m) => !(plan === 'basic' && m.limit === 0))
          .map((m) => <UsageMeter key={m.metric} {...m} />)}
      </div>
      {plan !== 'premium' && (
        <Link className="btn btn-primary btn-block btn-sm" to="/pricing" style={{ marginTop: '1.1rem' }}>
          Remove the limits
        </Link>
      )}
    </div>
  );
}

/* ------------------------------------------------ student / researcher */
function PublisherDashboard({ panel }) {
  const toast = useToast();
  const { data, reload } = useAsync(() => api.get('/publications/mine'), []);
  const mine = data?.data || [];
  const s = panel.stats || {};

  const withdraw = async (id) => {
    try {
      await api.post(`/publications/${id}/withdraw`, {});
      toast.toast('Moved back to drafts');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const submit = async (id) => {
    try {
      await api.post(`/publications/${id}/submit`, {});
      toast.ok('Sent for approval');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
        <Stat value={num(s.approved || 0)} label="Live publications" accent />
        <Stat value={num(s.in_review || 0)} label="Waiting for approval" />
        <Stat value={num(s.views || 0)} label="Total views" />
        <Stat value={num(s.requests || 0)} label="Requests received" />
      </div>

      <section style={{ marginBottom: '2rem' }}>
        <div className="row-between" style={{ marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Your publications</h3>
          <Link className="btn btn-primary btn-sm" to="/publications/new">Add a publication</Link>
        </div>

        {mine.length === 0 ? (
          <Empty title="Nothing published yet" action={<Link className="btn btn-primary" to="/publications/new">Add your first publication</Link>}>
            Write it as a draft first. Nothing becomes public until an administrator has approved it.
          </Empty>
        ) : (
          <div className="card table-wrap" style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr><th>Title</th><th>Status</th><th>Views</th><th>Saves</th><th>Updated</th><th /></tr>
              </thead>
              <tbody>
                {mine.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link to={`/publications/${p.slug}`} style={{ fontWeight: 500, color: 'var(--ink)' }}>{p.title}</Link>
                      <div className="small muted">{titleCase(p.publication_type)}{p.category_name ? ` · ${p.category_name}` : ''}</div>
                      {p.status === 'rejected' && p.rejection_reason && (
                        <div className="small" style={{ color: 'var(--stop)' }}>{p.rejection_reason}</div>
                      )}
                    </td>
                    <td><StatusOrbit status={p.status} />{p.hidden_until && new Date(p.hidden_until) > new Date() && <p className="small muted">Hidden until {new Date(p.hidden_until).toLocaleString()}</p>}</td>
                    <td className="mono">{num(p.view_count)}</td>
                    <td className="mono">{num(p.save_count)}</td>
                    <td className="small muted">{timeAgo(p.updated_at)}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {p.status === 'draft' && (
                        <>
                          <Link className="btn btn-quiet btn-sm" to={`/publications/${p.id}/edit`}>Edit</Link>
                          <button className="btn btn-primary btn-sm" onClick={() => submit(p.id)}>Publish</button>
                        </>
                      )}
                      {p.status === 'pending' && (
                        <button className="btn btn-ghost btn-sm" onClick={() => withdraw(p.id)}>Withdraw</button>
                      )}
                      {p.status === 'rejected' && (
                        <Link className="btn btn-primary btn-sm" to={`/publications/${p.id}/edit`}>Fix and resend</Link>
                      )}
                      {p.status === 'approved' && (
                        <Link className="btn btn-quiet btn-sm" to={`/publications/${p.slug}`}>View</Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <div className="row-between" style={{ marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Requests to you</h3>
          <Link className="btn btn-ghost btn-sm" to="/requests">Open requests</Link>
        </div>
        {panel.incoming?.length ? (
          <div className="stack" style={{ '--gap': '0.7rem' }}>
            {panel.incoming.map((r) => (
              <div key={r.id} className="card row-between">
                <div>
                  <div className="wrap-row" style={{ marginBottom: '0.3rem' }}>
                    <span className="badge badge-violet">{titleCase(r.request_type)}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  <strong>{r.subject}</strong>
                  <div className="small muted">
                    {r.requester_name}{r.requester_org ? ` · ${r.requester_org}` : ''}
                    {r.publication_title ? ` — about "${r.publication_title}"` : ''}
                  </div>
                </div>
                {r.proposed_amount ? <span className="price">{money(r.proposed_amount)}</span> : null}
              </div>
            ))}
          </div>
        ) : (
          <Empty title="No requests yet">
            Requests from businesses and investors arrive here once your work is live.
          </Empty>
        )}
      </section>
    </>
  );
}

/* ------------------------------------------------- business / investor */
function SeekerDashboard({ panel, role }) {
  return (
    <>
      <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
        <Stat value={num(panel.saved?.length || 0)} label="Saved publications" accent />
        <Stat value={num(panel.sent?.length || 0)} label="Requests sent" />
        <Stat value={num(panel.meetings?.length || 0)} label="Upcoming meetings" />
        <Stat value={money(panel.orders?.spent || 0)} label="Marketplace spend" />
      </div>

      <section style={{ marginBottom: '2rem' }}>
        <div className="row-between" style={{ marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>{role === 'investor' ? 'Open to funding' : 'Recently published'}</h3>
          <Link className="btn btn-ghost btn-sm" to="/explore">Browse all</Link>
        </div>
        {panel.matches?.length ? (
          <div className="grid grid-3">
            {panel.matches.map((p) => (
              <Link key={p.id} to={`/publications/${p.slug}`} className="card card-hover" style={{ color: 'inherit' }}>
                <h4 className="truncate-2" style={{ fontSize: 'var(--step-1)' }}>{p.title}</h4>
                <p className="muted small truncate-3">{p.abstract}</p>
                <div className="row-between small muted" style={{ marginTop: '0.6rem' }}>
                  <span>{p.owner_name}</span>
                  {p.funding_required ? <span className="mono">{money(p.funding_required)}</span> : null}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <Empty title="Nothing to show yet" />
        )}
      </section>

      <div className="grid grid-2">
        <section>
          <h3>Your requests</h3>
          {panel.sent?.length ? (
            <div className="stack" style={{ '--gap': '0.6rem' }}>
              {panel.sent.map((r) => (
                <div key={r.id} className="card">
                  <div className="row-between">
                    <strong className="truncate-2">{r.subject}</strong>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="small muted">
                    To {r.recipient_name}{r.publication_title ? ` · ${r.publication_title}` : ''}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="No requests sent">Open a publication and send a collaboration or investment request.</Empty>
          )}
        </section>

        <section>
          <h3>Saved</h3>
          {panel.saved?.length ? (
            <div className="stack" style={{ '--gap': '0.6rem' }}>
              {panel.saved.map((p) => (
                <Link key={p.id} to={`/publications/${p.slug}`} className="card card-hover" style={{ color: 'inherit' }}>
                  <strong className="truncate-2">{p.title}</strong>
                  <div className="small muted">{p.owner_name}{p.category_name ? ` · ${p.category_name}` : ''}</div>
                </Link>
              ))}
            </div>
          ) : (
            <Empty title="Nothing saved">Save a publication to keep it here.</Empty>
          )}
        </section>
      </div>
    </>
  );
}

/* ------------------------------------------------------------ university */
function UniversityDashboard({ panel }) {
  return (
    <>
      <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
        <Stat value={num(panel.members?.total || 0)} label="Members" accent />
        <Stat value={num(panel.members?.awaiting || 0)} label="Awaiting verification" />
        <Stat value={num(panel.publications?.approved || 0)} label="Live publications" />
        <Stat value={num(panel.publications?.views || 0)} label="Total views" />
      </div>

      <div className="grid grid-2">
        <section>
          <div className="row-between" style={{ marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Waiting for you to verify</h3>
            <Link className="btn btn-ghost btn-sm" to="/university">Open console</Link>
          </div>
          {panel.pendingVerifications?.length ? (
            <div className="stack" style={{ '--gap': '0.6rem' }}>
              {panel.pendingVerifications.map((v) => (
                <div key={v.id} className="card row-between">
                  <div>
                    <strong>{v.full_name}</strong>
                    <div className="small muted">{titleCase(v.role_code)} · {v.email}</div>
                  </div>
                  <span className="small mono muted">{timeAgo(v.created_at)}</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="Everyone is verified">New members appear here when they register.</Empty>
          )}
        </section>

        <section>
          <h3>Most viewed from your institution</h3>
          {panel.topPublications?.length ? (
            <div className="stack" style={{ '--gap': '0.6rem' }}>
              {panel.topPublications.map((p) => (
                <Link key={p.id} to={`/publications/${p.slug}`} className="card card-hover row-between" style={{ color: 'inherit' }}>
                  <strong className="truncate-2">{p.title}</strong>
                  <span className="mono small muted">{num(p.view_count)} views</span>
                </Link>
              ))}
            </div>
          ) : (
            <Empty title="No published work yet" />
          )}
        </section>
      </div>
    </>
  );
}

/* ----------------------------------------------------------- administrator */
function AdminDashboard({ panel }) {
  return (
    <>
      <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
        <Stat value={num(panel.queue?.publications || 0)} label="Publications to review" accent />
        <Stat value={num(panel.queue?.products || 0)} label="Listings to review" />
        <Stat value={num(panel.users?.total || 0)} label="Accounts" />
        <Stat value={money(panel.commerce?.gmv || 0)} label="Marketplace volume" />
      </div>

      <div className="row-between" style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>Oldest in the queue</h3>
        <Link className="btn btn-primary btn-sm" to="/admin">Open moderation</Link>
      </div>
      {panel.oldestPending?.length ? (
        <div className="card table-wrap" style={{ padding: 0 }}>
          <table className="table">
            <thead><tr><th>Publication</th><th>From</th><th>Waiting since</th></tr></thead>
            <tbody>
              {panel.oldestPending.map((p) => (
                <tr key={p.id}>
                  <td>{p.title}</td>
                  <td>{p.owner_name}</td>
                  <td className="small muted">{timeAgo(p.submitted_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="The queue is clear">Nothing is waiting for a decision right now.</Empty>
      )}
    </>
  );
}

/* --------------------------------------------------------------- page */
export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading } = useAsync(() => api.get('/dashboard'), []);

  if (loading) return <div className="wrap"><Loading rows={5} /></div>;
  const d = data?.data;
  const role = d?.role;

  return (
    <div className="wrap">
      <PageHead
        eyebrow={user.role_name}
        title={`Hello, ${user.full_name.split(' ')[0]}`}
        description={
          user.verification_status === 'pending'
            ? 'Your university has not verified you yet. You can still publish — verification adds the institutional badge.'
            : undefined
        }
        actions={<Link className="btn btn-ghost" to="/settings">Settings</Link>}
      />

      <div className="split-wide" style={{ '--split-columns': 'minmax(0, 1fr) 300px' }}>
        <div>
          {(role === 'student' || role === 'researcher') && <PublisherDashboard panel={d.panel} />}
          {(role === 'business' || role === 'investor') && <SeekerDashboard panel={d.panel} role={role} />}
          {role === 'university' && <UniversityDashboard panel={d.panel} />}
          {role === 'admin' && <AdminDashboard panel={d.panel} />}
        </div>

        <aside className="sidebar stack">
          <UsageCard usage={d.usage} plan={user.plan_code} />

          <div className="card">
            <h4>Quick actions</h4>
            <div className="stack" style={{ '--gap': '0.5rem', marginTop: '0.7rem' }}>
              {['student', 'researcher'].includes(role) && (
                <Link className="btn btn-ghost btn-block btn-sm" to="/publications/new">Add a publication</Link>
              )}
              {role !== 'admin' && <Link className="btn btn-ghost btn-block btn-sm" to="/sell">List in the marketplace</Link>}
              <Link className="btn btn-ghost btn-block btn-sm" to={role === 'admin' ? '/admin?tab=moderation' : '/requests'}>
                {role === 'admin' ? `Review submissions (${(Number(d.panel.queue?.publications) || 0) + (Number(d.panel.queue?.products) || 0)})` : `Requests${d.pendingRequests ? ` (${d.pendingRequests})` : ''}`}
              </Link>
              <Link className="btn btn-ghost btn-block btn-sm" to="/explore">Browse publications</Link>
              {role === 'university' && <Link className="btn btn-ghost btn-block btn-sm" to="/university">University console</Link>}
              {role === 'admin' && <Link className="btn btn-ghost btn-block btn-sm" to="/admin">Administration</Link>}
            </div>
          </div>

          {(role === 'student' || role === 'researcher') && d.panel.listings && (
            <div className="card">
              <h4>Selling</h4>
              <div className="row" style={{ gap: '1.5rem', marginTop: '0.7rem' }}>
                <div>
                  <div className="mono" style={{ fontWeight: 600 }}>{num(d.panel.listings.active || 0)}</div>
                  <div className="small muted">live</div>
                </div>
                <div>
                  <div className="mono" style={{ fontWeight: 600 }}>{num(d.panel.listings.in_review || 0)}</div>
                  <div className="small muted">in review</div>
                </div>
                <div>
                  <div className="mono" style={{ fontWeight: 600 }}>{money(d.panel.sales?.gross || 0)}</div>
                  <div className="small muted">sales</div>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
