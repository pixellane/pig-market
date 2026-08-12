import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useCart } from '../contexts/CartContext.jsx';
import { normalizePhilippineNumber, isValidPhilippineNumber } from '../utils/contactUtils.js';
import { formatCurrency } from '../utils/currency.js';
import { getApiBasePath } from '../utils/apiUrl.js';

const api = axios.create({ baseURL: getApiBasePath() || '/api' });

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, total, clear, syncInventory } = useCart();
  const [form, setForm] = useState(() => {
    try {
      const savedBuyer = JSON.parse(localStorage.getItem('pigmarket-buyer') || 'null');
      return {
        customerName: savedBuyer?.customerName || '',
        address: '',
        contactNumber: savedBuyer?.contactNumber || '',
      };
    } catch {
      return { customerName: '', address: '', contactNumber: '' };
    }
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdOrderId, setCreatedOrderId] = useState('');
  const [createdOrderNumber, setCreatedOrderNumber] = useState('');

  useEffect(() => {
    if (success) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, [success]);

  const normalizedContact = useMemo(() => normalizePhilippineNumber(form.contactNumber || ''), [form.contactNumber]);

  if (!items.length && !success) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center rounded-[2rem] border border-burgundy/10 bg-white/80 p-8 text-center shadow-card">
        <div className="max-w-sm space-y-4">
          <h2 className="font-display text-2xl font-bold text-burgundy">No products in cart</h2>
          <p className="text-sm leading-6 text-burgundy/65">Add some meat before checking out.</p>
          <button onClick={() => navigate('/')} className="market-btn mx-auto">Back to shop</button>
        </div>
      </div>
    );
  }

  if (success && !items.length) {
    const orderLabel = createdOrderNumber ? `Order ${createdOrderNumber}` : createdOrderId ? `Order ID ${createdOrderId}` : null;

    return (
      <div className="flex min-h-[50vh] items-center justify-center rounded-[2rem] border border-burgundy/10 bg-white/80 p-8 text-center shadow-card">
        <div className="max-w-md space-y-5">
          <h2 className="font-display text-3xl font-bold text-burgundy">Order placed successfully</h2>
          {orderLabel ? <p className="text-base font-semibold text-burgundy/75">{orderLabel}</p> : null}
          <p className="text-base leading-7 text-burgundy/75">Your order has been submitted and your contact has been saved for future My Orders lookups.</p>
          <div className="rounded-2xl bg-leaf-mist p-4 text-sm leading-6 text-leaf">{success}</div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => navigate('/my-orders')} className="market-btn flex-1 justify-center">View My Orders</button>
            <button type="button" onClick={() => navigate('/')} className="market-btn-secondary flex-1 justify-center">Continue Shopping</button>
          </div>
        </div>
      </div>
    );
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: '' }));
    setError('');
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!form.customerName.trim()) nextErrors.customerName = 'Full name is required.';
    if (!form.address.trim()) nextErrors.address = 'Delivery address is required.';
    if (!normalizedContact) nextErrors.contactNumber = 'Please enter a valid contact number.';

    if (items.some((item) => Number(item.quantityKg) <= 0 || Number(item.quantityKg) > Number(item.stockKg || 0))) {
      nextErrors.cart = 'Your cart contains invalid quantities. Please review your selection.';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handlePlaceOrder = async () => {
    if (loading) return;

    if (!validateForm()) {
      setError('Please review the highlighted fields before placing your order.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/orders', {
        customerName: form.customerName.trim(),
        address: form.address.trim(),
        contactNumber: normalizedContact,
        items: items.map(({ productId, quantityKg }) => ({ productId, quantityKg })),
      });

      const orderId = response.data?.id;
      let orderNumber = '';
      if (orderId) {
        try {
          const detailsResponse = await api.get(`/orders/mine/${orderId}`, {
            params: { contactNumber: normalizedContact },
          });
          orderNumber = detailsResponse.data?.orderNumber || '';
        } catch {
          orderNumber = '';
        }
      }

      localStorage.setItem('pigmarket-buyer', JSON.stringify({
        customerName: form.customerName.trim(),
        contactNumber: normalizedContact,
      }));

      clear();
      setCreatedOrderId(orderId || '');
      setCreatedOrderNumber(orderNumber);
      setSuccess(orderNumber
        ? `Order ${orderNumber} placed successfully. Your order is now in My Orders.`
        : 'Order placed successfully. Your order is now in My Orders.');
      setForm({ customerName: '', address: '', contactNumber: '' });
      setFieldErrors({});
    } catch (err) {
      const message = err.response?.data?.message || 'Unable to place your order right now. Please check your connection and try again.';
      setError(message);
      // On insufficient stock / race, pull live inventory so cart caps match PostgreSQL
      try {
        const productsResp = await api.get('/products', {
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        });
        syncInventory(Array.isArray(productsResp.data) ? productsResp.data : []);
      } catch {
        // Keep the server error message even if the inventory refresh fails.
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="market-card p-6">
        <h1 className="font-display text-3xl font-bold text-burgundy">Checkout</h1>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="market-card space-y-4 p-4 sm:p-6">
          <div>
            <h2 className="font-display text-xl font-semibold text-burgundy">Customer information</h2>
            <p className="mt-1 text-sm text-burgundy/65">Enter your details to complete the order.</p>
          </div>
          <div className="grid gap-4">
            <label className="block space-y-2 text-sm text-burgundy/80">
              <span>Full Name</span>
              <input
                name="customerName"
                value={form.customerName}
                onChange={handleChange}
                className={`min-h-[48px] w-full rounded-2xl border bg-cream-50 px-4 py-3 text-base text-burgundy ${fieldErrors.customerName ? 'border-red-400' : 'border-burgundy/15'}`}
              />
              {fieldErrors.customerName ? <span className="text-sm text-red-600">{fieldErrors.customerName}</span> : null}
            </label>
            <label className="block space-y-2 text-sm text-burgundy/80">
              <span>Address</span>
              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                className={`min-h-[112px] w-full rounded-2xl border bg-cream-50 px-4 py-3 text-base text-burgundy ${fieldErrors.address ? 'border-red-400' : 'border-burgundy/15'}`}
                rows="3"
              />
              {fieldErrors.address ? <span className="text-sm text-red-600">{fieldErrors.address}</span> : null}
            </label>
            <label className="block space-y-2 text-sm text-burgundy/80">
              <span>Contact Number</span>
              <input
                name="contactNumber"
                value={form.contactNumber}
                onChange={handleChange}
                className={`min-h-[48px] w-full rounded-2xl border bg-cream-50 px-4 py-3 text-base text-burgundy ${fieldErrors.contactNumber ? 'border-red-400' : 'border-burgundy/15'}`}
              />
              {fieldErrors.contactNumber ? <span className="text-sm text-red-600">{fieldErrors.contactNumber}</span> : null}
            </label>
          </div>
          {fieldErrors.cart ? <div className="rounded-2xl bg-red-50 p-4 text-sm leading-6 text-red-700">{fieldErrors.cart}</div> : null}
          {error ? <div className="rounded-2xl bg-burgundy/10 p-4 text-sm leading-6 text-burgundy">{error}</div> : null}
          {success ? <div className="rounded-2xl bg-leaf-mist p-4 text-sm leading-6 text-leaf">{success}</div> : null}
          {success ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => navigate('/my-orders')} className="market-btn flex-1 justify-center">View My Orders</button>
              <button type="button" onClick={() => navigate('/')} className="market-btn-secondary flex-1 justify-center">Continue Shopping</button>
            </div>
          ) : null}
        </div>
        <div className="market-card space-y-4 p-4 sm:p-6">
          <div>
            <h2 className="font-display text-xl font-semibold text-burgundy">Order summary</h2>
          </div>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.productId} className="rounded-3xl border border-burgundy/10 bg-cream-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2 text-sm text-burgundy/70">
                  <span className="min-w-0 break-words">{item.name}</span>
                  <span className="shrink-0">{Number(item.quantityKg).toFixed(1)} kg</span>
                </div>
                <div className="mt-2 text-sm font-semibold text-burgundy">{formatCurrency(item.pricePerKg * item.quantityKg)}</div>
              </div>
            ))}
          </div>
          <div className="rounded-3xl bg-cream-100 p-4 text-burgundy/80">
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-burgundy/70">
                <span>Subtotal</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between text-sm text-burgundy/70">
                <span>Delivery fee</span>
                <span>{formatCurrency(0)}</span>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-base font-semibold text-burgundy">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
          {!success ? (
            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={loading}
              className="market-btn w-full justify-center py-4 text-base disabled:cursor-not-allowed disabled:opacity-75"
            >
              {loading ? 'Placing Order...' : 'Place Order'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
