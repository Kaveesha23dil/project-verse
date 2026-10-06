import ProductImage from '../components/ProductImage';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';
import { useAsync, useAuth, useToast, money, num, titleCase, date } from '../lib/store';
import { Avatar, Empty, Loading, Rating, StatusBadge } from '../components/UI';

export default function ProductDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const { data, loading } = useAsync(() => api.get(`/marketplace/products/${slug}`), [slug]);
  const [qty, setQty] = useState(1);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);

  if (loading) return <div className="wrap"><Loading rows={4} /></div>;
  if (!data?.data) {
    return (
      <div className="wrap-narrow">
        <Empty title="That listing is not available" action={<Link className="btn btn-primary" to="/marketplace">Back to marketplace</Link>} />
      </div>
    );
  }

  const p = data.data;
  const out = !p.is_digital && p.stock_quantity <= 0;

  const addToCart = async (thenCheckout = false) => {
    if (!user) { navigate('/signin', { state: { from: `/marketplace/${slug}` } }); return; }
    setBusy(true);
    try {
      await api.post('/marketplace/cart', { productId: p.id, quantity: qty });
      toast.ok('Added to cart');
      if (thenCheckout) navigate('/cart');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wrap">
      <Link to="/marketplace" className="btn btn-quiet btn-sm" style={{ marginBottom: '1rem' }}>← Marketplace</Link>

      <div className="split-wide">
        <div>
          <div className="thumb" style={{ marginBottom: '0.8rem', aspectRatio: '16/9' }}>
            <ProductImage src={p.images?.[active]?.image_url} type={p.product_type} alt={p.title} />
          </div>
          {p.images?.length > 1 && (
            <div className="wrap-row" style={{ marginBottom: '1.5rem' }}>
              {p.images.map((img, i) => (
                <button
                  key={i} className="thumb thumb-square" style={{ width: 72, border: i === active ? '2px solid var(--violet-600)' : 'none', padding: 0 }}
                  onClick={() => setActive(i)} aria-label={`Image ${i + 1}`}
                >
                  <ProductImage src={img.image_url} type={p.product_type} />
                </button>
              ))}
            </div>
          )}

          <h1 style={{ fontSize: 'var(--step-3)' }}>{p.title}</h1>
          <div className="wrap-row" style={{ margin: '0.6rem 0 1.2rem' }}>
            <span className="badge badge-violet">{titleCase(p.product_type)}</span>
            <span className="tag">{p.category_name}</span>
            {p.condition_type !== 'not_applicable' && <span className="badge">{titleCase(p.condition_type)}</span>}
            <Rating value={p.rating_avg} count={p.rating_count} />
          </div>

          {p.short_description && <p style={{ fontSize: 'var(--step-1)' }}>{p.short_description}</p>}
          {p.description && (
            <section style={{ marginTop: '1.5rem' }}>
              <h3>About this listing</h3>
              <p style={{ whiteSpace: 'pre-wrap' }}>{p.description}</p>
            </section>
          )}

          {p.attributes?.length > 0 && (
            <section style={{ marginTop: '1.5rem' }}>
              <h3>Specification</h3>
              <div className="card" style={{ padding: 0 }}>
                <table className="table">
                  <tbody>
                    {p.attributes.map((a, i) => (
                      <tr key={i}>
                        <td className="muted" style={{ width: '38%' }}>{a.attr_name}</td>
                        <td>{a.attr_value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {p.publication_slug && (
            <section style={{ marginTop: '1.5rem' }}>
              <div className="card card-accent">
                <div className="eyebrow">From a published project</div>
                <Link to={`/publications/${p.publication_slug}`} style={{ fontSize: 'var(--step-1)', fontWeight: 500 }}>
                  {p.publication_title}
                </Link>
              </div>
            </section>
          )}

          <section style={{ marginTop: '2rem' }}>
            <h3>Reviews</h3>
            {p.reviews?.length ? (
              <div className="stack">
                {p.reviews.map((r, i) => (
                  <div key={i} className="card">
                    <div className="row-between">
                      <div className="row"><Avatar name={r.full_name} url={r.avatar_url} /><strong>{r.full_name}</strong></div>
                      <Rating value={r.rating} />
                    </div>
                    {r.comment && <p style={{ margin: '0.7rem 0 0' }}>{r.comment}</p>}
                    <div className="small mono muted" style={{ marginTop: '0.4rem' }}>{date(r.created_at)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted small">No reviews yet. Only buyers can leave one.</p>
            )}
          </section>
        </div>

        <aside className="sidebar stack">
          <div className="card">
            <div className="price" style={{ fontSize: 'var(--step-3)' }}>{money(p.price, p.currency)}</div>
            {p.compare_at_price ? <span className="price-strike">{money(p.compare_at_price, p.currency)}</span> : null}

            <div className="small muted mono" style={{ margin: '0.7rem 0' }}>
              {p.is_digital
                ? 'Digital delivery — available right after payment'
                : `${num(p.stock_quantity)} in stock · ${p.shipping_fee > 0 ? `${money(p.shipping_fee, p.currency)} shipping` : 'Free shipping'}`}
            </div>

            {p.isSeller ? (
              <div className="notice notice-info">This is your listing. Manage it from your dashboard.</div>
            ) : out ? (
              <div className="notice notice-warn">Out of stock. Check back or message the seller.</div>
            ) : (
              <>
                {!p.is_digital && (
                  <div className="row" style={{ marginBottom: '0.7rem' }}>
                    <label className="label" htmlFor="qty" style={{ margin: 0 }}>Quantity</label>
                    <input
                      id="qty" className="input" type="number" min="1" max={p.stock_quantity}
                      value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                      style={{ width: 90 }}
                    />
                  </div>
                )}
                <button className="btn btn-primary btn-block" disabled={busy} onClick={() => addToCart(true)}>
                  Buy now
                </button>
                <button className="btn btn-ghost btn-block" style={{ marginTop: '0.5rem' }} disabled={busy} onClick={() => addToCart(false)}>
                  Add to cart
                </button>
              </>
            )}
          </div>

          <div className="card">
            <div className="eyebrow">Seller</div>
            <div className="row" style={{ marginTop: '0.7rem' }}>
              <Avatar name={p.seller_name} url={p.seller_avatar} />
              <div>
                <Link to={`/users/${p.seller_id}`} style={{ fontWeight: 500, color: 'var(--ink)' }}>{p.seller_name}</Link>
                <div className="small muted">
                  {titleCase(p.seller_role)}{p.seller_university ? ` · ${p.seller_university}` : ''}
                </div>
              </div>
            </div>
            <div className="row" style={{ gap: '1.5rem', marginTop: '1rem' }}>
              <div><div className="mono" style={{ fontWeight: 600 }}>{num(p.sold_count)}</div><div className="small muted">sold</div></div>
              <div><div className="mono" style={{ fontWeight: 600 }}>{num(p.view_count)}</div><div className="small muted">views</div></div>
            </div>
          </div>

          <div className="card">
            <div className="eyebrow">Listing status</div>
            <div style={{ marginTop: '0.6rem' }}><StatusBadge status={p.status} /></div>
            <p className="small muted" style={{ margin: '0.7rem 0 0' }}>
              Every listing is reviewed by an administrator before it can be bought.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
