import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useCart } from '../contexts/CartContext.jsx';

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || '/api' });

function formatPrice(value) {
  return `₱${Number(value).toFixed(2)}`;
}

export default function CartPage() {
  const { items, total, updateQuantity, removeItem, syncInventory } = useCart();
  const navigate = useNavigate();

  // Keep cart qty caps aligned with live PostgreSQL inventory (does not change DB)
  useEffect(() => {
    let active = true;
    api.get('/products', { headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' } })
      .then((resp) => {
        if (active) syncInventory(Array.isArray(resp.data) ? resp.data : []);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [syncInventory]);

  if (!items.length) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center rounded-[2rem] border border-burgundy/10 bg-white/80 p-8 text-center shadow-card">
        <div className="max-w-sm space-y-4">
          <h2 className="font-display text-2xl font-bold text-burgundy">Your cart is empty</h2>
          <p className="text-sm leading-6 text-burgundy/65">Browse our fresh pork cuts and add kilos to your order.</p>
          <button onClick={() => navigate('/')} className="market-btn mx-auto">Start Shopping</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="market-card p-6">
        <h1 className="font-display text-3xl font-bold text-burgundy">Shopping Cart</h1>
        <p className="mt-2 text-sm text-burgundy/65">Cart quantity is held only until checkout — store inventory comes from the database.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.5fr_0.8fr]">
        <div className="space-y-4">
          {items.map((item) => {
            const inventoryStock = Math.max(0, Number(item.stockKg) || 0);
            const maxQuantity = inventoryStock;
            const quantity = Number(item.quantityKg) || 0.5;

            return (
              <div key={item.productId} className="market-card p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="font-display text-lg font-semibold leading-tight text-burgundy sm:text-xl">{item.name}</h2>
                    <p className="mt-1 text-sm text-burgundy/65">{formatPrice(item.pricePerKg)} / kg</p>
                    <p className="mt-1 text-xs font-semibold text-burgundy/55">
                      Store stock: {inventoryStock.toFixed(1)} kg · In cart: {quantity.toFixed(1)} kg
                    </p>
                  </div>
                  <button onClick={() => removeItem(item.productId)} className="self-start text-sm font-semibold text-burgundy hover:underline">Remove</button>
                </div>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-burgundy/10 bg-cream-50 px-3 py-2">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.productId, Number((quantity - 0.5).toFixed(2)))}
                      disabled={quantity <= 0.5}
                      className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl font-bold text-burgundy disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      -
                    </button>
                    <span className="min-w-[4.5rem] text-center text-lg font-semibold text-burgundy">{quantity.toFixed(1)} kg</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.productId, Number((quantity + 0.5).toFixed(2)))}
                      disabled={quantity >= maxQuantity}
                      className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl font-bold text-burgundy disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-sm text-burgundy/80 sm:text-right">
                    Subtotal: <span className="font-semibold text-burgundy">{formatPrice(quantity * item.pricePerKg)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="market-card p-5 sm:p-6">
          <div className="space-y-4">
            <div>
              <h2 className="font-display text-xl font-semibold text-burgundy">Order summary</h2>
              <p className="mt-2 text-sm text-burgundy/65">Review your items before checkout.</p>
            </div>
            <div className="rounded-3xl bg-cream-50 p-4 text-burgundy/80">
              <div className="flex justify-between py-2 text-sm">Total</div>
              <div className="text-2xl font-semibold text-burgundy">{formatPrice(total)}</div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button onClick={() => navigate('/')} className="market-btn-secondary flex-1 justify-center">Continue Shopping</button>
              <button onClick={() => navigate('/checkout')} className="market-btn flex-1 justify-center">Proceed to Checkout</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
