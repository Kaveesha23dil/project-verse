import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useAsync, num } from '../lib/store';
import { Rating, StatusOrbit } from '../components/UI';

/* The mark, drawn large and slowly rotating: two counter-turning orbits
   whose nodes are the five kinds of people the platform connects. */
function Constellation() {
  const outer = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2;
    return { x: 200 + Math.cos(a) * 160, y: 200 + Math.sin(a) * 160, r: i % 3 === 0 ? 7 : 4 };
  });
  const inner = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return { x: 200 + Math.cos(a) * 108, y: 200 + Math.sin(a) * 108, r: i % 2 === 0 ? 5 : 3 };
  });

  return (
    <svg className="constellation" viewBox="0 0 400 400" role="img" aria-label="Orbiting network of research nodes">
      <g className="spin">
        <circle className="ring" cx="200" cy="200" r="160" />
        <ellipse className="ring" cx="200" cy="200" rx="160" ry="72" transform="rotate(24 200 200)" />
        <ellipse className="ring" cx="200" cy="200" rx="160" ry="72" transform="rotate(-24 200 200)" />
        {outer.map((n, i) => (
          <circle key={i} className={i % 6 === 0 ? 'node node-bright' : 'node'} cx={n.x} cy={n.y} r={n.r} />
        ))}
      </g>
      <g className="spin-back">
        <circle className="ring" cx="200" cy="200" r="108" />
        {inner.map((n, i) => (
          <circle key={i} className="node" cx={n.x} cy={n.y} r={n.r} opacity="0.85" />
        ))}
      </g>
      <circle cx="200" cy="200" r="46" fill="rgba(123,56,189,0.22)" />
      <text
        x="200" y="200" textAnchor="middle" dominantBaseline="central"
        fontFamily="Sora, sans-serif" fontWeight="700" fontSize="52" fill="#fff"
      >
        P
      </text>
    </svg>
  );
}

const ROLES = [
  { code: 'student', title: 'Students', text: 'Upload a final year project, keep the profile current, and answer collaboration requests as they arrive.' },
  { code: 'researcher', title: 'Researchers', text: 'Publish research and innovations, and take them into partnerships with industry.' },
  { code: 'university', title: 'Universities', text: 'Verify your members, watch every project from the institution, and promote the best of it.' },
  { code: 'business', title: 'Businesses', text: 'Search the catalogue by technology and industry, then reach the people who built the work.' },
  { code: 'investor', title: 'Investors', text: 'Find innovations that are open to funding, request documents, and book a meeting with the owner.' },
  { code: 'admin', title: 'Administrators', text: 'Review every submission before it goes live, manage accounts, and keep the audit trail complete.' },
];

export default function Landing() {
  const { data } = useAsync(() => api.get('/discover'), []);
  const counts = data?.data?.counts;
  const featured = data?.data?.featured || [];
  const categories = data?.data?.topCategories || [];

  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <div className="eyebrow" style={{ color: 'var(--violet-300)' }}>
              University research &amp; innovation marketplace
            </div>
            <h1 style={{ marginTop: '1rem' }}>Good research should not stop at the viva.</h1>
            <p>
              Every year universities produce work that is graded, filed and forgotten. ProjectVerse gives that work a
              public record, a moderated path to publication, and a marketplace where the people who need it can
              actually find it.
            </p>
            <div className="wrap-row" style={{ marginTop: '2rem' }}>
              <Link className="btn btn-primary btn-lg" to="/explore">Browse publications</Link>
              <Link className="btn btn-ghost btn-lg" to="/register">Publish your work</Link>
            </div>

            <div className="hero-stats">
              <div>
                <div className="hero-stat-value mono">{num(counts?.publications ?? '—')}</div>
                <div className="hero-stat-label">Published</div>
              </div>
              <div>
                <div className="hero-stat-value mono">{num(counts?.universities ?? '—')}</div>
                <div className="hero-stat-label">Universities</div>
              </div>
              <div>
                <div className="hero-stat-value mono">{num(counts?.listings ?? '—')}</div>
                <div className="hero-stat-label">Marketplace items</div>
              </div>
              <div>
                <div className="hero-stat-value mono">{num(counts?.collaborations ?? '—')}</div>
                <div className="hero-stat-label">Collaborations</div>
              </div>
            </div>
          </div>

          <div className="hero-art">
            <Constellation />
          </div>
        </div>
      </section>

      {/* The approval path, stated plainly, using the same orbit the app uses. */}
      <section className="section">
        <div className="wrap">
          <div className="eyebrow">How publishing works</div>
          <h2 style={{ maxWidth: '20ch' }}>Nothing goes live until an administrator has read it.</h2>
          <div className="grid grid-3" style={{ marginTop: '2rem' }}>
            {[
              { status: 'draft', title: 'Save a draft', text: 'Write it, attach documents, and leave it. Only you can see a draft.' },
              { status: 'pending', title: 'Send for approval', text: 'The submission lands on the administrator queue. Your dashboard tracks it.' },
              { status: 'approved', title: 'Live in the marketplace', text: 'Once approved it is searchable, saveable, and open to collaboration requests.' },
            ].map((step) => (
              <article key={step.status} className="card card-accent">
                <StatusOrbit status={step.status} />
                <h4 style={{ marginTop: '0.9rem' }}>{step.title}</h4>
                <p className="muted" style={{ margin: 0 }}>{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--paper)', borderBlock: 'var(--edge)' }}>
        <div className="wrap">
          <div className="row-between" style={{ marginBottom: '1.5rem', alignItems: 'flex-end' }}>
            <div>
              <div className="eyebrow">Six ways in</div>
              <h2>Each role gets its own dashboard</h2>
            </div>
            <Link to="/register" className="btn btn-ghost">Pick your role</Link>
          </div>
          <div className="grid grid-3">
            {ROLES.map((r) => (
              <article key={r.code} className="card card-hover">
                <h4>{r.title}</h4>
                <p className="muted small" style={{ margin: 0 }}>{r.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="section">
          <div className="wrap">
            <div className="row-between" style={{ marginBottom: '1.5rem', alignItems: 'flex-end' }}>
              <div>
                <div className="eyebrow">Featured</div>
                <h2>Recently published</h2>
              </div>
              <Link to="/explore" className="btn btn-ghost">See all</Link>
            </div>
            <div className="grid grid-3">
              {featured.map((p) => (
                <Link key={p.id} to={`/publications/${p.slug}`} className="card card-hover" style={{ color: 'inherit' }}>
                  <div className="wrap-row" style={{ marginBottom: '0.6rem' }}>
                    {p.category_name && <span className="tag">{p.category_name}</span>}
                    <Rating value={p.rating_avg} />
                  </div>
                  <h4 className="truncate-2">{p.title}</h4>
                  <p className="muted small truncate-3">{p.abstract}</p>
                  <div className="small muted mono">
                    {p.owner_name}
                    {p.university_name ? ` · ${p.university_name}` : ''}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {categories.length > 0 && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="eyebrow" style={{ marginBottom: '0.8rem' }}>Browse by field</div>
            <div className="wrap-row">
              {categories.map((c) => (
                <Link key={c.slug} to={`/explore?category=${c.slug}`} className="chip">
                  {c.name} <span className="mono muted">{c.n}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
