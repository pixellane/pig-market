import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { formatCurrency } from '../utils/currency.js';
import { getApiBasePath } from '../utils/apiUrl.js';

const api = axios.create({ baseURL: getApiBasePath() || '/api' });

const PRODUCT_FILTERS = [
  'All Products',
  'Pork Chop',
  'Pork Belly',
  'Pork Shoulder',
  'Pork Ribs',
  'Pork Loin',
  'Pork Tenderloin',
  'Ham',
];

export default function BuyersPage() {
  const [buyers, setBuyers] = useState([]);
  const [filter, setFilter] = useState('All Products');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const response = await api.get('/orders/buyers/public');
        setBuyers(response.data);
      } catch (err) {
        setError('Unable to load buyers.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredBuyers = useMemo(() => {
    if (filter === 'All Products') return buyers;
    return buyers.filter((buyer) => (buyer.productNames || []).includes(filter));
  }, [buyers, filter]);

  return (
    <div className="space-y-6">
      <section className="market-card overflow-hidden">
        <div className="bg-gradient-to-br from-burgundy to-burgundy-deep px-6 py-8 text-cream sm:px-8">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">🐷 Our Buyers</h1>
          <p className="mt-2 text-cream/85">See who&apos;s enjoying Fresh Pork Meat!</p>
        </div>
      </section>

      <section className="market-card p-4 sm:p-5">
        <label className="block text-sm font-semibold text-burgundy/75" htmlFor="buyer-product-filter">
          Filter by Product
          <select
            id="buyer-product-filter"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="mt-2 min-h-[48px] w-full rounded-2xl border border-burgundy/15 bg-cream-50 px-4 py-3 text-sm font-semibold text-burgundy outline-none focus:border-burgundy/40 sm:max-w-sm"
          >
            {PRODUCT_FILTERS.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
      </section>

      {loading ? (
        <div className="py-16 text-center text-burgundy/60">Loading buyers...</div>
      ) : error ? (
        <div className="py-16 text-center text-burgundy">{error}</div>
      ) : (
        <div className="space-y-3">
          {filteredBuyers.map((buyer, index) => (
            <article
              key={`${buyer.customerName}-${index}`}
              className={`market-card p-5 transition hover:-translate-y-0.5 hover:shadow-soft sm:p-6 ${
                index === 0 ? 'ring-2 ring-burgundy/20' : ''
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cream-100 text-xl">
                  {index === 0 ? '🏆' : '🐷'}
                </div>
                <div className="min-w-0">
                  <h2 className="break-words font-display text-xl font-bold text-burgundy sm:text-2xl">{buyer.customerName}</h2>
                  <p className="mt-1 text-sm text-burgundy/60">Fresh pork customer</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-2 text-sm text-burgundy/75 sm:grid-cols-3 sm:gap-3">
                <div className="rounded-2xl bg-cream-50 px-3 py-2">
                  <p className="font-semibold text-burgundy">{buyer.orderCount}</p>
                  <p>orders</p>
                </div>
                <div className="rounded-2xl bg-cream-50 px-3 py-2">
                  <p className="font-semibold text-burgundy">{Number(buyer.totalKg).toFixed(1)} kg</p>
                  <p>purchased</p>
                </div>
                <div className="rounded-2xl bg-cream-50 px-3 py-2">
                  <p className="font-semibold text-burgundy">{formatCurrency(buyer.totalPurchases)}</p>
                  <p>total purchases</p>
                </div>
              </div>
            </article>
          ))}
          {!filteredBuyers.length && (
            <div className="market-card p-8 text-center text-burgundy/60">
              No buyers found for this product yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
