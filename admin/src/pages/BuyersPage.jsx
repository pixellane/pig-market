import { useEffect, useState } from 'react';
import { api, getAuthHeaders } from '../utils/api.js';

export default function BuyersPage() {
  const [buyers, setBuyers] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBuyers();
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
      }));
      setBuyers(parsedBuyers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const products = Array.from(new Set(buyers.flatMap((buyer) => buyer.productNames)));
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
          {products.map((productName) => (
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
                  <div>
                    <p className="text-lg font-semibold text-slate-900">
                      {index === 0 && filter === 'All' ? '🏆 ' : ''}
                      {buyer.customerName}
                    </p>
                    <p className="mt-2 text-sm text-slate-700">Orders: {buyer.orderCount}</p>
                    <p className="text-sm text-slate-700">Total KG: {buyer.totalKg.toFixed(1)} kg</p>
                    <p className="text-sm text-slate-700">Total Purchases: ₱{buyer.totalPurchases.toFixed(2)}</p>
                    <p className="mt-2 text-sm text-slate-500">Contact: {buyer.contactNumber}</p>
                    {buyer.address && <p className="text-sm text-slate-500">Address: {buyer.address}</p>}
                  </div>
                </div>
              </div>
            ))}
            {!filteredBuyers.length && <p className="text-slate-600">No buyers match this filter.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
