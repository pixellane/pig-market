import { useEffect, useMemo, useState } from 'react';
import { api, getAuthHeaders } from '../utils/api.js';
import { formatCurrency } from '../utils/currency.js';

const orderViews = [
  { value: 'ALL_ACTIVE', label: 'All Active' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'OUT_FOR_DELIVERY', label: 'Ready' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const statusLabels = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const statusTransitions = {
  PENDING: ['CONFIRMED'],
  CONFIRMED: ['PROCESSING'],
  PROCESSING: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

function formatOrderNumber(n) {
  return `#${String(n).padStart(4, '0')}`;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');
  const [view, setView] = useState('ALL_ACTIVE');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders(showLoading = true) {
    if (showLoading) setLoading(true);
    setError('');
    try {
      const response = await api.get('/orders', { headers: getAuthHeaders() });
      setOrders(response.data.map((order) => ({
        ...order,
        totalAmount: Number(order.totalAmount),
        items: (order.items || []).map((item) => ({
          ...item,
          quantityKg: Number(item.quantityKg),
          pricePerKg: Number(item.pricePerKg),
          subtotal: Number(item.subtotal),
        })),
      })));
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Unable to load orders.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  async function updateStatus(orderId, status) {
    if (!status) return;
    const currentOrder = orders.find((order) => order.id === orderId);
    if (currentOrder?.status === status) return;
    setSavingId(orderId);
    setError('');
    try {
      await api.put(`/orders/${orderId}/status`, { status }, { headers: getAuthHeaders() });
      // Update local state immediately instead of reloading
      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === orderId ? { ...order, status } : order
        )
      );
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Unable to update status.');
    } finally {
      setSavingId(null);
    }
  }

  async function cancelOrder(order) {
    setSavingId(order.id);
    setError('');
    try {
      await api.post(`/orders/${order.id}/cancel`, {}, { headers: getAuthHeaders() });
      // Update local state immediately
      setOrders((currentOrders) =>
        currentOrders.map((o) =>
          o.id === order.id ? { ...o, status: 'CANCELLED' } : o
        )
      );
      setCancelTarget(null);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Unable to cancel order.');
    } finally {
      setSavingId(null);
    }
  }

  async function restoreOrder(order) {
    setSavingId(order.id);
    setError('');
    try {
      await api.put(`/orders/${order.id}/restore`, {}, { headers: getAuthHeaders() });
      // Update local state immediately
      setOrders((currentOrders) =>
        currentOrders.map((o) =>
          o.id === order.id ? { ...o, status: 'PENDING' } : o
        )
      );
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Unable to restore order.');
    } finally {
      setSavingId(null);
    }
  }

  async function deleteOrder(order) {
    setSavingId(order.id);
    setError('');
    try {
      await api.delete(`/orders/${order.id}`, { headers: getAuthHeaders() });
      setOrders((current) => current.filter((item) => item.id !== order.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Unable to delete order.');
    } finally {
      setSavingId(null);
    }
  }

  const filteredOrders = useMemo(() => {
    const normalizedSearch = String(search || '').trim().toLowerCase();
    const normalizedContactSearch = normalizedSearch.replace(/\D/g, '');

    return orders.filter((order) => {
      // Filter by view/status
      if (view === 'ALL_ACTIVE') {
        // All Active should only include active statuses, not COMPLETED or CANCELLED
        if (!['PENDING', 'CONFIRMED', 'PROCESSING', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status)) {
          return false;
        }
      } else if (view !== order.status) {
        return false;
      }

      // Filter by search
      if (!normalizedSearch) {
        return true;
      }

      const candidate = [
        String(order.customerName || ''),
        String(order.contactNumber || ''),
        String(order.id || ''),
        String(order.orderNumber || ''),
      ].join(' ').toLowerCase();

      if (candidate.includes(normalizedSearch)) {
        return true;
      }

      if (normalizedContactSearch) {
        const contact = String(order.contactNumber || '').replace(/\D/g, '');
        return contact.includes(normalizedContactSearch);
      }

      return false;
    });
  }, [orders, search, view]);

  if (loading) {
    return <div className="py-20 text-center text-slate-600">Loading orders...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">Orders</h1>
        <p className="mt-2 text-slate-600">Review and manage customer orders.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="rounded-3xl bg-white p-4 shadow-sm">
          <label className="block text-sm font-semibold text-slate-700" htmlFor="order-search">Search orders</label>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              id="order-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Customer name, contact, or order ID"
              className="min-w-0 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
              >
                Clear
              </button>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-slate-500">Search by customer name, contact number, order ID, or order number.</p>
        </div>

        <div className="flex gap-2 overflow-x-auto rounded-3xl bg-white p-3 shadow-sm">
          {orderViews.map((item) => {
            let count;
            if (item.value === 'ALL_ACTIVE') {
              count = orders.filter((order) => 
                ['PENDING', 'CONFIRMED', 'PROCESSING', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status)
              ).length;
            } else {
              count = orders.filter((order) => order.status === item.value).length;
            }
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setView(item.value)}
                className={`shrink-0 rounded-2xl px-4 py-2 text-sm font-semibold ${view === item.value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {item.label} <span className="ml-1 text-xs opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error && <div className="rounded-3xl bg-rose-100 p-4 text-rose-700">{error}</div>}

      {filteredOrders.length ? (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isExpanded = expandedOrderId === order.id;
            const subtotal = order.items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
            const nextStatuses = statusTransitions[order.status] || [];
            return (
              <div key={order.id} className={`rounded-3xl border bg-white p-6 shadow-sm ${order.status === 'CANCELLED' ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200'}`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    {order.status === 'CANCELLED' && <p className="mb-2 font-bold text-rose-700">🗑️ CANCELLED</p>}
                    <p className="text-lg font-semibold text-slate-900">{formatOrderNumber(order.orderNumber || 0)}</p>
                    <p className="mt-1 text-sm text-slate-500 break-all">Order ID: <span className="font-mono text-slate-700">{order.id}</span></p>
                    <div className="mt-4 space-y-1 text-sm text-slate-700">
                      <p>Buyer: <span className="font-semibold text-slate-900">{order.customerName}</span></p>
                      <p>Contact: {order.contactNumber}</p>
                      <p className="truncate">Delivery Address: {order.address}</p>
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-col items-start gap-3 text-slate-700 sm:items-end">
                    <p className="text-sm">{new Date(order.createdAt).toLocaleString()}</p>
                    <p className="text-xl font-semibold text-slate-900">{formatCurrency(order.totalAmount)}</p>
                    <div className={`rounded-2xl px-4 py-2 text-sm font-semibold ${order.status === 'CANCELLED' ? 'bg-rose-100 text-rose-700' : order.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                      {statusLabels[order.status] || order.status}
                    </div>
                    <button
                      type="button"
                      onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                      className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                    >
                      {isExpanded ? 'Hide details' : 'View details'}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-6 space-y-6 rounded-3xl bg-slate-50 p-4">
                    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
                      <div className="rounded-3xl bg-white p-4">
                        <p className="text-sm font-semibold text-slate-900">Customer</p>
                        <div className="mt-4 space-y-2 text-sm text-slate-700">
                          <p><span className="font-semibold text-slate-900">Name:</span> {order.customerName}</p>
                          <p><span className="font-semibold text-slate-900">Contact:</span> {order.contactNumber}</p>
                          <p><span className="font-semibold text-slate-900">Delivery address:</span> {order.address}</p>
                        </div>
                      </div>
                      <div className="rounded-3xl bg-white p-4">
                        <p className="text-sm font-semibold text-slate-900">Order</p>
                        <div className="mt-4 space-y-2 text-sm text-slate-700">
                          <p><span className="font-semibold text-slate-900">Order ID:</span> {order.id}</p>
                          <p><span className="font-semibold text-slate-900">Order number:</span> {formatOrderNumber(order.orderNumber || 0)}</p>
                          <p><span className="font-semibold text-slate-900">Date/time:</span> {new Date(order.createdAt).toLocaleString()}</p>
                          <p><span className="font-semibold text-slate-900">Current status:</span> {statusLabels[order.status] || order.status}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-slate-900">Items</p>
                      <div className="space-y-3">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900">{item.product?.name || 'Product'}</p>
                              <p className="text-sm text-slate-600">{Number(item.quantityKg || 0).toFixed(2)} kg × {formatCurrency(item.pricePerKg)}</p>
                            </div>
                            <p className="text-sm font-semibold text-slate-900">{formatCurrency(item.subtotal)}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-3xl bg-white p-4">
                      <p className="text-sm font-semibold text-slate-900">Summary</p>
                      <div className="mt-4 space-y-3 text-sm text-slate-700">
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span>{formatCurrency(subtotal)}</span>
                        </div>
                        {typeof order.deliveryFee !== 'undefined' && (
                          <div className="flex justify-between">
                            <span>Delivery fee</span>
                            <span>{formatCurrency(order.deliveryFee)}</span>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-slate-200 pt-3 font-semibold text-slate-900">
                          <span>Total</span>
                          <span>{formatCurrency(order.totalAmount)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                      <div className="rounded-3xl bg-white p-4">
                        <p className="text-sm font-semibold text-slate-900">Status update</p>
                        {order.status !== 'CANCELLED' && order.status !== 'COMPLETED' ? (
                          <select
                            value={order.status}
                            onChange={(event) => updateStatus(order.id, event.target.value)}
                            disabled={savingId === order.id}
                            className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900"
                          >
                            {[order.status, ...nextStatuses].filter(Boolean).map((status) => (
                              <option key={status} value={status}>{statusLabels[status] || status}</option>
                            ))}
                          </select>
                        ) : (
                          <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-900">
                            {statusLabels[order.status] || order.status}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && order.status !== 'COMPLETED' ? (
                          <button
                            type="button"
                            onClick={() => setCancelTarget(order)}
                            disabled={savingId === order.id}
                            className="w-full rounded-2xl bg-stone-200 px-4 py-3 text-sm font-semibold text-stone-700 disabled:opacity-50"
                          >
                            {savingId === order.id ? 'Cancelling...' : 'Cancel Order'}
                          </button>
                        ) : null}

                        {order.status === 'CANCELLED' && (
                          <>
                            <button
                              type="button"
                              onClick={() => restoreOrder(order)}
                              disabled={savingId === order.id}
                              className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                            >
                              {savingId === order.id ? 'Restoring...' : 'Restore Order'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(order)}
                              disabled={savingId === order.id}
                              className="w-full rounded-2xl bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-700 disabled:opacity-50"
                            >
                              Delete Permanently
                            </button>
                          </>
                        )}

                        {order.status === 'COMPLETED' && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(order)}
                            disabled={savingId === order.id}
                            className="w-full rounded-2xl bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-700 disabled:opacity-50"
                          >
                            Delete Permanently
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
          <p className="text-slate-600">
            {view === 'CANCELLED' ? 'No cancelled orders.' : 
             view === 'COMPLETED' ? 'No completed orders.' :
             view === 'ALL_ACTIVE' ? 'No active orders.' :
             'No orders found.'}
          </p>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-slate-900">
              ⚠️ Permanently Delete {deleteTarget.status === 'CANCELLED' ? 'Cancelled' : 'Completed'} Order?
            </h2>
            <p className="mt-4 text-sm text-slate-700">Order {formatOrderNumber(deleteTarget.orderNumber || 0)}</p>
            <p className="text-sm text-slate-700">Buyer: <strong>{deleteTarget.customerName}</strong></p>
            <p className="text-sm text-slate-700">Total: <strong>{formatCurrency(deleteTarget.totalAmount)}</strong></p>
            <p className="mt-4 text-sm font-semibold text-rose-700">This action cannot be undone.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">Keep Order</button>
              <button type="button" onClick={() => deleteOrder(deleteTarget)} className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white">Delete Permanently</button>
            </div>
          </div>
        </div>
      )}

      {cancelTarget && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-slate-900">Cancel Order {formatOrderNumber(cancelTarget.orderNumber || 0)}?</h2>
            <p className="mt-4 text-sm text-slate-700">Are you sure you want to cancel this order?</p>
            <p className="mt-3 text-sm text-slate-700">Buyer: <strong>{cancelTarget.customerName}</strong></p>
            <p className="text-sm text-slate-700">Total: <strong>{formatCurrency(cancelTarget.totalAmount)}</strong></p>
            <p className="mt-3 text-sm text-slate-700">This will ask the backend to cancel the order and restore inventory if applicable.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setCancelTarget(null)} className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">Keep Order</button>
              <button type="button" onClick={() => cancelOrder(cancelTarget)} disabled={savingId === cancelTarget.id} className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{savingId === cancelTarget.id ? 'Cancelling...' : 'Cancel Order'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
