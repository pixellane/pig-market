import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { useOrderRealtime } from '../realtime/OrderRealtimeProvider.jsx';
import { normalizePhilippineNumber } from '../utils/contactUtils.js';
import { formatCurrency } from '../utils/currency.js';
import { getApiBasePath } from '../utils/apiUrl.js';

const api = axios.create({ baseURL: getApiBasePath() || '/api' });

const descriptions = {
  PENDING: 'Your order has been received and is waiting for confirmation.',
  CONFIRMED: 'Your order has been confirmed by Heritage Hog Co.',
  PROCESSING: 'Your pork is being prepared for your order.',
  OUT_FOR_DELIVERY: 'Your order is on its way to your delivery address.',
  DELIVERED: 'Your order has been delivered and is waiting to be marked complete.',
  COMPLETED: 'Your order has been completed. Thank you for shopping with us!',
  CANCELLED: 'This order has been cancelled.',
};
function formatStatus(status) {
  const mapping = {
   PENDING: 'Order Placed',
   CONFIRMED: 'Confirmed',
   PROCESSING: 'Processing',
   OUT_FOR_DELIVERY: 'Out for Delivery',
   DELIVERED: 'Delivered',
   COMPLETED: 'Completed',
   CANCELLED: 'Cancelled',
  };
  return mapping[status] || status.replaceAll('_', ' ');
}

export default function OrderDetailsPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { subscribe } = useOrderRealtime();
  const buyer = (() => {
    try {
      const raw = JSON.parse(localStorage.getItem('pigmarket-buyer') || 'null');
      if (!raw || !raw.contactNumber) return null;
      const normalized = normalizePhilippineNumber(String(raw.contactNumber || ''));
      if (!normalized) {
        localStorage.removeItem('pigmarket-buyer');
        return null;
      }
      return { ...raw, contactNumber: normalized };
    } catch {
      return null;
    }
  })();

  async function load() {
    setLoading(true);
    setError('');
    if (!buyer?.contactNumber) {
      setError('UNAUTHORIZED_ACCESS');
      setLoading(false);
      return;
    }
    try {
      const response = await api.get(`/orders/mine/${id}`, { params: { contactNumber: buyer.contactNumber } });
      setOrder(response.data);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 403) {
        setError('UNAUTHORIZED_ACCESS');
      } else if (err.response?.status === 404) {
        setError('ORDER_NOT_FOUND');
      } else {
        setError('API_ERROR');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id, buyer?.contactNumber]);

  // Real-time order updates
  useEffect(() => {
    if (!id) return;

    const unsubscribeStatus = subscribe('order:status', (statusData) => {
      if (statusData.orderId === parseInt(id)) {
        console.log('[OrderDetails] Order status update:', statusData);
        setOrder(current => 
          current ? { ...current, status: statusData.status } : current
        );
      }
    });

    const unsubscribeUpdate = subscribe('order:update', (updateData) => {
      if (updateData.orderId === parseInt(id)) {
        console.log('[OrderDetails] Order update:', updateData);
        setOrder(current => 
          current ? { ...current, ...updateData } : current
        );
      }
    });

    return () => {
      unsubscribeStatus();
      unsubscribeUpdate();
    };
  }, [id, subscribe]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Link to="/my-orders" className="text-sm font-semibold text-burgundy">← Back to My Orders</Link>
        <div className="market-card space-y-6 border border-burgundy/5 p-4 animate-pulse sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="h-8 w-48 rounded-xl bg-cream-200"></div>
              <div className="h-4 w-32 rounded-lg bg-cream-100"></div>
            </div>
            <div className="h-6 w-24 rounded-full bg-cream-200"></div>
          </div>
          <div className="h-16 bg-cream-50 rounded-2xl"></div>
          <div className="space-y-6 pt-4">
            <div className="h-12 w-full bg-cream-100 rounded-2xl"></div>
            <div className="h-12 w-full bg-cream-100 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error === 'UNAUTHORIZED_ACCESS') {
    return (
      <div className="space-y-4">
        <Link to="/my-orders" className="text-sm font-semibold text-burgundy">← Back to My Orders</Link>
        <div className="market-card p-8 text-center border border-rose-200 bg-rose-50/40">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-4 text-2xl">
            ⚠️
          </div>
          <h2 className="font-display text-2xl font-bold text-burgundy mb-2">Unauthorized Access</h2>
          <p className="text-sm text-burgundy/75 max-w-md mx-auto">
            You do not have authorization to view this order. This order does not match your contact number.
          </p>
        </div>
      </div>
    );
  }

  if (error === 'ORDER_NOT_FOUND') {
    return (
      <div className="space-y-4">
        <Link to="/my-orders" className="text-sm font-semibold text-burgundy">← Back to My Orders</Link>
        <div className="market-card p-8 text-center border border-burgundy/10 bg-white">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-cream-100 text-burgundy mb-4 text-2xl">
            ❓
          </div>
          <h2 className="font-display text-2xl font-bold text-burgundy mb-2">Order Not Found</h2>
          <p className="text-sm text-burgundy/75 max-w-md mx-auto">
            We couldn't find the requested order. Please double check the ID link or search for it in My Orders.
          </p>
        </div>
      </div>
    );
  }

  if (error === 'API_ERROR') {
    return (
      <div className="space-y-4">
        <Link to="/my-orders" className="text-sm font-semibold text-burgundy">← Back to My Orders</Link>
        <div className="market-card p-8 text-center border border-burgundy/15 bg-white space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-2xl">
            🔌
          </div>
          <div className="space-y-1">
            <h2 className="font-display text-2xl font-bold text-burgundy">Connection Error</h2>
            <p className="text-sm text-burgundy/75 max-w-md mx-auto">
              We had trouble communicating with the server. Please check your network connection and try again.
            </p>
          </div>
          <div>
            <button
              className="market-btn px-6 py-2.5 text-xs font-semibold hover:bg-burgundy-soft shadow-sm"
              onClick={load}
            >
              🔄 Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const currentStatus = String(order.status).toUpperCase();
  const historyByStatus = new Map((order.statusHistory || []).map((entry) => [entry.status, entry]));
  const timelineSteps = [
    { key: 'PENDING', label: 'Order Placed' },
    { key: 'CONFIRMED', label: 'Confirmed' },
    { key: 'PROCESSING', label: 'Processing' },
    { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
    { key: 'DELIVERED', label: 'Delivered' },
    { key: 'COMPLETED', label: 'Completed' },
  ];

  const cancelledTimeline = (() => {
    if (currentStatus !== 'CANCELLED') return timelineSteps;
    let lastIndex = -1;
    for (let i = 0; i < timelineSteps.length; i++) {
      if (historyByStatus.has(timelineSteps[i].key)) {
        lastIndex = i;
      }
    }
    const result = [...timelineSteps];
    result.splice(lastIndex + 1, 0, { key: 'CANCELLED', label: 'Cancelled' });
    return result;
  })();

  const activeTimeline = currentStatus === 'CANCELLED' ? cancelledTimeline : timelineSteps;

  return (
    <div className="space-y-6">
      <Link to="/my-orders" className="text-sm font-semibold text-burgundy hover:underline">← Back to My Orders</Link>
      
      <div className="market-card p-6 border border-burgundy/5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold text-burgundy sm:text-3xl">
              Order #{String(order.orderNumber || 0).padStart(4, '0')}
            </h1>
            <p className="mt-2 text-sm text-burgundy/60">
              Ordered {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
          <span className={`inline-flex self-start rounded-full px-3.5 py-1.5 text-sm font-semibold ${
            currentStatus === 'CANCELLED' ? 'bg-stone-200 text-stone-700' :
            currentStatus === 'DELIVERED' || currentStatus === 'COMPLETED' ? 'bg-leaf-mist text-leaf' :
            'bg-amber-50 text-amber-800'
          }`}>
            {formatStatus(currentStatus)}
          </span>
          <div className="mt-3 flex items-center justify-end gap-4">
            <div className="text-right">
              <div className="text-sm text-burgundy/60">Total</div>
              <div className="text-lg font-semibold text-burgundy">{formatCurrency(order.totalAmount)}</div>
            </div>
          </div>
        </div>
        
        {/* Short customer friendly status description */}
        <p className="mt-5 rounded-2xl bg-cream-50 p-4 text-sm leading-6 text-burgundy/75 border border-burgundy/5">
          {descriptions[currentStatus] || 'Your order status is being updated.'}
        </p>

        {/* Timeline visualization */}
        <div className="mx-auto mt-8 max-w-xl pl-0 sm:pl-4">
          {activeTimeline.map((step, index) => {
            const entry = historyByStatus.get(step.key);
            const isCancelled = step.key === 'CANCELLED';
            const isCurrent = isCancelled ? currentStatus === 'CANCELLED' : step.key === currentStatus;
            const isCompleted = !isCurrent && !isCancelled && historyByStatus.has(step.key);

            const nextStep = activeTimeline[index + 1];
            const nextEntry = nextStep ? historyByStatus.get(nextStep.key) : null;
            const isNextCurrent = nextStep ? (nextStep.key === currentStatus || (nextStep.key === 'CANCELLED' && currentStatus === 'CANCELLED')) : false;
            const isLineActive = !!nextEntry || isNextCurrent;
            const isLineCancelled = nextStep && nextStep.key === 'CANCELLED';

            const timestamp = entry
              ? new Date(entry.createdAt).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })
              : null;

            return (
              <div className="relative flex gap-4 pb-6 sm:gap-6" key={step.key}>
                {index < activeTimeline.length - 1 && (
                  <div className={`absolute left-4 top-8 -ml-px h-full w-[2px] transition-colors duration-300 ${
                    isLineCancelled ? 'bg-rose-300' : isLineActive ? 'bg-leaf' : 'bg-cream-200'
                  }`} />
                )}

                <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-300 ${
                  isCompleted ? 'bg-leaf border-leaf text-white shadow-sm' :
                  isCurrent ? 'bg-burgundy border-burgundy text-white shadow-soft animate-rise' :
                  isCancelled ? 'bg-rose-600 border-rose-600 text-white shadow-sm' :
                  'bg-white border-cream-200 text-stone-300'
                }`}>
                  {isCompleted ? '✓' : isCurrent ? (isCancelled ? '❌' : '●') : '○'}
                </div>

                <div className="min-w-0 pt-0.5">
                  <div className={`text-sm font-semibold transition-colors duration-300 ${
                    isCancelled ? 'text-rose-700' :
                    isCurrent ? 'text-base font-bold text-burgundy' :
                    isCompleted ? 'text-burgundy/80' : 'text-burgundy/40'
                  }`}>
                    {step.label}
                  </div>
                  {timestamp && (
                    <div className="mt-1 text-xs text-burgundy/50">
                      {timestamp}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="market-card border border-burgundy/5 p-4 sm:p-6">
          <h2 className="font-display text-2xl font-bold text-burgundy">Ordered Products</h2>
          <div className="mt-4 space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex flex-col gap-2 rounded-2xl border border-burgundy/5 bg-cream-50 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-burgundy">{item.product?.name || item.productId}</p>
                  <p className="text-sm text-burgundy/60">
                    {item.quantityKg} kg × {formatCurrency(item.pricePerKg)}
                  </p>
                </div>
                <p className="font-semibold text-burgundy sm:text-right">{formatCurrency(item.subtotal)}</p>
              </div>
            ))}
          </div>
            
          <div className="mt-5 border-t border-burgundy/10 pt-4 text-sm text-burgundy/70">
            <div className="flex items-center justify-between gap-2">
              <span>Delivery Fee</span>
              <span className="font-semibold text-leaf">{formatCurrency(0)} (Free)</span>
            </div>
              
            <div className="mt-2 flex items-center justify-between gap-2 text-lg font-bold text-burgundy">
              <span>Total</span>
              <span>{formatCurrency(order.totalAmount)}</span>
            </div>
          </div>
        </div>
        
        <div className="market-card border border-burgundy/5 p-4 sm:p-6">
          <h2 className="font-display text-2xl font-bold text-burgundy">Delivery Details</h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="font-semibold text-burgundy/60">Customer</dt>
              <dd className="mt-1 font-medium text-burgundy">{order.customerName}</dd>
            </div>
            <div>
              <dt className="font-semibold text-burgundy/60">Phone</dt>
              <dd className="mt-1 font-medium text-burgundy">{order.contactNumber}</dd>
            </div>
            <div>
              <dt className="font-semibold text-burgundy/60">Address</dt>
              <dd className="mt-1 break-words font-medium text-burgundy">{order.address}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}