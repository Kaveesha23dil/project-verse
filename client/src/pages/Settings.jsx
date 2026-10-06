import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { useAsync, useAuth, useToast, money, date, num, titleCase } from '../lib/store';
import { Avatar, Empty, Field, Loading, PageHead, PlanBadge, StatusBadge, UsageMeter } from '../components/UI';

/* ------------------------------------------------------------- profile */
function Profile() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/me/profile').then((r) => setForm(r.data)).catch(() => {});
  }, []);

  if (!form) return <Loading rows={3} />;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setP = (k) => (e) => setForm({ ...form, profile: { ...form.profile, [k]: e.target.value } });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put('/me', {
        fullName: form.full_name,
        headline: form.headline,
        bio: form.bio,
        phone: form.phone,
        avatarUrl: form.avatar_url,
        city: form.city,
        country: form.country,
        linkedinUrl: form.linkedin_url,
        websiteUrl: form.website_url,
        profile: {
          studentNumber: form.profile.student_number,
          degreeProgram: form.profile.degree_program,
          faculty: form.profile.faculty,
          designation: form.profile.designation,
          department: form.profile.department,
          researchField: form.profile.research_field,
          orcidId: form.profile.orcid_id,
          companyName: form.profile.company_name,
          industry: form.profile.industry,
          companyWebsite: form.profile.company_website,
          firmName: form.profile.firm_name,
          focusAreas: form.profile.focus_areas,
          officialRole: form.profile.official_role,
        },
      });
      await refresh();
      toast.ok('Profile updated');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="row" style={{ gap: '1.2rem' }}>
          <Avatar name={form.full_name} url={form.avatar_url} large />
          <div className="grow">
            <h3 style={{ margin: 0 }}>{form.full_name}</h3>
            <div className="small muted">{user.role_name}{user.university_name ? ` · ${user.university_name}` : ''}</div>
            <div className="wrap-row" style={{ marginTop: '0.5rem' }}>
              <StatusBadge status={user.verification_status} />
              <PlanBadge plan={user.plan_code} />
            </div>
          </div>
        </div>
        {user.verification_status === 'pending' && (
          <div className="notice notice-info" style={{ marginTop: '1rem' }}>
            Your university has not verified you yet. You can publish in the meantime — verification adds the
            institutional badge to your work.
          </div>
        )}
      </div>

      <div className="card">
        <h4>Basics</h4>
        <div className="grid grid-2" style={{ gap: '0 1rem', marginTop: '1rem' }}>
          <Field label="Full name" required><input className="input" required value={form.full_name || ''} onChange={set('full_name')} /></Field>
          <Field label="Email"><input className="input mono" value={form.email || ''} disabled /></Field>
          <Field label="Phone"><input className="input" value={form.phone || ''} onChange={set('phone')} /></Field>
          <Field label="Avatar image link"><input className="input" value={form.avatar_url || ''} onChange={set('avatar_url')} /></Field>
          <Field label="City"><input className="input" value={form.city || ''} onChange={set('city')} /></Field>
          <Field label="Country"><input className="input" value={form.country || ''} onChange={set('country')} /></Field>
        </div>
        <Field label="Headline" hint="One line, shown next to your name"><input className="input" value={form.headline || ''} onChange={set('headline')} /></Field>
        <Field label="About"><textarea className="textarea" value={form.bio || ''} onChange={set('bio')} /></Field>
        <div className="grid grid-2" style={{ gap: '0 1rem' }}>
          <Field label="LinkedIn"><input className="input" value={form.linkedin_url || ''} onChange={set('linkedin_url')} /></Field>
          <Field label="Website"><input className="input" value={form.website_url || ''} onChange={set('website_url')} /></Field>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h4>{titleCase(user.role_code)} details</h4>
        <div className="grid grid-2" style={{ gap: '0 1rem', marginTop: '1rem' }}>
          {user.role_code === 'student' && (
            <>
              <Field label="Student number"><input className="input" value={form.profile.student_number || ''} onChange={setP('student_number')} /></Field>
              <Field label="Faculty"><input className="input" value={form.profile.faculty || ''} onChange={setP('faculty')} /></Field>
              <Field label="Degree programme"><input className="input" value={form.profile.degree_program || ''} onChange={setP('degree_program')} /></Field>
            </>
          )}
          {user.role_code === 'researcher' && (
            <>
              <Field label="Designation"><input className="input" value={form.profile.designation || ''} onChange={setP('designation')} /></Field>
              <Field label="Department"><input className="input" value={form.profile.department || ''} onChange={setP('department')} /></Field>
              <Field label="Research field"><input className="input" value={form.profile.research_field || ''} onChange={setP('research_field')} /></Field>
              <Field label="ORCID"><input className="input mono" value={form.profile.orcid_id || ''} onChange={setP('orcid_id')} /></Field>
            </>
          )}
          {user.role_code === 'university' && (
            <Field label="Your role at the institution"><input className="input" value={form.profile.official_role || ''} onChange={setP('official_role')} /></Field>
          )}
          {user.role_code === 'business' && (
            <>
              <Field label="Company name"><input className="input" value={form.profile.company_name || ''} onChange={setP('company_name')} /></Field>
              <Field label="Industry"><input className="input" value={form.profile.industry || ''} onChange={setP('industry')} /></Field>
              <Field label="Company website"><input className="input" value={form.profile.company_website || ''} onChange={setP('company_website')} /></Field>
            </>
          )}
          {user.role_code === 'investor' && (
            <>
              <Field label="Firm name"><input className="input" value={form.profile.firm_name || ''} onChange={setP('firm_name')} /></Field>
              <Field label="Focus areas"><input className="input" value={form.profile.focus_areas || ''} onChange={setP('focus_areas')} /></Field>
            </>
          )}
        </div>
      </div>

      <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} disabled={busy}>
        {busy ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}

/* ------------------------------------------------------------- billing */
function Billing() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const { data, loading, reload } = useAsync(() => api.get('/subscriptions/me'), []);
  const { data: invoices } = useAsync(() => api.get('/subscriptions/invoices'), []);

  const cancel = async () => {
    if (!window.confirm('Turn off renewal? You keep Premium until the period ends.')) return;
    try {
      const res = await api.post('/subscriptions/cancel', {});
      toast.ok(res.message);
      reload();
      refresh();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const resume = async () => {
    try {
      await api.post('/subscriptions/resume', {});
      toast.ok('Renewal turned back on');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <Loading rows={3} />;
  const sub = data?.data?.subscription;
  const usage = data?.data?.usage;

  return (
    <div className="split-wide">
      <div className="stack">
        <div className="card">
          <div className="row-between">
            <div>
              <div className="eyebrow">Current plan</div>
              <h3 style={{ margin: '0.4rem 0 0' }}>{sub?.plan_name || 'Basic'}</h3>
              <p className="muted small" style={{ margin: '0.3rem 0 0' }}>
                {sub?.plan_code === 'premium'
                  ? `${titleCase(sub.billing_cycle)} · ${money(sub.amount)} · ${sub.auto_renew ? 'renews' : 'ends'} ${date(sub.current_period_end)}`
                  : 'Free, for as long as you like.'}
              </p>
            </div>
            <PlanBadge plan={user.plan_code} />
          </div>

          <div className="wrap-row" style={{ marginTop: '1.2rem' }}>
            {user.plan_code === 'premium' ? (
              sub?.auto_renew
                ? <button className="btn btn-ghost" onClick={cancel}>Turn off renewal</button>
                : <button className="btn btn-primary" onClick={resume}>Turn renewal back on</button>
            ) : (
              <Link className="btn btn-primary" to="/pricing">Upgrade to Premium</Link>
            )}
          </div>

          {sub?.card_last4 && (
            <div className="notice notice-info" style={{ marginTop: '1rem' }}>
              Paying with {titleCase(sub.card_brand)} ending {sub.card_last4}, expiring{' '}
              {String(sub.exp_month).padStart(2, '0')}/{sub.exp_year}.
            </div>
          )}
        </div>

        <div className="card">
          <h4>Invoices</h4>
          {invoices?.data?.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Invoice</th><th>Period</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>
                  {invoices.data.map((i) => (
                    <tr key={i.id}>
                      <td className="mono">{i.invoice_no}</td>
                      <td className="small">{date(i.period_start)} – {date(i.period_end)}</td>
                      <td className="mono">{money(i.amount, i.currency)}</td>
                      <td><StatusBadge status={i.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted small">No invoices — Basic is free.</p>
          )}
        </div>
      </div>

      <aside className="sidebar">
        <div className="card">
          <h4>Usage this month</h4>
          <div className="stack" style={{ '--gap': '0.9rem', marginTop: '0.9rem' }}>
            {usage?.metrics
              ?.filter((m) => !(user.plan_code === 'basic' && m.limit === 0))
              .map((m) => <UsageMeter key={m.metric} {...m} />)}
          </div>
        </div>
      </aside>
    </div>
  );
}

/* --------------------------------------------------------------- sales */
function Sales() {
  const toast = useToast();
  const { data, loading, reload } = useAsync(() => api.get('/marketplace/sales'), []);
  const { data: listings } = useAsync(() => api.get('/marketplace/products/mine'), []);

  const setStatus = async (id, itemStatus) => {
    const trackingNo = itemStatus === 'shipped' ? window.prompt('Tracking number (optional)') || undefined : undefined;
    try {
      await api.patch(`/marketplace/sales/${id}`, { itemStatus, trackingNo });
      toast.ok('Status updated');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <Loading rows={3} />;
  const rows = data?.data || [];

  return (
    <>
      <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="stat stat-accent">
          <div className="stat-value mono">{money(data?.payouts?.total || 0)}</div>
          <div className="stat-label">Net earnings</div>
        </div>
        <div className="stat">
          <div className="stat-value mono">{money(data?.payouts?.pending || 0)}</div>
          <div className="stat-label">Pending payout</div>
        </div>
        <div className="stat">
          <div className="stat-value mono">{num(rows.length)}</div>
          <div className="stat-label">Items sold</div>
        </div>
        <div className="stat">
          <div className="stat-value mono">{num(listings?.data?.filter((l) => l.status === 'active').length || 0)}</div>
          <div className="stat-label">Live listings</div>
        </div>
      </div>

      <h3>Your listings</h3>
      {listings?.data?.length ? (
        <div className="card table-wrap" style={{ padding: 0, marginBottom: '2rem' }}>
          <table className="table">
            <thead><tr><th>Listing</th><th>Price</th><th>Stock</th><th>Sold</th><th>Status</th></tr></thead>
            <tbody>
              {listings.data.map((l) => (
                <tr key={l.id}>
                  <td>
                    <Link to={`/marketplace/${l.slug}`} style={{ fontWeight: 500, color: 'var(--ink)' }}>{l.title}</Link>
                    <div className="small muted">{l.category_name}</div>
                    {l.rejection_reason && <div className="small" style={{ color: 'var(--stop)' }}>{l.rejection_reason}</div>}
                  </td>
                  <td className="mono">{money(l.price, l.currency)}</td>
                  <td className="mono">{l.is_digital ? '∞' : num(l.stock_quantity)}</td>
                  <td className="mono">{num(l.sold_count)}</td>
                  <td><StatusBadge status={l.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="No listings yet" action={<Link className="btn btn-primary" to="/sell">List something</Link>} />
      )}

      <h3>Sales</h3>
      {rows.length ? (
        <div className="card table-wrap" style={{ padding: 0 }}>
          <table className="table">
            <thead><tr><th>Item</th><th>Order</th><th>Buyer</th><th>Total</th><th>Status</th><th /></tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td>{s.title_snapshot}<div className="small muted">quantity {s.quantity}</div></td>
                  <td className="mono small">{s.order_no}</td>
                  <td className="small">{s.buyer_name}{s.ship_city ? <div className="small muted">{s.ship_city}</div> : null}</td>
                  <td className="mono">{money(s.line_total)}</td>
                  <td><StatusBadge status={s.item_status} /></td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {s.item_status === 'confirmed' && (
                      <button className="btn btn-primary btn-sm" onClick={() => setStatus(s.id, 'shipped')}>Mark shipped</button>
                    )}
                    {s.item_status === 'shipped' && (
                      <button className="btn btn-ghost btn-sm" onClick={() => setStatus(s.id, 'delivered')}>Mark delivered</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="No sales yet">Once someone buys one of your listings it appears here with its delivery status.</Empty>
      )}
    </>
  );
}

/* ------------------------------------------------------------ security */
function Security() {
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) { toast.error('The two new passwords do not match'); return; }
    setBusy(true);
    try {
      await api.auth.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.ok('Password changed');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card" style={{ maxWidth: 480 }}>
      <h4>Change your password</h4>
      <Field label="Current password" required>
        <input className="input" type="password" required value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
      </Field>
      <Field label="New password" required hint="At least 8 characters">
        <input className="input" type="password" required minLength={8} value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
      </Field>
      <Field label="Confirm new password" required>
        <input className="input" type="password" required value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
      </Field>
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Change password'}</button>
    </form>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'profile';

  const tabs = [
    ['profile', 'Profile'],
    ['billing', 'Plan and billing'],
    ...(user.role_code !== 'admin' ? [['sales', 'Selling']] : []),
    ['security', 'Security'],
  ];

  return (
    <div className="wrap">
      <PageHead eyebrow="Account" title="Settings" />
      <div className="tabs" role="tablist">
        {tabs.map(([key, label]) => (
          <button key={key} className="tab" role="tab" aria-selected={tab === key} onClick={() => setParams({ tab: key })}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'profile' && <Profile />}
      {tab === 'billing' && <Billing />}
      {tab === 'sales' && <Sales />}
      {tab === 'security' && <Security />}
    </div>
  );
}
