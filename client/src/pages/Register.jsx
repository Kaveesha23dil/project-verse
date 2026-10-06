import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth, useToast, useAsync } from '../lib/store';
import { Field } from '../components/UI';

const ROLES = [
  { code: 'student', title: 'Student', text: 'Publish your final year project and field collaboration requests.' },
  { code: 'researcher', title: 'Researcher', text: 'Publish research and take innovations to industry.' },
  { code: 'university', title: 'University', text: 'Verify members, monitor projects and promote institutional research.' },
  { code: 'business', title: 'Business', text: 'Search academic work and reach the teams behind it.' },
  { code: 'investor', title: 'Investor', text: 'Find innovations open to funding and contact their owners.' },
];

const NEEDS_UNIVERSITY = ['student', 'researcher', 'university'];

export default function Register() {
  const { signUp } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [role, setRole] = useState(null);
  const {
    data: universityResponse,
    loading: unisLoading,
    error: unisError,
    reload: reloadUniversities,
  } = useAsync(() => api.get('/universities'), []);
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', confirm: '', phone: '', universityId: '',
    studentNumber: '', degreeProgram: '', faculty: '', designation: '', researchField: '',
    companyName: '', industry: '', firmName: '', investorType: 'individual', officialRole: '',
  });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const uniList = universityResponse?.data || [];
  const registrationUnavailable = universityResponse?.registrationAvailable === false;
  const uniBlocked = unisLoading || !!unisError || uniList.length === 0;
  const uniPlaceholder = unisLoading
    ? 'Loading universities…'
    : unisError
      ? 'Universities could not be loaded'
      : 'No universities are listed yet';

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (registrationUnavailable) {
      setError('Account creation is temporarily unavailable. Please try again shortly.');
      return;
    }
    if (form.password !== form.confirm) { setError('The two passwords do not match'); return; }
    if (form.password.length < 8) { setError('Use at least 8 characters for your password'); return; }
    if (NEEDS_UNIVERSITY.includes(role) && !form.universityId) {
      setError(unisError ? 'The university list could not be loaded. Retry it below and try again.' : 'Choose your university to continue');
      return;
    }

    setBusy(true);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        role,
        phone: form.phone || null,
        universityId: NEEDS_UNIVERSITY.includes(role) ? Number(form.universityId) : null,
      };
      if (role === 'student') Object.assign(payload, { studentNumber: form.studentNumber, degreeProgram: form.degreeProgram, faculty: form.faculty });
      if (role === 'researcher') Object.assign(payload, { designation: form.designation, researchField: form.researchField });
      if (role === 'university') Object.assign(payload, { officialRole: form.officialRole });
      if (role === 'business') Object.assign(payload, { companyName: form.companyName, industry: form.industry });
      if (role === 'investor') Object.assign(payload, { firmName: form.firmName, investorType: form.investorType });

      const user = await signUp(payload);
      toast.ok(`Account created. You are on the Basic plan, ${user.full_name.split(' ')[0]}.`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (step === 1) {
    return (
      <div className="wrap-narrow">
        <div className="center" style={{ marginBottom: '2rem' }}>
          <div className="eyebrow">Step 1 of 2</div>
          <h1 style={{ fontSize: 'var(--step-3)', marginTop: '0.4rem' }}>What brings you here?</h1>
          <p className="muted">Your role decides which dashboard you land on and what you can do.</p>
        </div>
        <div className="grid grid-2">
          {ROLES.map((r) => (
            <button
              key={r.code}
              type="button"
              className="card card-hover"
              style={{ textAlign: 'left', cursor: 'pointer', borderColor: role === r.code ? 'var(--violet-600)' : undefined }}
              onClick={() => { setRole(r.code); setStep(2); }}
            >
              <h4>{r.title}</h4>
              <p className="muted small" style={{ margin: 0 }}>{r.text}</p>
            </button>
          ))}
        </div>
        <p className="center small muted" style={{ marginTop: '2rem' }}>
          Already registered? <Link to="/signin">Sign in</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="wrap-narrow">
      <button className="btn btn-quiet btn-sm" onClick={() => setStep(1)} style={{ marginBottom: '1rem' }}>
        ← Change role
      </button>
      <div className="card" style={{ padding: '2rem' }}>
        <div className="eyebrow">Step 2 of 2 · {ROLES.find((r) => r.code === role)?.title}</div>
        <h1 style={{ fontSize: 'var(--step-3)', marginTop: '0.4rem' }}>Create your account</h1>

        {error && <div className="notice notice-error" style={{ margin: '1rem 0' }}>{error}</div>}

        <form onSubmit={submit} style={{ marginTop: '1.25rem' }}>
          <div className="grid grid-2" style={{ gap: '0 1rem' }}>
            <Field label="Full name" required>
              <input className="input" required value={form.fullName} onChange={set('fullName')} />
            </Field>
            <Field label="Email" required hint={NEEDS_UNIVERSITY.includes(role) ? 'Use your institutional address where possible' : undefined}>
              <input className="input" type="email" required value={form.email} onChange={set('email')} />
            </Field>
            <Field label="Password" required hint="At least 8 characters">
              <input className="input" type="password" required minLength={8} value={form.password} onChange={set('password')} />
            </Field>
            <Field label="Confirm password" required>
              <input className="input" type="password" required value={form.confirm} onChange={set('confirm')} />
            </Field>
            <Field label="Phone">
              <input className="input" value={form.phone} onChange={set('phone')} />
            </Field>

            {NEEDS_UNIVERSITY.includes(role) && (
              <>
                <div>
                <Field
                  label="University"
                  required
                  hint={uniBlocked ? undefined : 'Your institution verifies you after registration'}
                  error={unisError ? 'The university list could not be loaded from the server.' : (!unisLoading && !uniList.length ? 'No universities are listed yet.' : undefined)}
                >
                  <select
                    className="select"
                    required
                    value={form.universityId}
                    onChange={set('universityId')}
                    disabled={uniBlocked}
                    aria-busy={unisLoading}
                  >
                    <option value="">{uniList.length ? 'Choose your university' : uniPlaceholder}</option>
                    {uniList.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </Field>
                {uniBlocked && !unisLoading && (
                  <div style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={reloadUniversities}>
                      Retry loading universities
                    </button>
                  </div>
                )}
                </div>
              </>
            )}

            {role === 'student' && (
              <>
                <Field label="Student number"><input className="input" value={form.studentNumber} onChange={set('studentNumber')} /></Field>
                <Field label="Faculty"><input className="input" value={form.faculty} onChange={set('faculty')} /></Field>
                <Field label="Degree programme"><input className="input" value={form.degreeProgram} onChange={set('degreeProgram')} /></Field>
              </>
            )}
            {role === 'researcher' && (
              <>
                <Field label="Designation"><input className="input" value={form.designation} onChange={set('designation')} /></Field>
                <Field label="Research field"><input className="input" value={form.researchField} onChange={set('researchField')} /></Field>
              </>
            )}
            {role === 'university' && (
              <Field label="Your role at the institution"><input className="input" value={form.officialRole} onChange={set('officialRole')} /></Field>
            )}
            {role === 'business' && (
              <>
                <Field label="Company name" required><input className="input" required value={form.companyName} onChange={set('companyName')} /></Field>
                <Field label="Industry"><input className="input" value={form.industry} onChange={set('industry')} /></Field>
              </>
            )}
            {role === 'investor' && (
              <>
                <Field label="Firm name"><input className="input" value={form.firmName} onChange={set('firmName')} /></Field>
                <Field label="Investor type">
                  <select className="select" value={form.investorType} onChange={set('investorType')}>
                    <option value="individual">Individual</option>
                    <option value="angel">Angel</option>
                    <option value="vc">Venture capital</option>
                    <option value="corporate">Corporate</option>
                    <option value="grant_body">Grant body</option>
                  </select>
                </Field>
              </>
            )}
          </div>

          <div className="notice notice-info" style={{ margin: '0.5rem 0 1.25rem' }}>
            You start on the Basic plan: browse everything, open 20 publications a month, save 5, and send 3
            collaboration or investment requests. Upgrade any time.
          </div>

          {registrationUnavailable && (
            <div className="notice notice-warn" role="status" style={{ marginBottom: '1rem' }}>
              You can select your university, but account creation is temporarily unavailable.
              <button type="button" className="btn btn-quiet btn-sm" disabled={unisLoading} onClick={reloadUniversities}>
                {unisLoading ? 'Checking…' : 'Try again'}
              </button>
            </div>
          )}
          <button className="btn btn-primary btn-lg btn-block" disabled={busy || registrationUnavailable || (NEEDS_UNIVERSITY.includes(role) && uniBlocked)}>
            {busy ? 'Creating your account…' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}
