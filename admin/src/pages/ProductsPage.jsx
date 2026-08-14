import { useEffect, useRef, useState } from 'react';
import { api, getAuthHeaders } from '../utils/api.js';
import { formatCurrency } from '../utils/currency.js';
import AdminButton from '../components/AdminButton.jsx';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const MAX_SIZE = 5 * 1024 * 1024;
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '') || (typeof window !== 'undefined' ? window.location.origin : '');

function resolveImageUrl(url) {
  if (!url) return null;
  if (/^https?:\/\/|^blob:|^data:/i.test(url)) return url;
  if (url.startsWith('/')) return `${API_ORIGIN}${url}`;
  return url;
}

function ImageWithFallback({ src, alt, className }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div className={`flex h-full min-h-[72px] w-full items-center justify-center rounded-3xl border border-slate-200 bg-slate-100 p-4 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 ${className || ''}`}>
        No image available
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

const initialForm = { name: '', description: '', pricePerKg: '', stockKg: '', isActive: true, image: null };

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [productBuyerStats, setProductBuyerStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [formMessage, setFormMessage] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [restockTarget, setRestockTarget] = useState(null);
  const [restockAmount, setRestockAmount] = useState('');
  const [restockMessage, setRestockMessage] = useState('');
  const [restocking, setRestocking] = useState(false);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [buyersTarget, setBuyersTarget] = useState(null);
  const [buyers, setBuyers] = useState([]);
  const [buyersLoading, setBuyersLoading] = useState(false);
  const [buyersError, setBuyersError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('ALL');
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false));
  const nameInputRef = useRef(null);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mediaQuery.matches);
    update();
    mediaQuery.addEventListener?.('change', update);
    return () => mediaQuery.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    if (!editingId) return;
    nameInputRef.current?.focus({ preventScroll: true });
  }, [editingId]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = editingId && isMobile ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [editingId, isMobile]);

  async function loadProducts() {
    setLoading(true);
    setLoadError('');
    try {
      const response = await api.get('/products', { headers: getAuthHeaders() });
      const productsData = (response.data || []).map((product) => ({
        ...product,
        pricePerKg: Number(product.pricePerKg || 0),
        stockKg: Number(product.stockKg || 0),
      }));
      setProducts(productsData);
      
      // Fetch buyer statistics for each product
      await loadProductBuyerStats(productsData);
    } catch (err) {
      console.error(err);
      setLoadError(err?.response?.data?.message || 'Unable to load products.');
    } finally {
      setLoading(false);
    }
  }

  async function loadProductBuyerStats(productsData) {
    const stats = {};
    
    // Only fetch buyer stats for products that might have sales
    const productsToCheck = productsData.filter(product => product.isActive);
    
    await Promise.all(
      productsToCheck.map(async (product) => {
        try {
          const response = await api.get(`/products/${product.id}/buyers`, { headers: getAuthHeaders() });
          if (response.data && response.data.totalBuyers > 0) {
            stats[product.id] = response.data;
          }
        } catch (err) {
          // Silently handle errors for buyer stats - they're supplementary data
          console.warn(`Could not load buyer stats for product ${product.id}:`, err.message);
        }
      })
    );
    
    setProductBuyerStats(stats);
  }

  const clearPreview = () => {
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (name === 'image') {
      const file = files && files[0];
      if (!file) {
        setForm((prev) => ({ ...prev, image: null }));
        return;
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        setFormMessage('Invalid file type. Only JPG, JPEG, and PNG are allowed.');
        e.target.value = '';
        return;
      }
      if (file.size > MAX_SIZE) {
        setFormMessage('File size exceeds the limit of 5MB.');
        e.target.value = '';
        return;
      }

      clearPreview();
      setForm((prev) => ({ ...prev, image: file }));
      setImagePreview(URL.createObjectURL(file));
      setFormMessage('');
      return;
    }
    const newValue = type === 'checkbox' ? checked : value;
    setForm((prev) => ({ ...prev, [name]: newValue }));
  };

  const handleGenerateDescription = async () => {
    if (!form.name.trim()) {
      setFormMessage('Enter a product name first.');
      return;
    }

    try {
      const response = await api.post('/products/generate-description', { name: form.name }, { headers: getAuthHeaders() });
      setForm((prev) => ({ ...prev, description: response.data.description }));
      setFormMessage('Description generated. Review or edit it before saving.');
    } catch (err) {
      console.error(err);
      setFormMessage('Unable to generate description.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormMessage('');

    try {
      const payload = {
        name: form.name,
        description: form.description,
        pricePerKg: Number(form.pricePerKg),
        isActive: form.isActive,
      };
      if (!editingId) {
        payload.stockKg = Number(form.stockKg);
      }
      let product;
      if (editingId) {
        const response = await api.put(`/products/${editingId}`, payload, { headers: getAuthHeaders() });
        product = response.data;
      } else {
        const response = await api.post('/products', payload, { headers: getAuthHeaders() });
        product = response.data;
      }

      if (form.image instanceof File) {
        const data = new FormData();
        data.append('image', form.image);
        await api.post(`/products/${product.id}/image`, data, { headers: getAuthHeaders() });
      }

      setFormMessage(editingId ? 'Product updated.' : 'Product added.');
      clearPreview();
      setForm(initialForm);
      setImagePreview(null);
      setEditingId(null);
      await loadProducts();
    } catch (err) {
      console.error(err);
      const serverMessage = err?.response?.data?.message;
      setFormMessage(serverMessage || 'Unable to save product.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (product) => {
    clearPreview();
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description,
      pricePerKg: Number(product.pricePerKg),
      stockKg: Number(product.stockKg),
      isActive: product.isActive,
      image: null,
    });
    setImagePreview(resolveImageUrl(product.imageUrl));
    setFormMessage('');
  };

  const handleDelete = async (id) => {
    try {
      setDeleting(true);
      await api.delete(`/products/${id}`, { headers: getAuthHeaders() });
      setFormMessage('Product deactivated.');
      setDeleteTarget(null);
      await loadProducts();
    } catch (err) {
      console.error(err);
      setFormMessage(err.response?.data?.message || 'Unable to delete product.');
    } finally {
      setDeleting(false);
    }
  };

  const handleCancel = () => {
    clearPreview();
    setEditingId(null);
    setForm(initialForm);
    setImagePreview(null);
    setFormMessage('');
  };

  function stockStatus(stockKg) {
    const stock = Number(stockKg);
    if (stock <= 0) return { label: '🔴 Out of Stock', className: 'bg-rose-100 text-rose-700', key: 'OUT_OF_STOCK' };
    if (stock <= 5) return { label: '🟡 Low Stock', className: 'bg-amber-100 text-amber-800', key: 'LOW_STOCK' };
    return { label: '🟢 Available', className: 'bg-emerald-100 text-emerald-700', key: 'AVAILABLE' };
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch = !searchTerm || product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const stockKey = stockStatus(product.stockKg).key;
    const matchesStock = stockFilter === 'ALL' || stockKey === stockFilter;
    return matchesSearch && matchesStock;
  });

  const totalProducts = products.length;
  const availableProducts = products.filter((product) => Number(product.stockKg) > 5).length;
  const lowStockItems = products.filter((product) => Number(product.stockKg) > 0 && Number(product.stockKg) <= 5).length;
  const outOfStockItems = products.filter((product) => Number(product.stockKg) <= 0).length;

  const summaryCards = [
    { label: 'Total Products', value: totalProducts, accent: 'bg-slate-50 border-slate-200 text-slate-900', meta: 'Currently active products' },
    { label: 'Available', value: availableProducts, accent: 'bg-emerald-50 border-emerald-100 text-emerald-700', meta: 'Stock greater than 5 kg' },
    { label: 'Low Stock', value: lowStockItems, accent: 'bg-amber-50 border-amber-100 text-amber-800', meta: '1–5 kg remaining' },
    { label: 'Out of Stock', value: outOfStockItems, accent: 'bg-rose-50 border-rose-100 text-rose-700', meta: 'No stock available' },
  ];

  // CSV export helper (kept local and simple to avoid new deps)
  function escapeCsv(value) {
    if (value == null) return '';
    const str = String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
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
    setFormMessage('CSV exported successfully.');
    setTimeout(() => setFormMessage(''), 3000);
  }

  function handleExportProducts() {
    if (!filteredProducts.length) {
      setFormMessage('No data to export.');
      setTimeout(() => setFormMessage(''), 3000);
      return;
    }
    const headers = ['Product Name', 'Price per KG', 'Stock KG', 'Stock Status', 'Product ID'];
    const rows = filteredProducts.map((p) => [
      escapeCsv(p.name),
      escapeCsv(formatCurrency(p.pricePerKg)),
      escapeCsv(Number(p.stockKg).toFixed(2)),
      escapeCsv(stockStatus(p.stockKg).label),
      escapeCsv(p.id),
    ]);
    downloadCsv('pig-market-products.csv', headers, rows);
  }

  async function confirmRestock() {
    const quantityKg = Number(restockAmount);
    if (!Number.isFinite(quantityKg) || quantityKg <= 0) {
      setRestockMessage('Enter a stock amount greater than 0.');
      return;
    }
    setRestocking(true);
    setRestockMessage('');
    try {
      await api.post(`/products/${restockTarget.id}/restock`, { quantityKg }, { headers: getAuthHeaders() });
      setRestockTarget(null);
      setRestockAmount('');
      setFormMessage(`${restockTarget.name} restocked successfully.`);
      await loadProducts();
    } catch (err) {
      setRestockMessage(err.response?.data?.message || 'Unable to restock product.');
    } finally { setRestocking(false); }
  }

  async function openHistory(product) {
    setHistoryTarget(product);
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const response = await api.get(`/products/${product.id}/inventory-history`, { headers: getAuthHeaders() });
      setHistory(response.data);
    } catch (err) {
      setHistoryError(err.response?.data?.message || 'Unable to load inventory history.');
    } finally { setHistoryLoading(false); }
  }

  async function openBuyers(product) {
    setBuyersTarget(product);
    setBuyersLoading(true);
    setBuyersError('');
    setBuyers([]);
    try {
      const response = await api.get(`/products/${product.id}/buyers`, { headers: getAuthHeaders() });
      setBuyers(response.data);
    } catch (err) {
      setBuyersError(err.response?.data?.message || 'Unable to load product buyers.');
    } finally { setBuyersLoading(false); }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Products</h1>
            <p className="mt-2 text-slate-600">View and manage product inventory.</p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div key={card.label} className={`rounded-3xl border p-5 ${card.accent}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em]">{card.label}</p>
              <p className="mt-4 text-3xl font-bold text-slate-900">{card.value}</p>
              <p className="mt-3 text-sm text-slate-600">{card.meta}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Product list</h2>
              <p className="mt-1 text-sm text-slate-500">Manage inventory, pricing, and images in one place.</p>
            </div>
            <div className="flex items-center gap-2">
              <AdminButton onClick={handleExportProducts} variant="outline" size="sm" disabled={!filteredProducts.length} aria-label="Export products as CSV">
                Export CSV
              </AdminButton>
            </div>
          </div>
          {loadError && (
            <div className="mb-4 rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <div>{loadError}</div>
              <button
                type="button"
                onClick={loadProducts}
                className="mt-3 inline-flex rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
              >
                Retry
              </button>
            </div>
          )}
          {loading ? (
            <p className="text-slate-600">Loading products...</p>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search products"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none ring-0"
                />
                <div className="flex flex-wrap gap-2">
                  {[
                    ['ALL', 'All'],
                    ['AVAILABLE', 'Available'],
                    ['LOW_STOCK', 'Low Stock'],
                    ['OUT_OF_STOCK', 'Out of Stock'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setStockFilter(value)}
                      className={`rounded-2xl px-3 py-2 text-xs font-semibold ${stockFilter === value ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border border-slate-200'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredProducts.map((product) => {
                const src = resolveImageUrl(product.imageUrl);
                const stock = stockStatus(product.stockKg);
                return (
                  <div key={product.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="grid gap-4 lg:grid-cols-[112px_minmax(0,1fr)]">
                  <div className="h-28 w-full overflow-hidden rounded-3xl bg-slate-100">
                    <ImageWithFallback src={src} alt={product.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-lg font-semibold text-slate-900">{product.name}</p>
                        <p className="text-sm text-slate-600 line-clamp-2">{product.description}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${product.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {product.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3 text-sm text-slate-700">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">{formatCurrency(product.pricePerKg)} / kg</div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">Stock: {Number(product.stockKg).toFixed(2)} kg</div>
                      <div className={`rounded-2xl border px-3 py-2 text-xs font-semibold ${stock.className}`}>{stock.label}</div>
                    </div>
                    {productBuyerStats[product.id] && productBuyerStats[product.id].totalBuyers > 0 && (
                      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                        🥩 {productBuyerStats[product.id].totalBuyers} Buyer{productBuyerStats[product.id].totalBuyers === 1 ? '' : 's'} · {productBuyerStats[product.id].totalOrders || 0} Order{(productBuyerStats[product.id].totalOrders || 0) === 1 ? '' : 's'} · {productBuyerStats[product.id].totalKgSold} kg · {formatCurrency(productBuyerStats[product.id].totalSales)}
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
                      <button onClick={() => handleEdit(product)} aria-label={`Edit ${product.name}`} className="w-full sm:w-auto rounded-2xl bg-rose-600 px-4 py-3 text-sm text-white">Edit</button>
                      <button onClick={() => setDeleteTarget(product)} aria-label={`Delete ${product.name}`} className="w-full sm:w-auto rounded-2xl bg-slate-200 px-4 py-3 text-sm text-slate-700">Delete</button>
                      <button onClick={() => { setRestockTarget(product); setRestockAmount(''); setRestockMessage(''); }} aria-label={`Restock ${product.name}`} className="w-full sm:w-auto rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white">Restock</button>
                      <button onClick={() => openHistory(product)} aria-label={`Inventory history for ${product.name}`} className="w-full sm:w-auto rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">Inventory History</button>
                      <button onClick={() => openBuyers(product)} aria-label={`View buyers for ${product.name}`} className="w-full sm:w-auto rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white">View Buyers</button>
                    </div>
                  </div>
                </div>
              </div>
                );
              })}
              {!filteredProducts.length && <p className="text-slate-600">No products found.</p>}
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{editingId ? 'Edit product' : 'Add product'}</h2>
              <p className="mt-1 text-sm text-slate-500">{editingId ? 'Update product information without changing inventory.' : 'Create a new product with a preview-ready image.'}</p>
            </div>
          </div>

          {isMobile && editingId ? (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 sm:p-4">
              <div className="w-full max-w-2xl rounded-t-[28px] border border-slate-200 bg-white shadow-2xl sm:rounded-[28px]">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-6">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">Edit product</p>
                    <p className="text-sm text-slate-500">Update details and image.</p>
                  </div>
                  <button type="button" onClick={handleCancel} className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
                    Close
                  </button>
                </div>
                <div className="max-h-[80dvh] overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Product image</p>
                          <p className="mt-1 text-xs text-slate-500">Upload a JPG or PNG file.</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${form.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {form.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="mt-4">
                        <ImageWithFallback src={imagePreview} alt={form.name || 'Product image preview'} className="h-56 w-full rounded-3xl object-cover" />
                      </div>
                      <label className="mt-4 block text-sm text-slate-700">
                        Choose image
                        <input type="file" name="image" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={handleChange} className="mt-2 block w-full text-sm text-slate-700 file:mr-4 file:rounded-2xl file:border-0 file:bg-rose-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-rose-700" />
                      </label>
                      <p className="mt-2 text-xs text-slate-500">Optional. JPG, JPEG, or PNG up to 5MB.</p>
                      {editingId && (
                        <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm">
                          <p className="text-sm text-slate-500">Current stock</p>
                          <p className="mt-2 text-2xl font-semibold text-slate-900">{Number(form.stockKg || 0).toFixed(2)} kg</p>
                          <p className="mt-1 text-sm text-slate-600">Stock is updated through restocking only.</p>
                        </div>
                      )}
                    </div>

                    <label className="block text-sm text-slate-700">
                      Product name
                      <input ref={nameInputRef} name="name" value={form.name} onChange={handleChange} required className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3" />
                    </label>

                    <label className="block text-sm text-slate-700">
                      Description
                      <textarea name="description" value={form.description} onChange={handleChange} rows="4" required className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3" />
                    </label>

                    <button type="button" onClick={handleGenerateDescription} className="rounded-2xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900">
                      {editingId ? 'Regenerate description' : 'Generate description'}
                    </button>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-sm text-slate-700">
                        Price per kg
                        <input type="number" step="0.01" name="pricePerKg" value={form.pricePerKg} onChange={handleChange} required className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3" />
                      </label>
                      {!editingId && (
                        <label className="block text-sm text-slate-700">
                          Initial stock
                          <input type="number" step="0.1" name="stockKg" value={form.stockKg} onChange={handleChange} required className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3" />
                        </label>
                      )}
                    </div>

                    <label className="flex items-center gap-3 text-sm text-slate-700">
                      <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} className="h-5 w-5 rounded" />
                      Active
                    </label>

                    {formMessage && <p className="text-sm text-rose-600">{formMessage}</p>}

                    <div className="flex flex-wrap gap-3 pt-2">
                      <button type="button" onClick={handleCancel} className="flex-1 rounded-2xl bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 sm:flex-none">Cancel</button>
                      <button type="submit" disabled={submitting} className="flex-1 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none">
                        {submitting ? (editingId ? 'Saving changes...' : 'Creating product...') : (editingId ? 'Save changes' : 'Create product')}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Product image</p>
                    <p className="mt-1 text-xs text-slate-500">Upload a JPG or PNG file.</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${form.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {form.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="mt-4">
                  <ImageWithFallback src={imagePreview} alt={form.name || 'Product image preview'} className="h-64 w-full rounded-3xl object-cover" />
                </div>
                <label className="mt-4 block text-sm text-slate-700">
                  Choose image
                  <input type="file" name="image" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={handleChange} className="mt-2 block w-full text-sm text-slate-700 file:mr-4 file:rounded-2xl file:border-0 file:bg-rose-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-rose-700" />
                </label>
                <p className="mt-2 text-xs text-slate-500">Optional. JPG, JPEG, or PNG up to 5MB.</p>
                {editingId && (
                  <div className="mt-6 rounded-3xl bg-white p-4 shadow-sm">
                    <p className="text-sm text-slate-500">Current stock</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{Number(form.stockKg || 0).toFixed(2)} kg</p>
                    <p className="mt-1 text-sm text-slate-600">Stock is updated through restocking only.</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <label className="block text-sm text-slate-700">
                  Product name
                  <input ref={nameInputRef} name="name" value={form.name} onChange={handleChange} required className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3" />
                </label>

                <label className="block text-sm text-slate-700">
                  Description
                  <textarea name="description" value={form.description} onChange={handleChange} rows="4" required className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3" />
                </label>

                <button type="button" onClick={handleGenerateDescription} className="rounded-2xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900">
                  {editingId ? 'Regenerate description' : 'Generate description'}
                </button>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm text-slate-700">
                    Price per kg
                    <input type="number" step="0.01" name="pricePerKg" value={form.pricePerKg} onChange={handleChange} required className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3" />
                  </label>
                  {!editingId && (
                    <label className="block text-sm text-slate-700">
                      Initial stock
                      <input type="number" step="0.1" name="stockKg" value={form.stockKg} onChange={handleChange} required className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3" />
                    </label>
                  )}
                </div>

                <label className="flex items-center gap-3 text-sm text-slate-700">
                  <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} className="h-5 w-5 rounded" />
                  Active
                </label>

                {formMessage && <p className="text-sm text-rose-600">{formMessage}</p>}

                <div className="flex flex-wrap gap-3">
                  <button type="submit" disabled={submitting} className="rounded-2xl bg-rose-600 px-6 py-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60">
                    {submitting ? (editingId ? 'Saving changes...' : 'Creating product...') : (editingId ? 'Save changes' : 'Create product')}
                  </button>
                  {editingId && (
                    <button type="button" onClick={handleCancel} className="rounded-2xl bg-slate-200 px-6 py-3 text-sm text-slate-700">Cancel</button>
                  )}
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
      {deleteTarget && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-slate-900">Delete Product?</h2>
            <p className="mt-4 text-sm text-slate-700">This will deactivate <strong>{deleteTarget.name}</strong>.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">Cancel</button>
              <button type="button" onClick={() => handleDelete(deleteTarget.id)} disabled={deleting} className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      {restockTarget && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-slate-900">RESTOCK PRODUCT</h2>
            <p className="mt-4 text-sm text-slate-700">Product: <strong>{restockTarget.name}</strong></p>
            <p className="text-sm text-slate-700">Current Stock: <strong>{Number(restockTarget.stockKg).toFixed(2)} kg</strong></p>
            <label className="mt-5 block text-sm font-semibold text-slate-700">Add Stock
              <input type="number" min="0.01" step="0.01" value={restockAmount} onChange={(event) => setRestockAmount(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" autoFocus />
            </label>
            <p className="mt-3 text-sm text-slate-600">New Stock: <strong>{(Number(restockTarget.stockKg) + (Number(restockAmount) || 0)).toFixed(2)} kg</strong></p>
            {restockMessage && <p className="mt-3 text-sm text-rose-600">{restockMessage}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setRestockTarget(null)} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">Cancel</button>
              <button type="button" onClick={confirmRestock} disabled={restocking} className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{restocking ? 'Restocking...' : 'Confirm Restock'}</button>
            </div>
          </div>
        </div>
      )}
      {historyTarget && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4"><h2 className="text-xl font-bold text-slate-900">Inventory History: {historyTarget.name}</h2><button type="button" onClick={() => setHistoryTarget(null)} className="rounded-2xl bg-slate-100 px-3 py-3 text-sm text-slate-700">Close</button></div>
            {historyLoading && <p className="mt-6 text-slate-600">Loading inventory history...</p>}
            {historyError && <p className="mt-6 text-rose-600">{historyError}</p>}
            {!historyLoading && !historyError && !history.length && <p className="mt-6 text-slate-600">No inventory changes recorded yet.</p>}
            {!historyLoading && !historyError && history.length > 0 && <div className="mt-6 space-y-3">{history.map((entry) => <div key={entry.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-slate-900">{entry.reason.replaceAll('_', ' ')}</p><p className="text-sm text-slate-600">{new Date(entry.createdAt).toLocaleString()}</p></div><p className={`font-bold ${Number(entry.changeKg) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{Number(entry.changeKg) >= 0 ? '+' : ''}{Number(entry.changeKg).toFixed(2)} kg</p></div><p className="mt-2 text-sm text-slate-600">{Number(entry.previousStockKg).toFixed(2)} kg → {Number(entry.newStockKg).toFixed(2)} kg{entry.orderId ? ` · Order ${entry.orderId}` : ''}</p></div>)}</div>}
          </div>
        </div>
      )}
      {buyersTarget && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[80vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Product Buyers: {buyersTarget.name}</h2>
                {!buyersLoading && !buyersError && buyers.totalBuyers > 0 && (
                  <p className="mt-1 text-sm text-slate-600">
                    {buyers.totalBuyers} Buyer{buyers.totalBuyers === 1 ? '' : 's'} · {buyers.totalKgSold} kg · {formatCurrency(buyers.totalSales)}
                  </p>
                )}
              </div>
              <button type="button" onClick={() => setBuyersTarget(null)} className="rounded-2xl bg-slate-100 px-3 py-3 text-sm text-slate-700">Close</button>
            </div>
            
            {buyersLoading && <p className="mt-6 text-slate-600">Loading buyers...</p>}
            {buyersError && <p className="mt-6 text-rose-600">{buyersError}</p>}
            {!buyersLoading && !buyersError && buyers.totalBuyers === 0 && (
              <p className="mt-6 text-slate-600">No buyers found for this product yet.</p>
            )}
            {!buyersLoading && !buyersError && buyers.totalBuyers > 0 && (
              <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm text-blue-700">
                  🥩 This product has been purchased by <strong>{buyers.totalBuyers} unique buyer{buyers.totalBuyers === 1 ? '' : 's'}</strong> across <strong>{buyers.totalOrders || 0} order{(buyers.totalOrders || 0) === 1 ? '' : 's'}</strong>, totaling <strong>{buyers.totalKgSold} kg</strong> sold for <strong>{formatCurrency(buyers.totalSales)}</strong>.
                </p>
                <p className="mt-2 text-xs text-blue-600">
                  For detailed buyer information, please refer to the Buyers section.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
