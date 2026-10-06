import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';
import { useToast, titleCase } from '../lib/store';
import { Field, Loading, PageHead, StatusOrbit } from '../components/UI';

const TYPES = ['final_year_project', 'research_paper', 'innovation', 'prototype', 'patent', 'thesis', 'dataset'];

const EMPTY = {
  title: '', abstract: '', description: '', methodology: '', results: '',
  publicationType: 'final_year_project', categoryId: '', industryId: '', keywords: '',
  demoUrl: '', repositoryUrl: '', academicYear: '', openToCollaboration: true,
  openToInvestment: false, fundingRequired: '', technologyIds: [],
};

export default function PublicationEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [taxonomy, setTaxonomy] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState('draft');
  const [pubId, setPubId] = useState(id ? Number(id) : null);
  const [rejection, setRejection] = useState(null);
  const [loading, setLoading] = useState(!!id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/taxonomy').then((r) => setTaxonomy(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    api.get(`/publications/${id}/edit`)
      .then((r) => {
        const p = r.data;
        setStatus(p.status);
        setRejection(p.rejectionReason);
        setForm({
          title: p.title || '',
          abstract: p.abstract || '',
          description: p.description || '',
          methodology: p.methodology || '',
          results: p.results || '',
          publicationType: p.publicationType || 'final_year_project',
          categoryId: p.categoryId ? String(p.categoryId) : '',
          industryId: p.industryId ? String(p.industryId) : '',
          keywords: p.keywords || '',
          demoUrl: p.demoUrl || '',
          repositoryUrl: p.repositoryUrl || '',
          academicYear: p.academicYear || '',
          openToCollaboration: !!p.openToCollaboration,
          openToInvestment: !!p.openToInvestment,
          fundingRequired: p.fundingRequired ?? '',
          technologyIds: p.technologyIds || [],
        });
      })
      .catch((err) => {
        toast.error(err.message);
        navigate('/dashboard');
      })
      .finally(() => setLoading(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const toggleTech = (techId) => {
    setForm((f) => ({
      ...f,
      technologyIds: f.technologyIds.includes(techId)
        ? f.technologyIds.filter((t) => t !== techId)
        : [...f.technologyIds, techId],
    }));
  };

  const payload = () => ({
    title: form.title,
    abstract: form.abstract,
    description: form.description || null,
    methodology: form.methodology || null,
    results: form.results || null,
    publicationType: form.publicationType,
    categoryId: form.categoryId ? Number(form.categoryId) : null,
    industryId: form.industryId ? Number(form.industryId) : null,
    keywords: form.keywords || null,
    demoUrl: form.demoUrl || null,
    repositoryUrl: form.repositoryUrl || null,
    academicYear: form.academicYear || null,
    openToCollaboration: form.openToCollaboration,
    openToInvestment: form.openToInvestment,
    fundingRequired: form.fundingRequired ? Number(form.fundingRequired) : null,
    technologyIds: form.technologyIds,
  });

  /** Returns the publication id on success, null on failure. */
  const saveDraft = async ({ quiet = false } = {}) => {
    setBusy(true);
    setError(null);
    try {
      if (pubId) {
        await api.put(`/publications/${pubId}`, payload());
        if (!quiet) toast.ok('Changes saved');
        return pubId;
      }
      const res = await api.post('/publications', payload());
      setPubId(res.data.id);
      if (!quiet) toast.ok('Saved as a draft');
      return res.data.id;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    const target = await saveDraft({ quiet: true });
    if (!target) return;
    setBusy(true);
    try {
      await api.post(`/publications/${target}/submit`, {});
      setStatus('pending');
      toast.ok('Published for approval');
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="wrap"><Loading rows={5} /></div>;

  return (
    <div className="wrap-narrow">
      <PageHead
        eyebrow={pubId ? 'Edit publication' : 'New publication'}
        title={pubId ? 'Edit your publication' : 'Add a publication'}
        description="Saving keeps it private as a draft. Publishing sends it to an administrator, who reads it before it goes live."
      />

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="row-between">
          <StatusOrbit status={status} />
          <span className="small muted">
            {status === 'draft' && 'Only you can see this'}
            {status === 'pending' && 'Waiting for the administrator'}
            {status === 'rejected' && 'Fix the notes and send it again'}
          </span>
        </div>
      </div>

      {rejection && (
        <div className="notice notice-error" style={{ marginBottom: '1rem' }}>
          <strong>The administrator asked for changes.</strong> {rejection}
        </div>
      )}

      {error && <div className="notice notice-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <form onSubmit={(e) => { e.preventDefault(); saveDraft(); }} className="card" style={{ padding: '1.75rem' }}>
        <Field label="Title" required hint="Say what it is, not how clever it is">
          <input className="input" required minLength={8} value={form.title} onChange={set('title')} />
        </Field>

        <Field label="Abstract" required hint="40 to 1200 characters. This is what everyone sees before opening the full record.">
          <textarea className="textarea" required minLength={40} maxLength={1200} value={form.abstract} onChange={set('abstract')} />
        </Field>

        <div className="grid grid-2" style={{ gap: '0 1rem' }}>
          <Field label="Type" required>
            <select className="select" value={form.publicationType} onChange={set('publicationType')}>
              {TYPES.map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}
            </select>
          </Field>
          <Field label="Category" required hint="Needed before you can publish">
            <select className="select" value={form.categoryId} onChange={set('categoryId')}>
              <option value="">Choose…</option>
              {taxonomy?.categories.filter((c) => !c.parent_id).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Industry">
            <select className="select" value={form.industryId} onChange={set('industryId')}>
              <option value="">Not specific</option>
              {taxonomy?.industries.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </Field>
          <Field label="Academic year">
            <input className="input" placeholder="2025/2026" value={form.academicYear} onChange={set('academicYear')} />
          </Field>
        </div>

        <Field label="Technology used" hint="Helps businesses find the work through advanced search">
          <div className="wrap-row">
            {taxonomy?.technologies.map((t) => (
              <button
                key={t.id} type="button" className="chip"
                aria-pressed={form.technologyIds.includes(t.id)}
                onClick={() => toggleTech(t.id)}
              >
                {t.name}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Full description" hint="What it does, who it is for, what problem it solves">
          <textarea className="textarea" style={{ minHeight: 160 }} value={form.description} onChange={set('description')} />
        </Field>
        <Field label="Methodology">
          <textarea className="textarea" value={form.methodology} onChange={set('methodology')} />
        </Field>
        <Field label="Results">
          <textarea className="textarea" value={form.results} onChange={set('results')} />
        </Field>

        <div className="grid grid-2" style={{ gap: '0 1rem' }}>
          <Field label="Demo link"><input className="input" value={form.demoUrl} onChange={set('demoUrl')} /></Field>
          <Field label="Repository link"><input className="input" value={form.repositoryUrl} onChange={set('repositoryUrl')} /></Field>
        </div>

        <Field label="Keywords" hint="Comma separated">
          <input className="input" value={form.keywords} onChange={set('keywords')} />
        </Field>

        <div className="card" style={{ background: 'var(--graphite-50)', marginBottom: '1rem' }}>
          <div className="eyebrow">Openness</div>
          <div className="stack" style={{ '--gap': '0.7rem', marginTop: '0.7rem' }}>
            <label className="check">
              <input type="checkbox" checked={form.openToCollaboration} onChange={set('openToCollaboration')} />
              <span>Open to collaboration — businesses and researchers can send you requests</span>
            </label>
            <label className="check">
              <input type="checkbox" checked={form.openToInvestment} onChange={set('openToInvestment')} />
              <span>Open to investment — investors can propose funding</span>
            </label>
          </div>
          {form.openToInvestment && (
            <Field label="Funding sought (USD)" hint="Optional">
              <input className="input" type="number" min="0" step="500" value={form.fundingRequired} onChange={set('fundingRequired')} />
            </Field>
          )}
        </div>

        <div className="row" style={{ gap: '0.6rem', marginTop: '1.5rem' }}>
          <button className="btn btn-ghost" type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save draft'}
          </button>
          <button className="btn btn-primary" type="button" onClick={publish} disabled={busy || status === 'pending'}>
            Publish for approval
          </button>
        </div>
        <p className="hint" style={{ marginTop: '0.7rem' }}>
          Publishing does not make it public straight away. An administrator reads every submission first, and your
          dashboard shows where it is.
        </p>
      </form>
    </div>
  );
}
