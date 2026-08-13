import { useEffect, useState } from 'react';
import axios from 'axios';
import { resolveImageUrl } from '../utils/imageUrl.js';
import { useCart } from '../contexts/CartContext.jsx';
import { useOrderRealtime } from '../realtime/OrderRealtimeProvider.jsx';
import { Link } from 'react-router-dom';
import { normalizePhilippineNumber, isValidPhilippineNumber } from '../utils/contactUtils.js';
import { formatCurrency } from '../utils/currency.js';
import { getApiBasePath } from '../utils/apiUrl.js';
import ImageWithFallback from '../components/ImageWithFallback.jsx';

const api = axios.create({ baseURL: getApiBasePath() || '/api' });

function formatStatus(status) {
  const mapping = {
    PENDING: 'Pending',
    CONFIRMED: 'Confirmed',
    PROCESSING: 'Processing',
    OUT_FOR_DELIVERY: 'Out for Delivery',
    DELIVERED: 'Delivered',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  };
  return mapping[String(status).toUpperCase()] || String(status || '').replaceAll('_', ' ');
}

export default function MyOrdersPage() {
  const savedBuyer = (() => {
    try {
      return JSON.parse(localStorage.getItem('pigmarket-buyer') || 'null');
    } catch {
      return null;
    }
  })();
  // normalize/validate any stored buyer contact on load
  const initialContact = (() => {
    const c = savedBuyer?.contactNumber;
    const normalized = normalizePhilippineNumber(String(c || ''));
    if (normalized) return normalized;
    // if invalid stored value, clear it so we don't auto-fetch
    if (savedBuyer) localStorage.removeItem('pigmarket-buyer');
    return '';
  })();
  const [contact, setContact] = useState(() => initialContact);
  const [customerName, setCustomerName] = useState(() => savedBuyer?.customerName || '');
  // editingContact: whether the input is shown for entering/changing contact
  const [editingContact, setEditingContact] = useState(() => !initialContact);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [orderView, setOrderView] = useState('active');
  const [editingOrder, setEditingOrder] = useState(null);
  const [editForm, setEditForm] = useState({ customerName: '', address: '', contactNumber: '' });
  const [savingOrder, setSavingOrder] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [confirmCancelId, setConfirmCancelId] = useState(null);
  const [orderingAgainId, setOrderingAgainId] = useState(null);
  const [orderAgainMessage, setOrderAgainMessage] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [restoringId, setRestoringId] = useState(null);
  const { addItem } = useCart();
  const { subscribe } = useOrderRealtime();

  useEffect(() => {
    // Auto-fetch only when contact is valid.
    if (contact && isValidPhilippineNumber(contact)) {
      fetchOrders(contact, { page, pageSize, status });
    }
  }, [contact, page, pageSize, status]);

  // Editor state for Change Contact flow
  const [editingValue, setEditingValue] = useState(contact || '');
  const [editingError, setEditingError] = useState('');

  // When entering edit mode, populate the input with the current contact
  useEffect(() => {
    if (editingContact) {
      setEditingValue(contact || '');
      setEditingError('');
    }
  }, [editingContact]);

  // Real-time order updates
  useEffect(() => {
    const unsubscribeStatus = subscribe('order:status', (statusData) => {
      console.log('[MyOrders] Order status update:', statusData);
      setOrders(current => 
        current.map(order => 
          order.id === statusData.orderId 
            ? { ...order, status: statusData.status }
            : order
        )
      );
    });

    const unsubscribeUpdate = subscribe('order:update', (updateData) => {
      console.log('[MyOrders] Order update:', updateData);
      setOrders(current => 
        current.map(order => 
          order.id === updateData.orderId 
            ? { ...order, ...updateData }
            : order
        )
      );
    });

    return () => {
      unsubscribeStatus();
      unsubscribeUpdate();
    };
  }, [subscribe]);

  async function saveContact() {
    const trimmed = String(editingValue || '').trim();
    if (!isValidPhilippineNumber(trimmed)) {
      setEditingError('Please enter a valid contact number.');
      return;
    }
    const normalized = normalizePhilippineNumber(trimmed);
    if (!normalized) {
      setEditingError('Please enter a valid contact number.');
      return;
    }

    // persist normalized contact using existing pigmarket-buyer key
    localStorage.setItem('pigmarket-buyer', JSON.stringify({ contactNumber: normalized, customerName }));
    setContact(normalized);
    setEditingContact(false);
    setEditingError('');
    // reload orders for the new contact
    await fetchOrders(normalized, { page: 1, pageSize, status });
  }

  function cancelEditContact() {
    setEditingContact(false);
    setEditingValue(contact || '');
    setEditingError('');
  }

  async function fetchOrders(c, opts = {}) {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      params.set('contactNumber', c);
      params.set('page', String(opts.page || page));
      params.set('pageSize', String(opts.pageSize || pageSize));
      if (opts.status || status) params.set('status', opts.status || status);
      const resp = await api.get(`/orders/mine?${params.toString()}`);
      const loadedOrders = resp.data.orders || [];
      setOrders(loadedOrders);
      setTotal(resp.data.total || 0);
      const nameFromOrders = loadedOrders.find((o) => o.customerName)?.customerName;
      if (nameFromOrders) setCustomerName(nameFromOrders);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to fetch orders');
    } finally { setLoading(false); }
  }

  function startEditing(order) {
    setEditingOrder(order);
    setEditForm({ customerName: order.customerName, address: order.address, contactNumber: order.contactNumber });
    setError('');
  }

  async function saveEdit(event) {
    event.preventDefault();
    setSavingOrder(true);
    setError('');
    try {
      const normalizedCurrent = normalizePhilippineNumber(String(editingOrder.contactNumber || ''));
      const normalizedNew = normalizePhilippineNumber(String(editForm.contactNumber || ''));
      if (!normalizedNew || !normalizedCurrent) {
        setError('Please provide a valid contact number.');
        setSavingOrder(false);
        return;
      }
      await api.put(`/orders/mine/${editingOrder.id}`, { customerName: editForm.customerName, address: editForm.address, contactNumber: normalizedNew, currentContactNumber: normalizedCurrent });
      localStorage.setItem('pigmarket-buyer', JSON.stringify({ customerName: editForm.customerName, contactNumber: normalizedNew }));
      setContact(normalizedNew);
      setCustomerName(editForm.customerName);
      setEditingOrder(null);
      await fetchOrders(normalizedNew, { page, pageSize, status });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update order.');
    } finally { setSavingOrder(false); }
  }

  // Show a confirmation prompt inline before invoking the backend cancellation.
  async function proceedCancel(order) {
    console.debug('[MyOrders] proceedCancel start', { orderId: order.id, contact });
    setCancellingId(order.id);
    setError('');
    try {
      await api.post(`/orders/mine/${order.id}/cancel`, { contactNumber: contact });
      console.debug('[MyOrders] proceedCancel success', { orderId: order.id });
      setConfirmCancelId(null);
      await fetchOrders(contact, { page, pageSize, status });
    } catch (err) {
      console.debug('[MyOrders] proceedCancel error', err && err.response ? err.response.data : err);
      setError(err.response?.data?.message || 'Unable to cancel order.');
    } finally { setCancellingId(null); }
  }

  function beginCancel(order) {
    console.debug('[MyOrders] beginCancel', { orderId: order.id, time: Date.now() });
    // Open inline confirmation for this order
    setConfirmCancelId(order.id);
  }

  function abortCancel() {
    setConfirmCancelId(null);
  }

  async function orderAgain(order) {
    setOrderingAgainId(order.id);
    setOrderAgainMessage('');
    try {
      const results = await Promise.all(order.items.map(async (item) => {
        try {
          const response = await api.get(`/products/${item.productId}`);
          const product = response.data;
          const available = Number(product.stockKg) || 0;
          const name = product.name || item.product?.name || 'A product';
          const requested = Number(item.quantityKg) || 0;
          if (!product.isActive || available <= 0) return { name, added: 0, requested, available: 0 };
          const added = Math.min(requested, available);
          addItem(product, added);
          return { name, added, requested, available };
        } catch {
          return { name: item.product?.name || item.productId, added: 0, requested: Number(item.quantityKg) || 0, available: 0 };
        }
      }));
      const unavailable = results.filter((result) => result.added <= 0).map((result) => `${result.name} is currently unavailable.`);
      const partial = results
        .filter((result) => result.added > 0 && result.added < result.requested)
        .map((result) => `${result.name}: only ${result.added} kg is currently available.`);
      const messages = [...unavailable, ...partial];
      setOrderAgainMessage(messages.length ? `Added available items to your cart. ${messages.join(' ')}` : 'Added previous order items to your cart.');
    } catch (err) {
      setOrderAgainMessage('Unable to add the previous order items right now.');
    } finally { setOrderingAgainId(null); }
  }

  async function restoreOrder(order) {
    setRestoringId(order.id);
    setError('');
    try {
      await api.put(`/orders/mine/${order.id}/restore`, { contactNumber: contact });
      await fetchOrders(contact, { page, pageSize, status });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to restore order.');
    } finally { setRestoringId(null); }
  }

  function beginDelete(order) {
    setConfirmDeleteId(order.id);
  }

  function abortDelete() {
    setConfirmDeleteId(null);
  }

  async function proceedDelete(order) {
    setDeletingId(order.id);
    setError('');
    try {
      await api.delete(`/orders/mine/${order.id}`, { data: { contactNumber: contact } });
      setConfirmDeleteId(null);
      await fetchOrders(contact, { page, pageSize, status });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to permanently delete order.');
    } finally { setDeletingId(null); }
  }

  if (editingContact) {
    // show editor when changing or entering contact
    const title = contact ? 'Change Contact Number' : 'Enter contact to view orders';
    return (
      <div className="market-card p-8">
        <h2 className="font-display text-2xl font-bold text-burgundy">{title}</h2>
        <p className="mt-2 text-sm text-burgundy/65">We save your contact at checkout; enter it here to see past orders.</p>
        <div className="mt-4">
          <input
            value={editingValue}
            onChange={(e) => { setEditingValue(e.target.value); setEditingError(''); setError(''); }}
            className="w-full rounded-2xl border border-burgundy/15 bg-cream-50 px-4 py-3"
            placeholder="Contact number"
          />
          {editingError ? <p className="mt-2 text-sm text-red-600">{editingError}</p> : null}
          <div className="mt-4 flex gap-2">
            <button onClick={saveContact} className="market-btn inline-flex justify-center">Save Contact</button>
            <button onClick={cancelEditContact} className="rounded-2xl bg-cream-200 px-4 py-2 text-sm text-burgundy">Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  
  // Get orders for each section
  const activeOrders = orders.filter((order) => {
    const normalizedStatus = String(order.status || '').trim().toUpperCase();
    return ['PENDING', 'CONFIRMED', 'PROCESSING', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(normalizedStatus);
  });
  
  const completedOrders = orders.filter((order) => {
    const normalizedStatus = String(order.status || '').trim().toUpperCase();
    return normalizedStatus === 'COMPLETED';
  });
  
  const cancelledOrders = orders.filter((order) => {
    const normalizedStatus = String(order.status || '').trim().toUpperCase();
    return normalizedStatus === 'CANCELLED';
  });
  
  // Get visible orders based on current view and status filter
  let visibleOrders = orderView === 'active' 
    ? activeOrders 
    : orderView === 'completed' 
    ? completedOrders 
    : cancelledOrders;
    
  // Apply status filter within the selected section
  if (status) {
    visibleOrders = visibleOrders.filter((order) => {
      const normalizedStatus = String(order.status || '').trim().toUpperCase();
      return normalizedStatus === status;
    });
  }


  return (
    <div className="space-y-6">
      <div className="market-card p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold text-burgundy">My Orders</h1>
            <p className="mt-2 text-burgundy/70">
              {customerName ? <>Orders for <strong>{customerName}</strong> · </> : null}
              Contact: <strong>{normalizePhilippineNumber(String(contact || ''))}</strong>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="text-sm text-burgundy/70 hover:underline" onClick={() => { setEditingContact(true); }}>
              Change Contact
            </button>
            <button className="text-sm text-burgundy/70 hover:underline" onClick={() => fetchOrders(contact)}>
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="market-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="text-sm text-burgundy/80">Status
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="ml-2 rounded-2xl border border-burgundy/15 bg-cream-50 px-3 py-2 text-sm">
              <option value="">All {orderView === 'active' ? 'Active' : orderView === 'completed' ? 'Completed' : 'Cancelled'}</option>
              {orderView === 'active' && (
                <>
                  <option value="PENDING">Pending</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="OUT_FOR_DELIVERY">Out for delivery</option>
                  <option value="DELIVERED">Delivered</option>
                </>
              )}
              {orderView === 'completed' && (
                <option value="COMPLETED">Completed</option>
              )}
              {orderView === 'cancelled' && (
                <option value="CANCELLED">Cancelled</option>
              )}
            </select>
          </label>
          <div className="flex flex-col gap-2 sm:ml-auto sm:flex-row sm:items-center">
            <label className="text-sm text-burgundy/80">Per page
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="ml-2 rounded-2xl border border-burgundy/15 bg-cream-50 px-3 py-2 text-sm">
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      {orderAgainMessage && <div className="rounded-2xl border border-leaf/20 bg-leaf-mist px-4 py-3 text-sm font-semibold text-leaf">{orderAgainMessage}</div>}
      <div className="market-card p-2">
        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={() => { setOrderView('active'); setStatus(''); setPage(1); }} className={`rounded-2xl px-4 py-3 text-sm font-semibold ${orderView === 'active' ? 'bg-burgundy text-white' : 'bg-cream-100 text-burgundy/70'}`}>
            Active Orders
          </button>
          <button type="button" onClick={() => { setOrderView('completed'); setStatus(''); setPage(1); }} className={`rounded-2xl px-4 py-3 text-sm font-semibold ${orderView === 'completed' ? 'bg-burgundy text-white' : 'bg-cream-100 text-burgundy/70'}`}>
            Completed
          </button>
          <button type="button" onClick={() => { setOrderView('cancelled'); setStatus(''); setPage(1); }} className={`rounded-2xl px-4 py-3 text-sm font-semibold ${orderView === 'cancelled' ? 'bg-burgundy text-white' : 'bg-cream-100 text-burgundy/70'}`}>
            Cancelled Orders
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="font-display text-2xl font-bold text-burgundy">
          {orderView === 'active' ? 'Active Orders' : orderView === 'completed' ? 'Completed' : 'Cancelled Orders'}
        </h2>
        
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="market-card p-4 animate-pulse space-y-4 border border-burgundy/5">
                <div className="flex justify-between items-center">
                  <div className="space-y-2">
                    <div className="h-5 w-24 bg-cream-200 rounded-xl"></div>
                    <div className="h-3.5 w-32 bg-cream-100 rounded-lg"></div>
                    <div className="h-3 w-48 bg-cream-100 rounded-lg"></div>
                  </div>
                  <div className="h-6 w-20 bg-cream-200 rounded-full"></div>
                </div>
                <div className="h-12 bg-cream-50 rounded-2xl"></div>
                <div className="flex justify-between items-center pt-2">
                  <div className="h-3 w-40 bg-cream-100 rounded-lg"></div>
                  <div className="h-5 w-20 bg-cream-200 rounded-xl"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="market-card p-6 border border-burgundy/15 bg-white text-center space-y-3">
            <span className="inline-block px-3 py-1.5 rounded-full bg-rose-100 text-rose-700 text-xs font-semibold">⚠️ Connection Trouble</span>
            <p className="text-sm font-semibold text-burgundy">{error}</p>
            <p className="text-xs text-burgundy/60">We could not load your orders. Let's try downloading them again.</p>
            <button
              onClick={() => fetchOrders(contact)}
              className="market-btn px-4 py-2 mt-2 text-xs"
            >
              🔄 Refresh List
            </button>
          </div>
        )}

        {!visibleOrders.length && !loading && !error && (
          <div className="market-card p-8 text-center space-y-4 border border-burgundy/5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-cream-100 text-burgundy/60 text-2xl">
              📦
            </div>
            <div className="space-y-1.5">
              <h3 className="font-display text-xl font-bold text-burgundy">
                No {orderView === 'active' ? 'active' : orderView === 'completed' ? 'completed' : 'cancelled'} orders
              </h3>
              <p className="max-w-xs mx-auto text-sm text-burgundy/65">
                We couldn't find any {orderView === 'active' ? 'active' : orderView === 'completed' ? 'completed' : 'cancelled'} orders matching your contact number.
              </p>
            </div>
            {orderView === 'active' && (
              <div className="pt-2">
                <Link to="/" className="market-btn inline-flex justify-center text-xs font-semibold hover:bg-burgundy-soft">
                  🥩 Start Shopping
                </Link>
              </div>
            )}
          </div>
        )}

        {!loading && !error && visibleOrders.map((o) => (
          <div key={o.id} className="market-card border border-burgundy/5 p-4 transition-colors hover:border-burgundy/10">
            {(() => {
              const normalizedStatus = String(o.status || '').trim().toUpperCase();
              const canEditOrder = ['PENDING', 'CONFIRMED'].includes(normalizedStatus);
              const itemsCount = (o.items || []).length || 0;
              return (
                <>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="font-semibold text-burgundy">
                        Order {o.orderNumber ? `#${String(o.orderNumber).padStart(4, '0')}` : ''}
                      </div>
                      <div className="mt-1 text-sm text-burgundy/70">Buyer: {o.customerName}</div>
                      <div className="text-sm text-burgundy/50">{new Date(o.createdAt).toLocaleString()} · {itemsCount} item{itemsCount !== 1 ? 's' : ''}</div>
                    </div>
                    <div className={`inline-flex self-start rounded-full px-3 py-1 text-sm font-semibold ${normalizedStatus === 'CANCELLED' ? 'bg-stone-200 text-stone-600' : normalizedStatus === 'DELIVERED' || normalizedStatus === 'COMPLETED' ? 'bg-leaf-mist text-leaf' : 'bg-amber-50 text-amber-800'}`}>
                      {formatStatus(normalizedStatus)}
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {o.items.map((it) => (
                      <div key={it.id} className="flex flex-col gap-2 rounded-2xl bg-cream-50 p-3 text-sm sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                          {resolveImageUrl(it.product?.imageUrl) && (
                            <ImageWithFallback src={resolveImageUrl(it.product.imageUrl)} alt={it.product?.name} className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                          )}
                          <div className="min-w-0">
                            <div className="font-medium text-burgundy">{it.product?.name || it.productId}</div>
                            <div className="text-burgundy/50">{it.quantityKg} kg × {formatCurrency(it.pricePerKg)}</div>
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-burgundy sm:text-right">{formatCurrency(it.subtotal)}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="text-sm text-burgundy/60">Delivery to: {o.address}</div>
                    <div className="text-sm font-semibold text-burgundy">Total: {formatCurrency(o.totalAmount)}</div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link to={`/my-orders/${o.id}`} className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-burgundy px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-burgundy-soft">
                      🔍 View Order
                    </Link>
                    {canEditOrder && (
                      <>
                        <button onClick={() => startEditing(o)} className="rounded-2xl bg-cream-100 px-4 py-2 text-sm font-semibold text-burgundy transition-colors hover:bg-cream-200">
                          ✏️ Edit Details
                        </button>
                        {confirmCancelId === o.id ? (
                          <div className="flex items-center gap-2">
                            <button onClick={() => proceedCancel(o)} disabled={cancellingId === o.id} className="rounded-2xl bg-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-300 disabled:opacity-50">
                              {cancellingId === o.id ? 'Cancelling...' : 'Confirm Cancel'}
                            </button>
                            <button onClick={abortCancel} className="rounded-2xl bg-cream-100 px-4 py-2 text-sm font-semibold text-burgundy transition-colors hover:bg-cream-200">Keep Order</button>
                          </div>
                        ) : (
                          <button onClick={() => beginCancel(o)} disabled={cancellingId === o.id} className="rounded-2xl bg-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-300 disabled:opacity-50">
                            🚫 Cancel Order
                          </button>
                        )}
                      </>
                    )}
                    {normalizedStatus === 'CANCELLED' && (
                      <>
                        <button onClick={() => restoreOrder(o)} disabled={restoringId === o.id} className="rounded-2xl bg-leaf-mist px-4 py-2 text-sm font-semibold text-leaf transition-colors hover:bg-leaf/20 disabled:opacity-50">
                          {restoringId === o.id ? 'Restoring...' : '🔄 Restore Order'}
                        </button>
                        {confirmDeleteId === o.id ? (
                          <div className="flex items-center gap-2">
                            <button onClick={() => proceedDelete(o)} disabled={deletingId === o.id} className="rounded-2xl bg-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-300 disabled:opacity-50">
                              {deletingId === o.id ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                            <button onClick={abortDelete} className="rounded-2xl bg-cream-100 px-4 py-2 text-sm font-semibold text-burgundy transition-colors hover:bg-cream-200">Keep Order</button>
                          </div>
                        ) : (
                          <button onClick={() => beginDelete(o)} disabled={deletingId === o.id} className="rounded-2xl bg-red-100 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-200 disabled:opacity-50">
                            🗑️ Permanently Delete
                          </button>
                        )}
                      </>
                    )}
                    {normalizedStatus === 'COMPLETED' && (
                      <>
                        {confirmDeleteId === o.id ? (
                          <div className="flex items-center gap-2">
                            <button onClick={() => proceedDelete(o)} disabled={deletingId === o.id} className="rounded-2xl bg-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-300 disabled:opacity-50">
                              {deletingId === o.id ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                            <button onClick={abortDelete} className="rounded-2xl bg-cream-100 px-4 py-2 text-sm font-semibold text-burgundy transition-colors hover:bg-cream-200">Keep Order</button>
                          </div>
                        ) : (
                          <button onClick={() => beginDelete(o)} disabled={deletingId === o.id} className="rounded-2xl bg-red-100 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-200 disabled:opacity-50">
                            🗑️ Permanently Delete
                          </button>
                        )}
                      </>
                    )}
                    {['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(normalizedStatus) && (
                      <button onClick={() => orderAgain(o)} disabled={orderingAgainId === o.id} className="rounded-2xl bg-leaf-mist px-4 py-2 text-sm font-semibold text-leaf transition-colors hover:bg-leaf/20 disabled:opacity-50">
                        {orderingAgainId === o.id ? 'Adding...' : '🔄 Order Again'}
                      </button>
                    )}
                  </div>
                  {!canEditOrder && <p className="mt-3 text-xs text-burgundy/50">Order details can no longer be edited.</p>}
                </>
              );
            })()}
          </div>
        ))}
      </div>

      {editingOrder && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-burgundy/30 p-4">
          <form onSubmit={saveEdit} className="market-card w-full max-w-lg space-y-4 p-6">
            <h2 className="font-display text-2xl font-bold text-burgundy">Edit Order #{String(editingOrder.orderNumber || 0).padStart(4, '0')}</h2>
            <p className="text-sm text-burgundy/65">Product, quantity, price, total, and status cannot be changed.</p>
            {[
              ['customerName', 'Customer name'],
              ['address', 'Delivery address'],
              ['contactNumber', 'Contact number'],
            ].map(([name, label]) => (
              <label key={name} className="block text-sm text-burgundy/80">{label}
                <input name={name} value={editForm[name]} onChange={(event) => setEditForm((current) => ({ ...current, [name]: event.target.value }))} className="mt-2 w-full rounded-2xl border border-burgundy/15 bg-cream-50 px-4 py-3" required />
              </label>
            ))}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditingOrder(null)} className="rounded-2xl bg-cream-200 px-4 py-2 text-sm text-burgundy">Keep Order</button>
              <button type="submit" disabled={savingOrder} className="market-btn">{savingOrder ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-burgundy/60">Page {page} of {totalPages} — {total} orders</div>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-2xl bg-cream-200 px-3 py-2 text-sm disabled:opacity-40">Prev</button>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="rounded-2xl bg-cream-200 px-3 py-2 text-sm disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>
  );
}
