import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getAuthHeaders } from '../utils/api.js';

const statusLabels = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const statusBadgeStyles = {
  PENDING: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-slate-100 text-slate-800',
  PROCESSING: 'bg-sky-100 text-sky-800',
  OUT_FOR_DELIVERY: 'bg-violet-100 text-violet-800',
  DELIVERED: 'bg-slate-100 text-slate-800',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-rose-100 text-rose-700',
};

function formatMoney(value) {
  return `₱${Number(value || 0).toFixed(2)}`;
}

function getStockLevel(stockKg) {
  if (Number(stockKg) <= 0) return 'Out of Stock';
  if (Number(stockKg) <= 5) return 'Low Stock';
  return 'Available';
}

function getStockBadge(stockKg) {
  const level = getStockLevel(stockKg);
  if (level === 'Out of Stock') return 'bg-rose-100 text-rose-700';
  if (level === 'Low Stock') return 'bg-amber-100 text-amber-700';
  return 'bg-emerald-100 text-emerald-700';
}

function isToday(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadDashboard() {
    setLoading(true);
    setError('');

    try {
      const [productsRes, ordersRes] = await Promise.all([
        api.get('/products', { headers: getAuthHeaders() }),
        api.get('/orders', { headers: getAuthHeaders() }),
      ]);

      const products = (productsRes.data || []).map((product) => ({
        ...product,
        pricePerKg: Number(product.pricePerKg || 0),
        stockKg: Number(product.stockKg || 0),
      }));

      const orders = (ordersRes.data || []).map((order) => ({
        ...order,
        totalAmount: Number(order.totalAmount || 0),
        createdAt: order.createdAt,
      }));

      const todayOrders = orders.filter((order) => isToday(order.createdAt));
      const revenue = todayOrders.filter((order) => order.status !== 'CANCELLED').reduce((sum, order) => sum + order.totalAmount, 0);
      const pending = orders.filter((order) => order.status === 'PENDING').length;
      const processing = orders.filter((order) => order.status === 'PROCESSING').length;
      const outForDelivery = orders.filter((order) => order.status === 'OUT_FOR_DELIVERY').length;
      const lowStockItems = products.filter((product) => product.stockKg > 0 && product.stockKg <= 5).length;

      setStats({
        revenue,
        todayOrders: todayOrders.length,
        pending,
        processing,
        outForDelivery,
        totalProducts: products.length,
        lowStockItems,
      });
      setRecentOrders(orders.slice(0, 5));
      setInventory([...products].sort((a, b) => a.stockKg - b.stockKg).slice(0, 7));
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-96px)] items-center justify-center px-4 py-12 text-slate-700 sm:px-6">
        <div className="rounded-3xl bg-white/90 p-8 text-center shadow-xl shadow-slate-200/50 backdrop-blur-sm">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-rose-200 border-t-rose-600"></div>
          <p className="text-lg font-semibold text-slate-900">Loading dashboard...</p>
          <p className="mt-2 text-sm text-slate-600">Fetching the latest orders and inventory data.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl bg-rose-50 p-6 shadow-sm border border-rose-100">
        <h2 className="text-xl font-semibold text-rose-800">Unable to load dashboard</h2>
        <p className="mt-2 text-sm text-rose-700">{error}</p>
        <button
          type="button"
          onClick={loadDashboard}
          className="mt-4 inline-flex items-center rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  const summaryCards = [
    {
      label: "Today's Revenue",
      value: formatMoney(stats.revenue),
      meta: 'Today only, excluding cancelled orders',
      accent: 'bg-rose-50 border-rose-100 text-rose-700',
    },
    {
      label: "Today's Orders",
      value: String(stats.todayOrders),
      meta: 'Orders placed today',
      accent: 'bg-slate-50 border-slate-200 text-slate-800',
    },
    {
      label: 'Pending Orders',
      value: String(stats.pending),
      meta: 'Orders waiting for confirmation',
      accent: 'bg-amber-50 border-amber-100 text-amber-800',
    },
    {
      label: 'Processing Orders',
      value: String(stats.processing),
      meta: 'Orders being prepared',
      accent: 'bg-sky-50 border-sky-100 text-sky-700',
    },
    {
      label: 'Out for Delivery',
      value: String(stats.outForDelivery),
      meta: 'Orders on the road',
      accent: 'bg-violet-50 border-violet-100 text-violet-700',
    },
    {
      label: 'Total Products',
      value: String(stats.totalProducts),
      meta: 'Products currently available',
      accent: 'bg-slate-50 border-slate-200 text-slate-800',
    },
    {
      label: 'Low Stock Items',
      value: String(stats.lowStockItems),
      meta: 'Products under 5 kg stock',
      accent: 'bg-amber-50 border-amber-100 text-amber-800',
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-600">Overview</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Dashboard</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
              Here's what's happening with your meat shop today. Track revenue, monitor orders, and keep an eye on inventory from a single place.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/orders"
              className="inline-flex items-center justify-center rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700"
            >
              View Orders
            </Link>
            <Link
              to="/products"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              View Products
            </Link>
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
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Recent Orders</h2>
              <p className="mt-1 text-sm text-slate-500">Five newest orders from your store.</p>
            </div>
            <Link to="/orders" className="text-sm font-semibold text-rose-600 hover:text-rose-700">View all</Link>
          </div>

          {recentOrders.length ? (
            <div className="mt-6 space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">Order {String(order.orderNumber || 0).padStart(4, '0')}</p>
                      <p className="mt-1 text-sm text-slate-600">{order.customerName}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeStyles[order.status] || 'bg-slate-100 text-slate-700'}`}>
                        {statusLabels[order.status] || order.status}
                      </span>
                      <span className="text-sm text-slate-600">{new Date(order.createdAt).toLocaleString()}</span>
                      <span className="text-sm font-semibold text-slate-900">{formatMoney(order.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-sm text-slate-600">No recent orders yet.</p>
          )}
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Inventory Overview</h2>
              <p className="mt-1 text-sm text-slate-500">Products with the lowest stock appear first.</p>
            </div>
            <Link to="/products" className="text-sm font-semibold text-rose-600 hover:text-rose-700">Manage Products</Link>
          </div>

          <div className="mt-6 space-y-3">
            {inventory.length ? (
              inventory.map((product) => (
                <div key={product.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{product.name}</p>
                      <p className="mt-1 text-sm text-slate-600">{Number(product.stockKg).toFixed(2)} kg</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStockBadge(product.stockKg)}`}>
                      {getStockLevel(product.stockKg)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-600">No inventory items to display.</p>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Quick Actions</h2>
            <p className="mt-1 text-sm text-slate-500">Navigate to the most important admin tasks.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Link to="/orders" className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-slate-300 hover:bg-slate-100">
            <p className="text-sm font-semibold text-slate-900">Manage Orders</p>
            <p className="mt-2 text-sm text-slate-600">Review and update orders.</p>
          </Link>
          <Link to="/products" className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-slate-300 hover:bg-slate-100">
            <p className="text-sm font-semibold text-slate-900">Manage Products</p>
            <p className="mt-2 text-sm text-slate-600">Edit items and pricing.</p>
          </Link>
          <Link to="/products" className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-slate-300 hover:bg-slate-100">
            <p className="text-sm font-semibold text-slate-900">Inventory</p>
            <p className="mt-2 text-sm text-slate-600">Monitor stock levels.</p>
          </Link>
          <Link to="/contact" className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-slate-300 hover:bg-slate-100">
            <p className="text-sm font-semibold text-slate-900">Store Settings</p>
            <p className="mt-2 text-sm text-slate-600">Update store contact details.</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
