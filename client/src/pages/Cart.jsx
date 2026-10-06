import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAsync, useToast, money, titleCase } from '../lib/store';
import { Empty, Field, Loading, Modal, PageHead } from '../components/UI';

function AddressForm({ onSaved, onCancel }) {
  const toast = useToast();
  const [form, setForm] = useState({
    label: 'Home', recipientName: '', phone: '', line1: '', line2: '',
    city: '', district: '', postalCode: '', country: 'Sri Lanka', isDefault: true,
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/addresses', form);
      toast.ok('Address saved');
      onSaved();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <div className="grid grid-2" style={{ gap: '0 1rem' }}>
        <Field label="Recipient" required><input className="input" required value={form.recipientName} onChange={set('recipientName')} /></Field>
        <Field label="Phone" required><input className="input" required value={form.phone} onChange={set('phone')} /></Field>
      </div>
      <Field label="Address line 1" required><input className="input" required value={form.line1} onChange={set('line1')} /></Field>
      <Field label="Address line 2"><input className="input" value={form.line2} onChange={set('line2')} /></Field>
      <div className="grid grid-2" style={{ gap: '0 1rem' }}>
        <Field label="City" required><input className="input" required value={form.city} onChange={set('city')} /></Field>
        <Field label="District"><input className="input" value={form.district} onChange={set('district')} /></Field>
        <Field label="Postal code"><input className="input" value={form.postalCode} onChange={set('postalCode')} /></Field>
        <Field label="Country"><input className="input" value={form.country} onChange={set('country')} /></Field>
      </div>
      <div className="row" style={{ gap: '0.6rem' }}>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save address'}</button>
        <button className="btn btn-ghost" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default function Cart() {
  const toast = useToast();
  const navigate = useNavigate();
  const { data, loading, reload } = useAsync(() => api.get('/marketplace/cart'), []);
  const [addresses, setAddresses] = useState([]);
  const [addressId, setAddressId] = useState('');
  const [showAddress, setShowAddress] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const loadAddresses = () => api.get('/addresses').then((r) => {
    setAddresses(r.data);
    const def = r.data.find((a) => a.is_default) || r.data[0];
    if (def) setAddressId(String(def.id));
    setShowAddress(false);
  }).catch(() => {});

  useEffect(() => { loadAddresses(); }, []);

  const items = data?.data?.items || [];
  const totals = data?.data?.totals;
  const needsAddress = items.some((i) => !i.is_digital);

  const setQty = async (itemId, quantity) => {
    try {
      await api.patch(`/marketplace/cart/${itemId}`, { quantity });
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const checkout = async () => {
    setBusy(true);
    try {
      const res = await api.post('/marketplace/checkout', {
        shippingAddressId: needsAddress ? Number(addressId) : null,
        buyerNote: note || undefined,
      });
      toast.ok(`Order ${res.data.orderNo} placed`);
      navigate(`/orders/${res.data.orderNo}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="wrap"><Loading rows={3} /></div>;

  if (!items.length) {
    return (
      <div className="wrap-narrow">
        <PageHead eyebrow="Cart" title="Your cart is empty" />
        <Empty title="Nothing here yet" action={<Link className="btn btn-primary" to="/marketplace">Browse the marketplace</Link>}>
          Prototypes, datasets, components and research services from across the network.
        </Empty>
      </div>
    );
  }

  return (
    <div className="wrap">
      <PageHead eyebrow="Cart" title="Checkout" />

      <div className="split-wide">
        <div className="stack">
          {items.map((i) => (
            <div key={i.id} className="card row commerce-item" style={{ gap: '1rem', alignItems: 'flex-start' }}>
              <div className="thumb thumb-square" style={{ width: 92, flexShrink: 0 }}>
                {i.image_url ? <img src={i.image_url} alt="" /> : 'PV'}
              </div>
              <div className="grow">
                <Link to={`/marketplace/${i.slug}`} style={{ fontWeight: 500, color: 'var(--ink)' }}>{i.title}</Link>
                <div className="small muted">Sold by {i.seller_name}</div>
                <div className="wrap-row" style={{ marginTop: '0.6rem', gap: '0.5rem' }}>
                  <input
                    className="input" type="number" min="1" style={{ width: 80 }}
                    value={i.quantity} onChange={(e) => setQty(i.id, Number(e.target.value))}
                    aria-label={`Quantity for ${i.title}`}
                    disabled={i.is_digital}
                  />
                  <button className="btn btn-quiet btn-sm" onClick={() => setQty(i.id, 0)}>Remove</button>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="price" style={{ fontSize: 'var(--step-1)' }}>{money(i.price * i.quantity, i.currency)}</div>
                {!i.is_digital && i.shipping_fee > 0 && (
                  <div className="small muted mono">+{money(i.shipping_fee)} shipping</div>
                )}
              </div>
            </div>
          ))}

          {needsAddress && (
            <div className="card">
              <div className="row-between" style={{ marginBottom: '0.8rem' }}>
                <h4 style={{ margin: 0 }}>Delivery address</h4>
                {!showAddress && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowAddress(true)}>Add new</button>
                )}
              </div>
              {showAddress ? (
                <AddressForm onSaved={loadAddresses} onCancel={() => setShowAddress(false)} />
              ) : addresses.length ? (
                <div className="stack" style={{ '--gap': '0.5rem' }}>
                  {addresses.map((a) => (
                    <label key={a.id} className="check card" style={{ padding: '0.8rem', margin: 0 }}>
                      <input
                        type="radio" name="address" value={a.id}
                        checked={String(addressId) === String(a.id)}
                        onChange={(e) => setAddressId(e.target.value)}
                      />
                      <span>
                        <strong>{a.recipient_name}</strong>{a.label ? ` · ${a.label}` : ''}
                        <div className="small muted">
                          {[a.line1, a.line2, a.city, a.district, a.postal_code, a.country].filter(Boolean).join(', ')}
                        </div>
                        <div className="small mono muted">{a.phone}</div>
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="muted small">Add an address to receive the physical items in this order.</p>
              )}
            </div>
          )}

          <div className="card">
            <Field label="Note for the sellers" hint="Optional">
              <textarea className="textarea" style={{ minHeight: 70 }} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </div>
        </div>

        <aside className="sidebar">
          <div className="card">
            <h4>Order summary</h4>
            <table className="table" style={{ marginTop: '0.6rem' }}>
              <tbody>
                <tr><td className="muted">Subtotal</td><td className="mono" style={{ textAlign: 'right' }}>{money(totals.subtotal)}</td></tr>
                <tr><td className="muted">Shipping</td><td className="mono" style={{ textAlign: 'right' }}>{money(totals.shipping)}</td></tr>
                <tr><td className="muted">Platform fee</td><td className="mono" style={{ textAlign: 'right' }}>{money(totals.platformFee)}</td></tr>
                <tr>
                  <td><strong>Total</strong></td>
                  <td className="mono" style={{ textAlign: 'right' }}><strong>{money(totals.grandTotal)}</strong></td>
                </tr>
              </tbody>
            </table>
            <button
              className="btn btn-primary btn-block btn-lg"
              style={{ marginTop: '1rem' }}
              disabled={busy || (needsAddress && !addressId)}
              onClick={checkout}
            >
              {busy ? 'Placing order…' : 'Place order'}
            </button>
            {needsAddress && !addressId && (
              <p className="hint" style={{ marginTop: '0.6rem' }}>Choose a delivery address to continue.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
