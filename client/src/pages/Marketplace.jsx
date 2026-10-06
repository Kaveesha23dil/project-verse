import ProductImage from '../components/ProductImage';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { useAsync, useAuth, money, num, titleCase } from '../lib/store';
import { Empty, ErrorNote, Loading, PageHead, Pagination, Rating } from '../components/UI';

const TYPES = ['physical', 'digital', 'service', 'dataset', 'license', 'component'];

function ProductCard({ p }) {
  const out = !p.is_digital && p.stock_quantity <= 0;
  return (
    <Link to={`/marketplace/${p.slug}`} className="card card-hover" style={{ color: 'inherit', display: 'block' }}>
      <div className="thumb" style={{ marginBottom: '0.9rem' }}>
        <ProductImage src={p.image_url} type={p.product_type} title={p.title} />
      </div>
      <div className="wrap-row" style={{ marginBottom: '0.5rem' }}>
        <span className="badge">{titleCase(p.product_type)}</span>
        {out && <span className="badge badge-warn">Out of stock</span>}
      </div>
      <h4 className="truncate-2" style={{ fontSize: 'var(--step-1)' }}>{p.title}</h4>
      <p className="muted small truncate-2">{p.short_description}</p>
      <div className="row-between" style={{ marginTop: '0.8rem' }}>
        <div>
          <span className="price">{money(p.price, p.currency)}</span>
          {p.compare_at_price ? <span className="price-strike">{money(p.compare_at_price, p.currency)}</span> : null}
        </div>
        <Rating value={p.rating_avg} count={p.rating_count} />
      </div>
      <div className="small muted mono" style={{ marginTop: '0.4rem' }}>
        {p.seller_name} · {titleCase(p.seller_role)}
      </div>
    </Link>
  );
}

export default function Marketplace() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState(params.get('q') || '');

  useEffect(() => { setSearch(params.get('q') || ''); }, [params.get('q')]);

  useEffect(() => {
    api.get('/taxonomy').then((r) => setCategories(r.data.productCategories)).catch(() => {});
  }, []);

  const { data, loading, error } = useAsync(
    () => api.get('/marketplace/products', Object.fromEntries(params)),
    [params.toString()]
  );

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '' || v === false) next.delete(k);
      else next.set(k, String(v));
    });
    if (!('page' in patch)) next.delete('page');
    setParams(next);
  };

  return (
    <div className="wrap">
      <PageHead
        eyebrow="Marketplace"
        title="Buy and sell research output"
        description="Prototypes, datasets, components, licences and research services — listed by students, researchers, universities, businesses and investors."
        actions={user && user.role_code !== 'admin' ? <Link className="btn btn-primary" to="/sell">List an item</Link> : null}
      />

      <div className="split">
        <aside className="sidebar">
          <form onSubmit={(e) => { e.preventDefault(); update({ q: search }); }}>
            <input
              className="input" placeholder="Search listings" value={search}
              onChange={(e) => setSearch(e.target.value)} aria-label="Search listings"
            />
          </form>

          <div className="sidebar-title">Category</div>
          <div className="wrap-row">
            <button className="chip" aria-pressed={!params.get('category')} onClick={() => update({ category: '' })}>All</button>
            {categories.map((c) => (
              <button
                key={c.slug} className="chip" aria-pressed={params.get('category') === c.slug}
                onClick={() => update({ category: c.slug })}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="sidebar-title">Kind</div>
          <select className="select" value={params.get('type') || ''} onChange={(e) => update({ type: e.target.value })}>
            <option value="">Anything</option>
            {TYPES.map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}
          </select>

          <div className="sidebar-title">Seller</div>
          <select className="select" value={params.get('sellerRole') || ''} onChange={(e) => update({ sellerRole: e.target.value })}>
            <option value="">Anyone</option>
            <option value="student">Students</option>
            <option value="researcher">Researchers</option>
            <option value="university">Universities</option>
            <option value="business">Businesses</option>
            <option value="investor">Investors</option>
          </select>

          <div className="sidebar-title">Price (USD)</div>
          <div className="row">
            <input
              className="input" type="number" min="0" placeholder="Min"
              key={`min-${params.get('minPrice') || ''}`} defaultValue={params.get('minPrice') || ''}
              aria-label="Minimum price"
              onBlur={(e) => update({ minPrice: e.target.value })}
            />
            <input
              className="input" type="number" min="0" placeholder="Max"
              key={`max-${params.get('maxPrice') || ''}`} defaultValue={params.get('maxPrice') || ''}
              aria-label="Maximum price"
              onBlur={(e) => update({ maxPrice: e.target.value })}
            />
          </div>
        </aside>

        <div>
          <div className="row-between" style={{ marginBottom: '1rem' }}>
            <span className="small muted">{loading ? 'Loading…' : data?.meta ? `${num(data.meta.total)} listings` : 'Listings unavailable'}</span>
            <select
              className="select" style={{ width: 'auto' }} value={params.get('sort') || 'recent'}
              onChange={(e) => update({ sort: e.target.value })} aria-label="Sort"
            >
              <option value="recent">Newest</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="popular">Best selling</option>
              <option value="rating">Highest rated</option>
            </select>
          </div>

          {loading && <Loading rows={4} />}
          {!loading && error && <ErrorNote error={error} />}
          {!loading && data?.data?.length === 0 && (
            <Empty title="No listings match" action={<button className="btn btn-ghost" onClick={() => setParams({})}>Clear filters</button>}>
              Widen the price range or pick a different category.
            </Empty>
          )}
          {!loading && data?.data?.length > 0 && (
            <>
              <div className="grid grid-3">
                {data.data.map((p) => <ProductCard key={p.id} p={p} />)}
              </div>
              <Pagination meta={data.meta} onPage={(page) => update({ page })} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
