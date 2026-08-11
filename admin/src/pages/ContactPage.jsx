import { useEffect, useState } from 'react';
import { api, getAuthHeaders } from '../utils/api.js';

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
    </div>
  );
}
