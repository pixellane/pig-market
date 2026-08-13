import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useCart } from '../contexts/CartContext.jsx';
import { resolveImageUrl } from '../utils/imageUrl.js';
import { ClearanceBanner, StockBadge, formatKg, getStockStatus } from '../utils/stockStatus.jsx';
import { useInventoryRealtime } from '../realtime/InventoryRealtimeProvider.jsx';
import { formatCurrency } from '../utils/currency.js';
import { getApiBasePath } from '../utils/apiUrl.js';
import ImageWithFallback from '../components/ImageWithFallback.jsx';

const api = axios.create({ baseURL: getApiBasePath() || '/api' });

export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState('');
  const { addItem, items: cartItems, syncInventory } = useCart();
  const { subscribe } = useInventoryRealtime();

  useEffect(() => {
    async function load() {
      try {
        const response = await api.get(`/products/${id}`);
        setProduct(response.data);
        syncInventory([response.data]);
      } catch (err) {
        setError('Unable to load product.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, syncInventory]);

  useEffect(() => {
    const unsubscribe = subscribe(({ productId, stockKg }) => {
      if (productId !== id) return;
      setProduct((current) => (current ? { ...current, stockKg } : current));
    });
    return unsubscribe;
  }, [id, subscribe]);

  const inventoryStock = Math.max(0, Number(product?.stockKg) || 0);
  const inCart = Math.max(0, Number(cartItems.find((item) => item.productId === id)?.quantityKg) || 0);
  const remaining = Math.max(0, Number((inventoryStock - inCart).toFixed(2)));

  // Helper: readable remaining string
  const remainingLabel = remaining > 0 ? `${remaining.toFixed(1)} kg available` : 'Sold out';

  useEffect(() => {
    if (!product) return;
    if (remaining <= 0) {
      setQuantity(0);
      return;
    }
    setQuantity((q) => Math.min(Math.max(0.5, q || 0.5), remaining));
  }, [product?.id, remaining]);

  if (loading) return (
    <div className="flex min-h-[50vh] items-center justify-center rounded-[2rem] border border-burgundy/10 bg-white/80 p-8 text-center shadow-card">
      <div className="max-w-sm space-y-2">
        <p className="text-lg font-semibold text-burgundy">Loading product...</p>
        <p className="text-sm leading-6 text-burgundy/70">We are loading the product details for you.</p>
      </div>
    </div>
  );
  if (error) return (
    <div className="flex min-h-[50vh] items-center justify-center rounded-[2rem] border border-burgundy/10 bg-white/80 p-8 text-center shadow-card">
      <div className="max-w-sm space-y-3">
        <p className="text-lg font-semibold text-burgundy">{error}</p>
        <p className="text-sm leading-6 text-burgundy/70">Please check your connection and try again.</p>
      </div>
    </div>
  );
  if (!product) return (
    <div className="flex min-h-[50vh] items-center justify-center rounded-[2rem] border border-burgundy/10 bg-white/80 p-8 text-center shadow-card">
      <div className="max-w-sm space-y-2">
        <p className="text-lg font-semibold text-burgundy">Product not found.</p>
        <p className="text-sm leading-6 text-burgundy/70">The requested cut is not available right now.</p>
      </div>
    </div>
  );

  const stock = getStockStatus(inventoryStock);
  const canAddMore = stock.canAdd && remaining > 0;
  const totalPrice = Number(product.pricePerKg) * quantity;

  function handleAddToCart(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!canAddMore || adding) return;
    setAdding(true);
    try {
      const qty = Math.min(remaining, Number(quantity) || 0.5);
      addItem(product, qty);
      setMessage(`${product.name} — ${qty.toFixed(1)}kg added to cart`);
      window.setTimeout(() => setMessage(''), 2500);
    } finally {
      setTimeout(() => setAdding(false), 300);
    }
  }

  return (
    <div className="space-y-6">
      <button className="inline-flex items-center gap-2 text-sm font-semibold text-burgundy/70 hover:text-burgundy" onClick={() => navigate(-1)}>
        <span aria-hidden="true">←</span>
        <span>Back to products</span>
      </button>
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="market-card overflow-hidden">
          {resolveImageUrl(product.imageUrl) ? (
            <ImageWithFallback
              src={resolveImageUrl(product.imageUrl)}
              alt={product.name}
              className={`h-56 w-full object-cover sm:h-72 lg:h-[28rem] ${stock.canAdd ? '' : 'opacity-70 grayscale'}`}
            />
          ) : (
            <div className="flex h-56 w-full items-center justify-center bg-cream-100 text-burgundy/50 sm:h-72 lg:h-[28rem]">No image available</div>
          )}
        </div>
        <div className="market-card space-y-5 p-4 sm:p-6">
          <div>
            <h1 className="font-display text-2xl font-bold leading-tight text-burgundy sm:text-3xl">{product.name}</h1>
            <p className="mt-3 text-sm leading-7 text-burgundy/70 sm:text-base">{product.description}</p>
          </div>
          <div className="rounded-3xl border border-burgundy/10 bg-cream-50 p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-burgundy sm:text-base">{formatCurrency(product.pricePerKg)} / kg</div>
              <div className="text-sm text-burgundy/70">{remainingLabel}</div>
            </div>
            <div className="mt-3 space-y-2">
              <ClearanceBanner product={product} formatPrice={formatCurrency} />
              <StockBadge stockKg={inventoryStock} />
              {inCart > 0 ? (
                <p className="text-sm font-semibold text-burgundy/60">In cart: {formatKg(inCart)} kg</p>
              ) : null}
            </div>

            {canAddMore ? (
              <>
                <div className="mt-4">
                  <div className="flex items-center gap-3 rounded-3xl border border-burgundy/10 bg-white p-3 sm:p-4">
                    <button
                      onClick={() => setQuantity((q) => Math.max(0.5, Number((q - 0.5).toFixed(2))))}
                      aria-label="Decrease quantity"
                      className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cream-100 text-2xl font-bold text-burgundy sm:h-14 sm:w-14"
                    >-</button>
                    <div className="flex-1 text-center">
                      <div className="text-sm text-burgundy/70">Selected</div>
                      <div className="text-lg font-semibold text-burgundy sm:text-xl">{quantity.toFixed(1)} kg</div>
                    </div>
                    <button
                      onClick={() => setQuantity((q) => Math.min(remaining, Number((q + 0.5).toFixed(2))))}
                      aria-label="Increase quantity"
                      className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cream-100 text-2xl font-bold text-burgundy sm:h-14 sm:w-14"
                    >+</button>
                  </div>
                  <div className="mt-2 text-xs text-burgundy/60">Sold by 0.5 kg increments. Max per order: {inventoryStock.toFixed(1)} kg.</div>
                  {remaining <= 1.5 && remaining > 0 ? (
                    <div className="mt-2 rounded-2xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">Only {remaining.toFixed(1)} kg left — consider ordering soon.</div>
                  ) : null}
                </div>
                <div className="mt-4 text-sm text-burgundy/80 sm:text-base">Total: <span className="font-semibold text-burgundy">{formatCurrency(totalPrice)}</span></div>
              </>
            ) : (
              <div className="mt-4 text-sm font-semibold text-rose-600">Sold out</div>
            )}

            <div className="mt-4">
              <button
                onClick={handleAddToCart}
                disabled={!canAddMore || adding}
                className={`market-btn mt-0 w-full justify-center py-4 text-base ${(!canAddMore || adding) ? 'opacity-60' : ''}`}
              >
                {adding ? 'Adding...' : (!stock.canAdd ? 'Sold Out' : remaining <= 0 ? 'Max in Cart' : 'Add to Cart')}
              </button>
              {message ? <div className="mt-3 text-center text-sm font-semibold text-leaf">{message}</div> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
