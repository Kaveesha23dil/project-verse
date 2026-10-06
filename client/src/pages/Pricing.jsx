import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAsync, useAuth, useToast, money } from '../lib/store';
import { ErrorNote, Field, Loading, Modal } from '../components/UI';

function CardForm({ cycle, onClose }) {
  const { refresh } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ cardNumber: '', holderName: '', exp: '', cvv: '', country: 'Sri Lanka' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const amount = cycle === 'yearly' ? 200 : 20;

  const formatCard = (v) => v.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    const [mm, yy] = form.exp.split('/').map((s) => s?.trim());
    if (!mm || !yy) { setError('Enter the expiry as MM/YY'); return; }

    setBusy(true);
    try {
      await api.post('/subscriptions/upgrade', {
        billingCycle: cycle,
        cardNumber: form.cardNumber.replace(/\s/g, ''),
        holderName: form.holderName,
        expMonth: Number(mm),
        expYear: 2000 + Number(yy),
        cvv: form.cvv,
        billingCountry: form.country,
      });
      await refresh();
      toast.ok('Premium is active');
      onClose();
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form id="card-form" onSubmit={submit}>
      <div className="card" style={{ background: 'var(--violet-50)', borderColor: 'var(--violet-100)', marginBottom: '1.25rem' }}>
        <div className="row-between">
          <div>
            <strong>Premium — {cycle}</strong>
            <div className="small muted">
              {cycle === 'yearly' ? 'Billed once a year. Two months cheaper than monthly.' : 'Billed every month. Cancel any time.'}
            </div>
          </div>
          <span className="price">{money(amount)}</span>
        </div>
      </div>

      {error && <div className="notice notice-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <Field label="Card number" required>
        <input
          className="input mono" required inputMode="numeric" placeholder="4242 4242 4242 4242"
          value={form.cardNumber}
          onChange={(e) => setForm({ ...form, cardNumber: formatCard(e.target.value) })}
        />
      </Field>
      <Field label="Name on card" required>
        <input className="input" required value={form.holderName} onChange={(e) => setForm({ ...form, holderName: e.target.value })} />
      </Field>
      <div className="grid grid-2" style={{ gap: '0 1rem' }}>
        <Field label="Expiry" required>
          <input
            className="input mono" required placeholder="MM/YY" value={form.exp}
            onChange={(e) => {
              let v = e.target.value.replace(/\D/g, '').slice(0, 4);
              if (v.length > 2) v = `${v.slice(0, 2)}/${v.slice(2)}`;
              setForm({ ...form, exp: v });
            }}
          />
        </Field>
        <Field label="Security code" required>
          <input
            className="input mono" required inputMode="numeric" maxLength={4} placeholder="123"
            value={form.cvv} onChange={(e) => setForm({ ...form, cvv: e.target.value.replace(/\D/g, '') })}
          />
        </Field>
      </div>
      <Field label="Billing country">
        <input className="input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
      </Field>

      <p className="hint">
        Only the card brand and last four digits are stored. The full number never reaches our database.
      </p>

      <button className="btn btn-primary btn-block btn-lg" disabled={busy} style={{ marginTop: '0.5rem' }}>
        {busy ? 'Processing…' : `Pay ${money(amount)} and activate`}
      </button>
    </form>
  );
}

export default function Pricing() {
  const { user, isPremium } = useAuth();
  const { data, loading, error } = useAsync(() => api.get('/subscriptions/plans'), []);
  const [cycle, setCycle] = useState('yearly');
  const [checkout, setCheckout] = useState(false);

  if (loading) return <div className="wrap"><Loading rows={4} /></div>;
  if (error) return <div className="wrap-narrow"><ErrorNote error={error} /></div>;
  const plans = data?.data || [];
  const basic = plans.find((p) => p.code === 'basic');
  const premium = plans.find((p) => p.code === 'premium');

  return (
    <div className="wrap-narrow">
      <div className="center" style={{ marginBottom: '2rem' }}>
        <div className="eyebrow">Plans</div>
        <h1 style={{ fontSize: 'var(--step-4)', marginTop: '0.5rem' }}>Read a little, or read everything</h1>
        <p className="muted" style={{ maxWidth: '52ch', margin: '0 auto' }}>
          Every account starts on Basic and stays there for free. Premium removes the monthly caps and opens meetings
          and document requests.
        </p>

        <div className="row" style={{ justifyContent: 'center', marginTop: '1.5rem' }}>
          <button className="chip" aria-pressed={cycle === 'monthly'} onClick={() => setCycle('monthly')}>Monthly</button>
          <button className="chip" aria-pressed={cycle === 'yearly'} onClick={() => setCycle('yearly')}>
            Yearly — save {money(20 * 12 - 200)}
          </button>
        </div>
      </div>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="plan">
          <div className="eyebrow">Basic</div>
          <div className="plan-price" style={{ marginTop: '0.6rem' }}>Free</div>
          <p className="muted small" style={{ marginTop: '0.4rem' }}>{basic?.tagline}</p>
          <ul className="plan-list">
            {basic?.features.map((f) => (
              <li key={f.feature_key}>
                <span className={`mark ${f.is_included ? '' : 'mark-off'}`}>{f.is_included ? '✓' : '·'}</span>
                <span className={f.is_included ? '' : 'off'}>{f.label}</span>
              </li>
            ))}
          </ul>
          <div style={{ marginTop: '1.5rem' }}>
            {user ? (
              <button className="btn btn-ghost btn-block" disabled>
                {isPremium ? 'Included in Premium' : 'Your current plan'}
              </button>
            ) : (
              <Link className="btn btn-ghost btn-block" to="/register">Create a free account</Link>
            )}
          </div>
        </div>

        <div className="plan plan-featured">
          <div className="eyebrow">Premium</div>
          <div className="plan-price" style={{ marginTop: '0.6rem' }}>
            {money(cycle === 'yearly' ? premium?.price_yearly : premium?.price_monthly)}
            <span style={{ fontSize: 'var(--step-0)', fontFamily: 'var(--body)', color: 'var(--graphite-500)', fontWeight: 400 }}>
              {cycle === 'yearly' ? ' / year' : ' / month'}
            </span>
          </div>
          <p className="muted small" style={{ marginTop: '0.4rem' }}>{premium?.tagline}</p>
          <ul className="plan-list">
            {premium?.features.map((f) => (
              <li key={f.feature_key}>
                <span className="mark">✓</span>
                <span>{f.label}</span>
              </li>
            ))}
          </ul>
          <div style={{ marginTop: '1.5rem' }}>
            {isPremium ? (
              <Link className="btn btn-ghost btn-block" to="/settings?tab=billing">Manage your plan</Link>
            ) : user ? (
              <button className="btn btn-primary btn-block btn-lg" onClick={() => setCheckout(true)}>
                Upgrade to Premium
              </button>
            ) : (
              <Link className="btn btn-primary btn-block btn-lg" to="/register">Create an account first</Link>
            )}
          </div>
        </div>
      </div>

      <section className="card" style={{ marginTop: '2.5rem' }}>
        <h3>How the limits work</h3>
        <p className="muted small">
          Basic counts a full publication view once per publication per month — reopening the same record later that
          month is free. Saves are a standing total of five, not five a month. Requests reset on the first of each
          month. Cancelling Premium keeps your access until the paid period ends, then the account returns to Basic
          with nothing deleted.
        </p>
      </section>

      <Modal open={checkout} onClose={() => setCheckout(false)} title="Activate Premium">
        <CardForm cycle={cycle} onClose={() => setCheckout(false)} />
      </Modal>
    </div>
  );
}
