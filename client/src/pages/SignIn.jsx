import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useToast } from '../lib/store';
import { Field, LogoMark } from '../components/UI';

const DEMO = [
  ['Student', 'malsha@sltc.ac.lk'],
  ['Researcher', 'nuwan.perera@uom.lk'],
  ['University', 'research@sltc.ac.lk'],
  ['Business', 'kavindu@orbittech.lk'],
  ['Investor (Premium)', 'rashmi@lankaventures.com'],
  ['Administrator', 'admin@projectverse.io'],
];

export default function SignIn() {
  const { signIn } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await signIn(form.email, form.password);
      toast.ok(`Signed in as ${user.full_name}`);
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wrap" style={{ maxWidth: 940 }}>
      <div className="split-wide" style={{ '--split-columns': 'minmax(0, 1fr) 320px', marginTop: '2rem' }}>
        <div className="card signin-card" style={{ padding: '2.25rem' }}>
          <LogoMark size={38} />
          <h1 style={{ fontSize: 'var(--step-3)', marginTop: '1rem' }}>Welcome back</h1>
          <p className="muted">Sign in to publish, review requests and manage your marketplace listings.</p>

          {error && <div className="notice notice-error" style={{ marginBottom: '1rem' }}>{error}</div>}

          <form onSubmit={submit}>
            <Field label="Email" required>
              <input
                className="input" type="email" autoComplete="email" required
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Password" required>
              <input
                className="input" type="password" autoComplete="current-password" required
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </Field>
            <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="small muted" style={{ marginTop: '1.25rem', marginBottom: 0 }}>
            No account yet? <Link to="/register">Create one</Link> — every new account starts on the Basic plan.
          </p>
        </div>

        <aside className="card" style={{ background: 'var(--violet-50)', borderColor: 'var(--violet-100)' }}>
          <div className="eyebrow">Demo accounts</div>
          <p className="small" style={{ marginTop: '0.5rem' }}>
            Password for all of them: <code className="mono">Password123!</code>
          </p>
          <div className="stack" style={{ '--gap': '0.4rem' }}>
            {DEMO.map(([label, email]) => (
              <button
                key={email}
                type="button"
                className="btn btn-ghost btn-sm btn-block"
                style={{ justifyContent: 'space-between' }}
                onClick={() => setForm({ email, password: 'Password123!' })}
              >
                <span>{label}</span>
                <span className="mono small muted">use</span>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
