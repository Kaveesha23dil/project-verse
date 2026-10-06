import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth, useToast, titleCase } from '../lib/store';
import { Field, PageHead } from '../components/UI';

const TYPES = [
  ['physical', 'Physical item — a prototype, board, kit or device'],
  ['component', 'Component or sensor'],
  ['dataset', 'Dataset'],
  ['digital', 'Digital file'],
  ['license', 'Source or licence'],
  ['service', 'Research service'],
];

export default function SellProduct() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [taxonomy, setTaxonomy] = useState(null);
  const [publications, setPublications] = useState([]);
  const [attrs, setAttrs] = useState([{ name: '', value: '' }]);
  const [images, setImages] = useState(['']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    title: '', shortDescription: '', description: '', categoryId: '', publicationId: '',
    productType: 'physical', conditionType: 'new', price: '', compareAtPrice: '',
    stockQuantity: 1, shippingFee: 0, shipsFromCity: '', digitalFileUrl: '',
  });

  useEffect(() => {
    api.get('/taxonomy').then((r) => setTaxonomy(r.data)).catch(() => {});
    if (['student', 'researcher'].includes(user?.role_code)) {
      api.get('/publications/mine')
        .then((r) => setPublications(r.data.filter((p) => p.status === 'approved')))
        .catch(() => {});
    }
  }, [user]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const isDigital = ['digital', 'dataset', 'license', 'service'].includes(form.productType);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.post('/marketplace/products', {
        title: form.title,
        shortDescription: form.shortDescription || null,
        description: form.description || null,
        categoryId: Number(form.categoryId),
        publicationId: form.publicationId ? Number(form.publicationId) : null,
        productType: form.productType,
        conditionType: isDigital ? 'not_applicable' : form.conditionType,
        price: Number(form.price),
        compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : null,
        stockQuantity: isDigital ? 0 : Number(form.stockQuantity),
        isDigital,
        digitalFileUrl: isDigital ? form.digitalFileUrl || null : null,
        shippingFee: isDigital ? 0 : Number(form.shippingFee || 0),
        shipsFromCity: form.shipsFromCity || null,
        images: images.filter(Boolean),
        attributes: attrs.filter((a) => a.name && a.value),
      });
      toast.ok('Listing sent for approval');
      navigate(`/marketplace/${res.slug}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wrap-narrow">
      <PageHead
        eyebrow="Marketplace"
        title="List something for sale"
        description="An administrator reviews every listing before it can be bought. Physical items need a stock count; digital items are delivered on payment."
      />

      {error && <div className="notice notice-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <form onSubmit={submit} className="card" style={{ padding: '1.75rem' }}>
        <Field label="What are you selling?" required>
          <select className="select" value={form.productType} onChange={set('productType')}>
            {TYPES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
          </select>
        </Field>

        <Field label="Title" required>
          <input className="input" required minLength={6} value={form.title} onChange={set('title')} />
        </Field>

        <Field label="One line summary" hint="Shown on the listing card">
          <input className="input" maxLength={400} value={form.shortDescription} onChange={set('shortDescription')} />
        </Field>

        <Field label="Full description">
          <textarea className="textarea" value={form.description} onChange={set('description')} />
        </Field>

        <div className="grid grid-2" style={{ gap: '0 1rem' }}>
          <Field label="Category" required>
            <select className="select" required value={form.categoryId} onChange={set('categoryId')}>
              <option value="">Choose…</option>
              {taxonomy?.productCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          {publications.length > 0 && (
            <Field label="Linked publication" hint="Optional — connects the listing to your published work">
              <select className="select" value={form.publicationId} onChange={set('publicationId')}>
                <option value="">Not linked</option>
                {publications.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </Field>
          )}
          <Field label="Price (USD)" required>
            <input className="input" type="number" min="0" step="0.01" required value={form.price} onChange={set('price')} />
          </Field>
          <Field label="Compare at price" hint="Optional — shows a strike-through">
            <input className="input" type="number" min="0" step="0.01" value={form.compareAtPrice} onChange={set('compareAtPrice')} />
          </Field>

          {!isDigital && (
            <>
              <Field label="Stock quantity" required>
                <input className="input" type="number" min="1" required value={form.stockQuantity} onChange={set('stockQuantity')} />
              </Field>
              <Field label="Condition">
                <select className="select" value={form.conditionType} onChange={set('conditionType')}>
                  <option value="new">New</option>
                  <option value="used">Used</option>
                  <option value="prototype">Prototype</option>
                </select>
              </Field>
              <Field label="Shipping fee (USD)">
                <input className="input" type="number" min="0" step="0.01" value={form.shippingFee} onChange={set('shippingFee')} />
              </Field>
              <Field label="Ships from">
                <input className="input" value={form.shipsFromCity} onChange={set('shipsFromCity')} />
              </Field>
            </>
          )}
          {isDigital && (
            <Field label="File or delivery link" hint="Given to the buyer once payment clears">
              <input className="input" value={form.digitalFileUrl} onChange={set('digitalFileUrl')} />
            </Field>
          )}
        </div>

        <Field label="Image links" hint="First image becomes the cover">
          <div className="stack" style={{ '--gap': '0.5rem' }}>
            {images.map((url, i) => (
              <input
                key={i} className="input" placeholder="https://…" value={url}
                onChange={(e) => setImages(images.map((u, j) => (j === i ? e.target.value : u)))}
              />
            ))}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setImages([...images, ''])}>
              Add another image
            </button>
          </div>
        </Field>

        <Field label="Specification" hint="Battery, range, format, licence — whatever a buyer needs to decide">
          <div className="stack" style={{ '--gap': '0.5rem' }}>
            {attrs.map((a, i) => (
              <div key={i} className="row">
                <input
                  className="input" placeholder="Name" value={a.name}
                  onChange={(e) => setAttrs(attrs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                />
                <input
                  className="input" placeholder="Value" value={a.value}
                  onChange={(e) => setAttrs(attrs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                />
              </div>
            ))}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAttrs([...attrs, { name: '', value: '' }])}>
              Add a row
            </button>
          </div>
        </Field>

        <button className="btn btn-primary btn-lg btn-block" disabled={busy} style={{ marginTop: '1rem' }}>
          {busy ? 'Sending…' : 'Send listing for approval'}
        </button>
      </form>
    </div>
  );
}
