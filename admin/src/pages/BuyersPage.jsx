import { useEffect, useState } from 'react';
import { api, getAuthHeaders } from '../utils/api.js';
import { formatCurrency } from '../utils/currency.js';
import AdminButton from '../components/AdminButton.jsx';

export default function BuyersPage() {
  const [buyers, setBuyers] = useState([]);
  const [productSummary, setProductSummary] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [productSummaryLoading, setProductSummaryLoading] = useState(true);
  const [copiedContact, setCopiedContact] = useState(null);

  useEffect(() => {
    loadBuyers();
    loadProductSummary();
  }, []);

  async function loadBuyers() {
    setLoading(true);
    try {
      const response = await api.get('/orders/buyers', { headers: getAuthHeaders() });
      const parsedBuyers = response.data.map((buyer) => ({
        ...buyer,
        totalKg: Number(buyer.totalKg),
        totalPurchases: Number(buyer.totalPurchases),
        orderCount: Number(buyer.orderCount),
        productNames: buyer.productNames || [],
        productsPurchased: buyer.productsPurchased || {},
      }));
      setBuyers(parsedBuyers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadProductSummary() {
    setProductSummaryLoading(true);
    try {
      const response = await api.get('/orders/product-summary', { headers: getAuthHeaders() });
      setProductSummary(response.data);
    } catch (err) {
      console.error('Error loading product summary:', err);
    } finally {
      setProductSummaryLoading(false);
    }
  }

  const availableProducts = Array.from(new Set(buyers.flatMap((buyer) => buyer.productNames)));
  const filteredBuyers = filter === 'All'
    ? buyers
    : buyers.filter((buyer) => buyer.productNames.includes(filter));

  // CSV helpers
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
    // show a small success message
    setProductSummaryLoading(false);
    setTimeout(() => {}, 0);
  }

  function handleExportBuyers() {
    if (!filteredBuyers.length) {
      // reuse productSummaryLoading as a lightweight message flag
      setProductSummaryLoading(false);
      return;
    }
    const headers = ['Customer Name', 'Contact Number', 'Total Orders', 'Total Spent', 'Last Order Date'];
    const rows = filteredBuyers.map((b) => [
      escapeCsv(b.customerName),
      escapeCsv(b.contactNumber),
      escapeCsv(Number(b.orderCount || b.orderCount === 0 ? b.orderCount : '')),
      escapeCsv(formatCurrency(b.totalPurchases || 0)),
      escapeCsv(b.lastOrderDate || b.lastOrderAt || ''),
    ]);
    downloadCsv('pig-market-buyers.csv', headers, rows);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">Buyers</h1>
        <p className="mt-2 text-slate-600">Customers ranked by total purchases.</p>
      </div>
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-2">
          <button onClick={() => setFilter('All')} aria-label="Filter: All" className={`w-full sm:w-auto rounded-2xl px-3 py-3 text-sm font-semibold ${filter === 'All' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700'}`}>All</button>
          {availableProducts.map((productName) => (
            <button key={productName} onClick={() => setFilter(productName)} aria-label={`Filter: ${productName}`} className={`w-full sm:w-auto rounded-2xl px-3 py-3 text-sm font-semibold ${filter === productName ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700'}`}>{productName}</button>
          ))}
          <div className="ml-auto">
            <AdminButton onClick={handleExportBuyers} variant="outline" size="sm" disabled={!filteredBuyers.length} aria-label="Export buyers as CSV">Export CSV</AdminButton>
          </div>
        </div>
        {loading ? (
          <p className="text-slate-600">Loading buyers...</p>
        ) : (
          <div className="space-y-4">
            {filteredBuyers.map((buyer, index) => (
              <div key={buyer.contactNumber || `${buyer.customerName}-${index}`} className="rounded-3xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="w-full">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-lg font-semibold text-slate-900 truncate">
                        {index === 0 && filter === 'All' ? '🏆 ' : ''}
                        {buyer.customerName}
                      </p>
                      <div className="flex shrink-0 flex-col items-end">
                        <p className="text-sm text-slate-700">Orders</p>
                        <p className="text-lg font-semibold text-slate-900">{buyer.orderCount}</p>
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-1 md:grid-cols-2">
                      <div className="text-sm text-slate-700">Total KG: <span className="font-semibold text-slate-900">{buyer.totalKg.toFixed(1)} kg</span></div>
                      <div className="text-sm text-slate-700">Total Purchases: <span className="font-semibold text-slate-900">{formatCurrency(buyer.totalPurchases)}</span></div>
                    </div>

                    {buyer.productsPurchased && Object.keys(buyer.productsPurchased).length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-semibold text-slate-900">Products Purchased:</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {Object.entries(buyer.productsPurchased).map(([productName, quantity]) => (
                            <span key={productName} className="inline-flex max-w-full items-center rounded-2xl bg-slate-100 px-3 py-1 text-xs text-slate-700">
                              🥩 <span className="truncate font-semibold ml-1">{productName}</span>
                              <span className="ml-2">· {quantity} kg</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-3 space-y-1">
                      <div className="flex items-center gap-3">
                        <p className="text-sm text-slate-500 truncate">Contact: {buyer.contactNumber}</p>
                        <button
                          type="button"
                          onClick={() => {
                            if (navigator?.clipboard) {
                              navigator.clipboard.writeText(buyer.contactNumber || '');
                              setCopiedContact(buyer.contactNumber);
                              setTimeout(() => setCopiedContact(null), 2000);
                            }
                          }}
                          className="ml-2 inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700"
                          aria-label={`Copy contact ${buyer.contactNumber}`}>
                          Copy
                        </button>
                        {copiedContact === buyer.contactNumber && <span className="text-xs text-emerald-600">Copied</span>}
                      </div>
                      {buyer.address && <p className="text-sm text-slate-500 truncate">Address: {buyer.address}</p>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {!filteredBuyers.length && <p className="text-slate-600">No buyers match this filter.</p>}
          </div>
        )}
      </div>
      
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Product Purchase Summary</h2>
        <p className="mt-2 text-slate-600">Products ranked by total sales.</p>
        
        {productSummaryLoading ? (
          <p className="mt-6 text-slate-600">Loading product summary...</p>
        ) : productSummary.length === 0 ? (
          <p className="mt-6 text-slate-600">No product sales data available yet.</p>
        ) : (
          <div className="mt-6 space-y-6">
            {productSummary.map((product) => (
              <div key={product.productId} className="rounded-3xl border border-slate-200 p-5">
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-slate-900">🥩 {product.productName}</h3>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-600">
                    <span>{product.totalBuyers} Buyer{product.totalBuyers === 1 ? '' : 's'}</span>
                    <span>·</span>
                    <span>{product.totalOrders} Order{product.totalOrders === 1 ? '' : 's'}</span>
                    <span>·</span>
                    <span>{product.totalKgSold} kg</span>
                    <span>·</span>
                    <span><strong>{formatCurrency(product.totalSales)}</strong></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
