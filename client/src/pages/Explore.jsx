import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { useAsync, useAuth, num, timeAgo, titleCase } from '../lib/store';
import { Empty, ErrorNote, Loading, PageHead, Pagination, Rating, UpgradePrompt } from '../components/UI';

const TYPES = ['final_year_project', 'research_paper', 'innovation', 'prototype', 'patent', 'thesis', 'dataset'];

function PublicationCard({ p }) {
  return (
    <Link to={`/publications/${p.slug}`} className="card card-hover" style={{ color: 'inherit', display: 'block' }}>
      <div className="wrap-row" style={{ marginBottom: '0.7rem' }}>
        <span className="badge badge-violet">{titleCase(p.publication_type)}</span>
        {p.open_to_investment ? <span className="badge badge-ok">Open to funding</span> : null}
      </div>
      <h4 className="truncate-2" style={{ marginBottom: '0.4rem' }}>{p.title}</h4>
      <p className="muted small truncate-3">{p.abstract}</p>

      {p.technologies?.length > 0 && (
        <div className="wrap-row" style={{ margin: '0.6rem 0' }}>
          {p.technologies.slice(0, 4).map((t) => <span key={t} className="tag">{t}</span>)}
          {p.technologies.length > 4 && <span className="tag">+{p.technologies.length - 4}</span>}
        </div>
      )}

      <div className="row-between small muted" style={{ marginTop: '0.9rem' }}>
        <span className="truncate-2">{p.owner_name}{p.university_name ? ` · ${p.university_name}` : ''}</span>
        <Rating value={p.rating_avg} count={p.rating_count} />
      </div>
      <div className="wrap-row small mono muted" style={{ gap: '1rem', marginTop: '0.4rem' }}>
        <span>{num(p.view_count)} views</span>
        <span>{num(p.save_count)} saves</span>
        <span>{timeAgo(p.published_at)}</span>
      </div>
    </Link>
  );
}

export default function Explore() {
  const { user, isPremium } = useAuth();
  const [params, setParams] = useSearchParams();
  const [taxonomy, setTaxonomy] = useState(null);
  const [search, setSearch] = useState(params.get('q') || '');
  const [gate, setGate] = useState(null);

  useEffect(() => { setSearch(params.get('q') || ''); }, [params.get('q')]);

  useEffect(() => {
    api.get('/taxonomy').then((r) => setTaxonomy(r.data)).catch(() => {});
  }, []);

  const query = Object.fromEntries(params);
  const { data, loading, error } = useAsync(() => api.get('/publications', query), [params.toString()]);

  useEffect(() => {
    if (error?.status === 402) setGate(error.message);
  }, [error]);

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '' || v === false) next.delete(k);
      else next.set(k, String(v));
    });
    if (!('page' in patch)) next.delete('page');
    setParams(next);
    setGate(null);
  };

  const premiumFilter = (patch) => {
    if (!isPremium) {
      setGate('Filtering by technology, university and industry is available on Premium.');
      return;
    }
    update(patch);
  };

  return (
    <div className="wrap">
      <PageHead
        eyebrow="Catalogue"
        title="Publications"
        description="Everything here has been read and approved by an administrator before going live."
        actions={
          user && ['student', 'researcher'].includes(user.role_code) ? (
            <Link className="btn btn-primary" to="/publications/new">Add a publication</Link>
          ) : null
        }
      />

      <div className="split">
        <aside className="sidebar">
          <form
            onSubmit={(e) => { e.preventDefault(); update({ q: search }); }}
            style={{ marginBottom: '1rem' }}
          >
            <input
              className="input"
              placeholder="Search title, abstract, keywords"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search publications"
            />
          </form>

          <div className="sidebar-title">Field</div>
          <div className="wrap-row">
            <button className="chip" aria-pressed={!params.get('category')} onClick={() => update({ category: '' })}>
              All
            </button>
            {taxonomy?.categories.filter((c) => !c.parent_id).map((c) => (
              <button
                key={c.slug} className="chip"
                aria-pressed={params.get('category') === c.slug}
                onClick={() => update({ category: c.slug })}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="sidebar-title">Type</div>
          <select className="select" value={params.get('type') || ''} onChange={(e) => update({ type: e.target.value })}>
            <option value="">Any type</option>
            {TYPES.map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}
          </select>

          <div className="sidebar-title">Open to</div>
          <div className="stack" style={{ '--gap': '0.5rem' }}>
            <label className="check">
              <input
                type="checkbox" checked={params.get('collaboration') === 'true'}
                onChange={(e) => update({ collaboration: e.target.checked })}
              />
              <span>Collaboration</span>
            </label>
            <label className="check">
              <input
                type="checkbox" checked={params.get('investment') === 'true'}
                onChange={(e) => update({ investment: e.target.checked })}
              />
              <span>Investment</span>
            </label>
          </div>

          <div className="sidebar-title">
            Advanced {!isPremium && <span className="badge badge-violet" style={{ marginLeft: 4 }}>Premium</span>}
          </div>
          <div className="stack" style={{ '--gap': '0.6rem', opacity: isPremium ? 1 : 0.6 }}>
            <select
              className="select" value={params.get('technology') || ''}
              onChange={(e) => premiumFilter({ technology: e.target.value })}
            >
              <option value="">Any technology</option>
              {taxonomy?.technologies.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
            </select>
            <select
              className="select" value={params.get('university') || ''}
              onChange={(e) => premiumFilter({ university: e.target.value })}
            >
              <option value="">Any university</option>
              {taxonomy?.universities.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <select
              className="select" value={params.get('industry') || ''}
              onChange={(e) => premiumFilter({ industry: e.target.value })}
            >
              <option value="">Any industry</option>
              {taxonomy?.industries.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>

          {gate && <div style={{ marginTop: '1rem' }}><UpgradePrompt message={gate} compact /></div>}
        </aside>

        <div>
          <div className="row-between" style={{ marginBottom: '1rem' }}>
            <span className="small muted">
              {loading ? 'Loading…' : data?.meta ? `${num(data.meta.total)} publications` : 'Publications unavailable'}
            </span>
            <select
              className="select" style={{ width: 'auto' }}
              value={params.get('sort') || 'recent'}
              onChange={(e) => update({ sort: e.target.value })}
              aria-label="Sort"
            >
              <option value="recent">Most recent</option>
              <option value="popular">Most viewed</option>
              <option value="saved">Most saved</option>
              <option value="rating">Highest rated</option>
            </select>
          </div>

          {loading && <Loading rows={4} />}
          {!loading && error && error.status !== 402 && <ErrorNote error={error} />}
          {!loading && data?.data?.length === 0 && (
            <Empty title="Nothing matches those filters">
              Try a broader field, or clear the search box and start again.
            </Empty>
          )}
          {!loading && data?.data?.length > 0 && (
            <>
              <div className="grid grid-3">
                {data.data.map((p) => <PublicationCard key={p.id} p={p} />)}
              </div>
              <Pagination meta={data.meta} onPage={(page) => update({ page })} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
