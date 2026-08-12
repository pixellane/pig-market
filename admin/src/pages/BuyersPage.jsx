import { useEffect, useState } from 'react';
import { api, getAuthHeaders } from '../utils/api.js';
import { formatCurrency } from '../utils/currency.js';

export default function BuyersPage() {
  const [buyers, setBuyers] = useState([]);
  const [productSummary, setProductSummary] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [productSummaryLoading, setProductSummaryLoading] = useState(true);

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

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">Buyers</h1>
        <p className="mt-2 text-slate-600">Customers ranked by total purchases.</p>
      </div>
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-3">
          <button onClick={() => setFilter('All')} className={`rounded-2xl px-4 py-2 text-sm ${filter === 'All' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700'}`}>All</button>
          {availableProducts.map((productName) => (
            <button key={productName} onClick={() => setFilter(productName)} className={`rounded-2xl px-4 py-2 text-sm ${filter === productName ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700'}`}>{productName}</button>
          ))}
        </div>
        {loading ? (
          <p className="text-slate-600">Loading buyers...</p>
        ) : (
          <div className="space-y-4">
            {filteredBuyers.map((buyer, index) => (
              <div key={buyer.contactNumber} className="rounded-3xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <div className="w-full">
                    <p className="text-lg font-semibold text-slate-900">
                      {index === 0 && filter === 'All' ? '🏆 ' : ''}
                      {buyer.customerName}
                    </p>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-slate-700">Orders: {buyer.orderCount}</p>
                      <p className="text-sm text-slate-700">Total KG: {buyer.totalKg.toFixed(1)} kg</p>
                      <p className="text-sm text-slate-700">Total Purchases: {formatCurrency(buyer.totalPurchases)}</p>
                    </div>
                    
                    {buyer.productsPurchased && Object.keys(buyer.productsPurchased).length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-semibold text-slate-900">Products Purchased:</p>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {Object.entries(buyer.productsPurchased).map(([productName, quantity]) => (
                            <span key={productName} className="inline-flex items-center rounded-2xl bg-slate-100 px-3 py-1 text-xs text-slate-700">
                              🥩 {productName} — {quantity} kg
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-3 space-y-1">
                      <p className="text-sm text-slate-500">Contact: {buyer.contactNumber}</p>
                      {buyer.address && <p className="text-sm text-slate-500">Address: {buyer.address}</p>}
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
