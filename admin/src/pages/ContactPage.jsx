import { useEffect, useState } from 'react';
import { api, getAuthHeaders } from '../utils/api.js';
import AdminButton from '../components/AdminButton.jsx';

const initialSettings = {
  storeName: '',
  contactNumber: '',
  email: '',
  address: '',
  facebookUrl: '',
  businessHours: '',
  deliveryInformation: 'Local delivery available within the service area.',
};

export default function ContactPage() {
  const [form, setForm] = useState(initialSettings);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showResetStep, setShowResetStep] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState(null);

  useEffect(() => {
    api.get('/settings')
      .then((response) => {
        const next = {
          ...initialSettings,
          ...response.data,
        };
        setForm(next);
      })
      .catch(() => setError('Unable to load store information.'))
      .finally(() => setLoading(false));
  }, []);

  const handleFieldChange = (event) => {
  const { name, value } = event.target;
  setForm((current) => ({ ...current, [name]: value }));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;
    setMessage('');
    setError('');
    setSaving(true);

    const trimmed = {
      ...form,
      storeName: form.storeName.trim(),
      contactNumber: form.contactNumber.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      facebookUrl: form.facebookUrl.trim(),
      businessHours: form.businessHours || '',
      deliveryInformation: form.deliveryInformation || 'Local delivery available within the service area.',
    };

    if (!trimmed.storeName || !trimmed.contactNumber || !trimmed.email || !trimmed.address || !trimmed.facebookUrl) {
      setError('Please complete all required store settings before saving.');
      setSaving(false);
      return;
    }

    try {
      const url = new URL(trimmed.facebookUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      setError('Please enter a valid Facebook URL starting with http:// or https://');
      setSaving(false);
      return;
    }

    try {
      const response = await api.put('/settings', trimmed, { headers: getAuthHeaders() });
      const next = {
        ...initialSettings,
        ...response.data,
      };
      setForm(next);
      setMessage('Store settings saved successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save store settings.');
    } finally {
      setSaving(false);
    }
  }

    function escapeCsv(value) {
      if (value == null) return '';
      const str = String(value);
      if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
      return str;
    }

    function downloadCsv(filename, headers, rows) {
      const bom = '\uFEFF';
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }

    async function handleExportAll() {
      setExporting(true);
      try {
        const [productsRes, ordersRes, buyersRes] = await Promise.all([
          api.get('/products', { headers: getAuthHeaders() }),
          api.get('/orders', { headers: getAuthHeaders() }),
          api.get('/orders/buyers', { headers: getAuthHeaders() }),
        ]);

        // Products
        const products = productsRes.data || [];
        const prodHeaders = ['Product Name', 'Price per KG', 'Stock KG', 'Stock Status', 'Product ID'];
        const prodRows = products.map((p) => [
          escapeCsv(p.name),
          escapeCsv(p.pricePerKg),
          escapeCsv(Number(p.stockKg).toFixed(2)),
          escapeCsv(p.stockKg <= 0 ? 'Out of Stock' : (p.stockKg <= 5 ? 'Low Stock' : 'Available')),
          escapeCsv(p.id),
        ]);
        downloadCsv('pig-market-products.csv', prodHeaders, prodRows);

        // Orders
        const orders = ordersRes.data || [];
        const orderHeaders = ['Order Number', 'Order ID', 'Date', 'Customer Name', 'Contact Number', 'Address', 'Total', 'Status', 'Order Items'];
        const orderRows = orders.map((o) => [
          escapeCsv(`#${String(o.orderNumber || 0).padStart(4, '0')}`),
          escapeCsv(o.id),
          escapeCsv(new Date(o.createdAt).toISOString()),
          escapeCsv(o.customerName),
          escapeCsv(o.contactNumber),
          escapeCsv(o.address),
          escapeCsv(o.totalAmount),
          escapeCsv(o.status),
          escapeCsv((o.items || []).map((it) => `${it.product?.name || 'Product'} x ${Number(it.quantityKg || 0)}kg`).join('; ')),
        ]);
        downloadCsv('pig-market-orders.csv', orderHeaders, orderRows);

        // Buyers
        const buyers = buyersRes.data || [];
        const buyersHeaders = ['Customer Name', 'Contact Number', 'Total Orders', 'Total Spent', 'Last Order Date'];
        const buyersRows = buyers.map((b) => [
          escapeCsv(b.customerName),
          escapeCsv(b.contactNumber),
          escapeCsv(b.orderCount || 0),
          escapeCsv(b.totalPurchases || 0),
          escapeCsv(b.lastOrderDate || ''),
        ]);
        downloadCsv('pig-market-buyers.csv', buyersHeaders, buyersRows);
      } catch (err) {
        setError('Unable to export all data. Ensure you are signed in as an admin.');
      } finally {
        setExporting(false);
      }
    }

    async function handleResetAll() {
      if (resetConfirmText !== 'RESET ALL DATA') return;
      setResetting(true);
      setResetResult(null);
      setError('');
      try {
        const response = await api.post('/admin/reset-all', { confirmation: resetConfirmText }, { headers: getAuthHeaders() });
        setResetResult(response.data.summary || null);
        setMessage('✅ Reset All Data completed successfully.');
      } catch (err) {
        setError(err.response?.data?.message || 'Reset failed.');
      } finally {
        setResetting(false);
        setShowResetStep(false);
        setResetConfirmText('');
      }
    }

  if (loading) return <div className="py-20 text-center text-slate-600">Loading store information...</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">Store Settings</h1>
        <p className="mt-2 text-slate-600">Manage the contact and opening-hours details customers see on the storefront.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Store Name
            <input name="storeName" value={form.storeName} onChange={handleFieldChange} required className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Phone Number
            <input name="contactNumber" value={form.contactNumber} onChange={handleFieldChange} required className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Email Address
            <input name="email" type="email" value={form.email} onChange={handleFieldChange} required className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Facebook URL
            <input name="facebookUrl" value={form.facebookUrl} onChange={handleFieldChange} required className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
          </label>
          <label className="block text-sm font-medium text-slate-700 md:col-span-2">
            Address
            <textarea name="address" value={form.address} onChange={handleFieldChange} required rows="3" className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
          </label>
        </div>

        {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        {message ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}

        <button type="submit" disabled={saving} className="rounded-2xl bg-rose-600 px-6 py-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
      <div className="space-y-6">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Export All Data</h2>
          <p className="mt-2 text-sm text-slate-600">Download a full backup of products, orders, and buyers before performing any destructive actions.</p>
          <div className="mt-4">
            <AdminButton onClick={handleExportAll} disabled={exporting} variant="outline">{exporting ? 'Exporting...' : 'Export All Data'}</AdminButton>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm border border-rose-100">
          <h2 className="text-xl font-semibold text-rose-700">⚠️ Danger Zone</h2>
          <p className="mt-2 text-sm text-rose-600">Reset All Data — Permanently removes store transaction/history data and prepares the store for a fresh start. This action is irreversible.</p>
          {resetResult && (
            <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">
              <p>Reset summary:</p>
              <pre className="whitespace-pre-wrap text-sm text-emerald-800">{JSON.stringify(resetResult, null, 2)}</pre>
            </div>
          )}
          <div className="mt-4">
            {!showResetStep ? (
              <AdminButton variant="danger" onClick={() => setShowResetStep(true)} disabled={resetting}>Reset All Data</AdminButton>
            ) : (
              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="font-semibold">Are you absolutely sure?</p>
                  <p className="text-sm text-slate-600">Click Continue to proceed to the final confirmation step.</p>
                  <div className="mt-3">
                    <AdminButton variant="outline" onClick={() => setShowResetStep(false)}>Cancel</AdminButton>
                    <AdminButton variant="danger" onClick={() => setShowResetStep(true)} className="ml-2">Continue</AdminButton>
                  </div>
                </div>
                <div className="rounded-2xl border border-rose-100 p-4 bg-rose-50">
                  <p className="font-semibold">Type <strong>RESET ALL DATA</strong> to confirm</p>
                  <input value={resetConfirmText} onChange={(e) => setResetConfirmText(e.target.value)} placeholder="RESET ALL DATA" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3" />
                  <div className="mt-3">
                    <AdminButton variant="danger" onClick={handleResetAll} disabled={resetConfirmText !== 'RESET ALL DATA' || resetting}>{resetting ? 'Resetting...' : 'Confirm Reset'}</AdminButton>
                    <AdminButton variant="secondary" onClick={() => { setShowResetStep(false); setResetConfirmText(''); }} className="ml-2">Cancel</AdminButton>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
