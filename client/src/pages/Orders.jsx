import { Link, useParams } from 'react-router-dom';
import api from '../lib/api';
import { useAsync, money, date, titleCase } from '../lib/store';
import { Empty, Loading, PageHead, StatusBadge } from '../components/UI';

function OrderDetail({ orderNo }) {
  const { data, loading } = useAsync(() => api.get(`/marketplace/orders/${orderNo}`), [orderNo]);
  if (loading) return <Loading rows={3} />;
  const o = data?.data;
  if (!o) return <Empty title="That order is not available" />;

  return (
    <>
      <PageHead
        eyebrow={`Order ${o.order_no}`}
        title={`Placed ${date(o.placed_at)}`}
        actions={<Link className="btn btn-ghost" to="/orders">All orders</Link>}
      />
      <div className="split-wide">
        <div className="stack">
          {o.items.map((i) => (
            <div key={i.id} className="card row commerce-item" style={{ gap: '1rem' }}>
              <div className="thumb thumb-square" style={{ width: 78, flexShrink: 0 }}>
                {i.image_snapshot ? <img src={i.image_snapshot} alt="" /> : 'PV'}
              </div>
              <div className="grow">
                {i.product_slug
                  ? <Link to={`/marketplace/${i.product_slug}`} style={{ fontWeight: 500, color: 'var(--ink)' }}>{i.title_snapshot}</Link>
                  : <strong>{i.title_snapshot}</strong>}
                <div className="small muted">Sold by {i.seller_name} · quantity {i.quantity}</div>
                {i.tracking_no && <div className="small mono muted">Tracking {i.tracking_no}</div>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="mono">{money(i.line_total, o.currency)}</div>
                <StatusBadge status={i.item_status} />
              </div>
            </div>
          ))}
        </div>

        <aside className="sidebar stack">
          <div className="card">
            <h4>Summary</h4>
            <table className="table">
              <tbody>
                <tr><td className="muted">Subtotal</td><td className="mono" style={{ textAlign: 'right' }}>{money(o.subtotal, o.currency)}</td></tr>
                <tr><td className="muted">Shipping</td><td className="mono" style={{ textAlign: 'right' }}>{money(o.shipping_total, o.currency)}</td></tr>
                <tr><td className="muted">Platform fee</td><td className="mono" style={{ textAlign: 'right' }}>{money(o.platform_fee, o.currency)}</td></tr>
                <tr><td><strong>Total</strong></td><td className="mono" style={{ textAlign: 'right' }}><strong>{money(o.grand_total, o.currency)}</strong></td></tr>
              </tbody>
            </table>
            <div className="row-between" style={{ marginTop: '0.8rem' }}>
              <span className="small muted">Payment</span>
              <StatusBadge status={o.payment_status} />
            </div>
          </div>
          {o.address && (
            <div className="card">
              <div className="eyebrow">Delivery</div>
              <p className="small" style={{ margin: '0.6rem 0 0' }}>
                <strong>{o.address.recipient_name}</strong><br />
                {[o.address.line1, o.address.line2, o.address.city, o.address.district, o.address.postal_code, o.address.country].filter(Boolean).join(', ')}<br />
                <span className="mono">{o.address.phone}</span>
              </p>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

export default function Orders() {
  const { orderNo } = useParams();
  const { data, loading } = useAsync(() => api.get('/marketplace/orders'), [], { immediate: !orderNo });

  if (orderNo) return <div className="wrap"><OrderDetail orderNo={orderNo} /></div>;
  if (loading) return <div className="wrap"><Loading rows={3} /></div>;

  const orders = data?.data || [];

  return (
    <div className="wrap">
      <PageHead eyebrow="Purchases" title="Your orders" />
      {orders.length === 0 ? (
        <Empty title="No orders yet" action={<Link className="btn btn-primary" to="/marketplace">Browse the marketplace</Link>}>
          Anything you buy shows up here with its delivery status.
        </Empty>
      ) : (
        <div className="card table-wrap" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Order</th><th>Placed</th><th>Items</th><th>Total</th><th>Status</th><th />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="mono">{o.order_no}</td>
                  <td>{date(o.placed_at)}</td>
                  <td className="mono">{o.item_count}</td>
                  <td className="mono">{money(o.grand_total, o.currency)}</td>
                  <td><StatusBadge status={o.order_status} /></td>
                  <td style={{ textAlign: 'right' }}>
                    <Link className="btn btn-ghost btn-sm" to={`/orders/${o.order_no}`}>View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
