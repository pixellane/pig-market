import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useCart } from '../contexts/CartContext.jsx';
import { resolveImageUrl } from '../utils/imageUrl.js';
import { ClearanceBanner, StockBadge, formatKg, getStockStatus } from '../utils/stockStatus.jsx';
import { normalizePhilippineNumber } from '../utils/contactUtils.js';
import { useInventoryRealtime } from '../realtime/InventoryRealtimeProvider.jsx';
import { formatCurrency } from '../utils/currency.js';
import { getApiBasePath } from '../utils/apiUrl.js';
import ImageWithFallback from '../components/ImageWithFallback.jsx';

const api = axios.create({ baseURL: getApiBasePath() || '/api' });

const defaultStoreSettings = {
  storeName: 'Heritage Hog Co.',
  contactNumber: '[Store contact number]',
  email: '[Store email address]',
  address: '[Store address]',
  businessHours: '[Business hours]',
  deliveryInformation: '[Delivery information]',
  facebookUrl: '[Facebook page URL]',
};

function isValidSetting(value) {
  return Boolean(value && !/\[(?:Store|Business) .*\]|example/i.test(value));
}

function formatSetting(value, fallback = 'Not configured') {
  return isValidSetting(value) ? value : fallback;
}

function formatStatus(status) {
  const normalized = String(status).toUpperCase();
  if (normalized === 'OUT_FOR_DELIVERY') return 'Out for Delivery';
  if (normalized === 'PENDING') return 'Pending';
  if (normalized === 'CONFIRMED') return 'Confirmed';
  if (normalized === 'PROCESSING') return 'Processing';
  if (normalized === 'DELIVERED' || normalized === 'COMPLETED') return 'Delivered';
  if (normalized === 'CANCELLED') return 'Cancelled';
  return normalized.replaceAll('_', ' ');
}

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [featuredProduct, setFeaturedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState(() => new URLSearchParams(window.location.search).get('q') || '');
  const [productQuantities, setProductQuantities] = useState({});
  const [storeSettings, setStoreSettings] = useState(defaultStoreSettings);
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantMessages, setAssistantMessages] = useState([
    { role: 'assistant', text: "Hi! I'm the Heritage Hog Co. Assistant. Ask me about our products, orders, delivery, or how the shop works." },
  ]);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantError, setAssistantError] = useState('');
  const { addItem, items: cartItems, syncInventory } = useCart();
  const { subscribe } = useInventoryRealtime();
  const navigate = useNavigate();
  const location = useLocation();
  const [addingMap, setAddingMap] = useState({});
  const [sortKey, setSortKey] = useState('default');

  function getCartQuantity(productId) {
    const item = cartItems.find((entry) => entry.productId === productId);
    return Math.max(0, Number(item?.quantityKg) || 0);
  }

  /** Remaining kilos this shopper can still add (inventory minus their cart). Does not change DB stock. */
  function getRemainingStock(product) {
    const inventory = Math.max(0, Number(product.stockKg) || 0);
    return Math.max(0, Number((inventory - getCartQuantity(product.id)).toFixed(2)));
  }


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

  async function fetchBuyerOrders() {
    if (!buyer?.contactNumber) return null;
    try {
      const response = await api.get('/orders/mine', { params: { contactNumber: buyer.contactNumber, page: 1, pageSize: 5 } });
      return response.data.orders || [];
    } catch {
      return null;
    }
  }

  function getLatestOrder(orders) {
    return [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] || null;
  }

  function summarizeOrder(order) {
    if (!order) return null;
    const title = `Order #${String(order.orderNumber || 0).padStart(4, '0')}`;
    return `${title} is currently ${formatStatus(order.status)}. Total is ${formatCurrency(order.totalAmount)}.`;
  }

  function getSuggestedQuantity(product) {
    const remaining = getRemainingStock(product);
    if (remaining <= 0) return 0;
    return Math.min(1, Math.max(0.5, remaining));
  }

  function getQuantityForProduct(product) {
    const remaining = getRemainingStock(product);
    if (productQuantities[product.id] !== undefined) {
      const selected = productQuantities[product.id];
      if (remaining <= 0) return 0;
      return Math.min(selected, remaining);
    }
    return getSuggestedQuantity(product);
  }

  function updateProductQuantity(product, nextValue) {
    const remaining = getRemainingStock(product);
    const safeValue = Number(nextValue);
    if (!Number.isFinite(safeValue)) return;
    const clamped = remaining <= 0 ? 0 : Math.min(remaining, Math.max(0.5, Number(safeValue.toFixed(2))));
    setProductQuantities((current) => ({ ...current, [product.id]: clamped }));
  }

  function adjustProductQuantity(product, delta) {
    const current = getQuantityForProduct(product);
    updateProductQuantity(product, current + delta);
  }

  useEffect(() => {
    let active = true;
    let requestSeq = 0;
    let lastFetchAt = 0;

    async function fetchProducts({ initial = false } = {}) {
      const seq = ++requestSeq;
      try {
        const response = await api.get('/products', {
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        });
        // Ignore outdated responses so an older in-flight GET cannot overwrite newer stock
        if (!active || seq !== requestSeq) return;
        const nextProducts = Array.isArray(response.data) ? response.data : [];
        setProducts(nextProducts);
        syncInventory(nextProducts);
        setError('');
        lastFetchAt = Date.now();
      } catch {
        if (active && initial) setError('Unable to load products.');
      } finally {
        if (active && initial) setLoading(false);
      }
    }

    const refreshWhenVisible = () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastFetchAt < 1000) return;
      fetchProducts();
    };

    fetchProducts({ initial: true });
    const intervalId = window.setInterval(() => fetchProducts(), 15000);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('focus', refreshWhenVisible);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('focus', refreshWhenVisible);
    };
  }, [syncInventory]);

  // Re-read stock from the API when navigating back to the product list
  useEffect(() => {
    if (!(location.pathname === '/' || location.hash === '#cuts')) return undefined;
    let active = true;
    api.get('/products', { headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' } })
      .then((resp) => {
        if (!active) return;
        const nextProducts = Array.isArray(resp.data) ? resp.data : [];
        setProducts(nextProducts);
        syncInventory(nextProducts);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [location.key, location.pathname, location.hash, syncInventory]);

  useEffect(() => {
    const unsubscribe = subscribe(({ productId, stockKg }) => {
      setProducts((current) => {
        if (!current.some((product) => product.id === productId)) return current;
        return current.map((product) => (
          product.id === productId ? { ...product, stockKg } : product
        ));
      });
      setFeaturedProduct((current) => (current?.id === productId ? { ...current, stockKg } : current));
    });
    return unsubscribe;
  }, [subscribe]);

  useEffect(() => {
    let active = true;
    let requestInFlight = false;

    async function loadStoreSettings() {
      if (requestInFlight) return;
      requestInFlight = true;
      try {
        const response = await api.get('/settings');
        if (active) setStoreSettings({ ...defaultStoreSettings, ...response.data });
      } catch {
        // Keep the last known settings while the API is unavailable.
      } finally {
        requestInFlight = false;
      }
    }

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') loadStoreSettings();
    };

    loadStoreSettings();
    const intervalId = window.setInterval(loadStoreSettings, 15000);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('focus', refreshWhenVisible);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('focus', refreshWhenVisible);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadFeaturedProduct() {
      try {
        const response = await api.get('/products/featured');
        if (!active) return;
        setFeaturedProduct(response.data || null);
      } catch {
        if (!active) return;
        setFeaturedProduct(null);
      }
    }

    loadFeaturedProduct();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (window.location.hash === '#cuts') {
      document.getElementById('cuts')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [loading]);

  useEffect(() => {
    if (location.pathname === '/') {
      setSearchQuery(new URLSearchParams(location.search).get('q') || '');
    }
  }, [location.pathname, location.search]);

  async function answerAssistant(question, orderResults = null) {
    const query = question.toLowerCase();
    const product = products.find((item) => {
      const name = String(item.name || '').toLowerCase();
      return query.includes(name) || (name.includes('belly') && query.includes('liempo')) || (name.includes('liver') && query.includes('atay'));
    });

    if (product && /(price|cost|how much|kilo|kg|available|stock|have|sell)/.test(query)) {
      const stock = Number(product.stockKg) || 0;
      const availability = stock > 0 ? ` It currently has ${stock} kg available.` : ' It is currently sold out.';
      return `${product.name} is currently ${formatCurrency(product.pricePerKg)} per kg.${availability}`;
    }
    if (/(low stock|running low|almost sold out|last stock|sold out|available.*(few|low)|how much stock|stock status)/.test(query)) {
      const lowStockProducts = products.filter((item) => {
        const status = getStockStatus(item.stockKg);
        return ['low_stock', 'out_of_stock'].includes(status.level);
      });
      if (!lowStockProducts.length) return 'All available products are sufficiently stocked right now. Please check our product list for the latest availability.';
      return `Low-stock or limited products include: ${lowStockProducts.map((item) => `${item.name} (${getStockStatus(item.stockKg).shortLabel})`).join(', ')}.`;
    }
    if (/(pork liver|atay|pork belly|liempo|pork chop|pork shoulder|abaga|pork leg|paa|pork ribs|tadyang|pork loin|lomo|tenderloin|pork feet|tiil|pata|maskara)/.test(query) && /(have|available|sell|price|cost|how much|stock)/.test(query)) {
      return 'That cut is not currently listed in our available products. Please check the storefront or contact us for help.';
    }
    if (/(what.*(product|cut)|available.*(product|cut)|pork cuts|what do you sell)/.test(query)) {
      return products.length
        ? `Our current products are ${products.map((item) => item.name).join(', ')}.`
        : 'Our product list is currently unavailable. Please check the storefront again soon.';
    }
    if (/(where.*my order|my order|order status|track.*order|show.*order|status of.*order|when.*confirmed)/.test(query)) {
      if (!buyer?.contactNumber) {
        return 'To answer order questions, please place an order and use the same contact number at checkout. You can view your order status in My Orders.';
      }
      if (orderResults === null) {
        return 'I could not access your order information right now. Please use My Orders to check your status.';
      }
      if (!orderResults.length) {
        return 'I could not find any orders for your contact number. Please check your contact number in My Orders.';
      }
      const latestOrder = getLatestOrder(orderResults);
      if (/(when.*confirmed|confirmed when|order.*confirmed)/.test(query)) {
        const confirmed = latestOrder.statusHistory?.find((entry) => entry.status === 'CONFIRMED');
        if (confirmed) {
          return `Your latest order (#${String(latestOrder.orderNumber || 0).padStart(4, '0')}) was confirmed on ${new Date(confirmed.createdAt).toLocaleString()}.`; 
        }
        return `Your latest order (#${String(latestOrder.orderNumber || 0).padStart(4, '0')}) has not entered the confirmed stage yet. Its current status is ${formatStatus(latestOrder.status)}.`;
      }
      return `${summarizeOrder(latestOrder)} You can review details in My Orders.`;
    }
    if (/(add|cart|buy)/.test(query)) return 'Choose a product, select Add to Cart, then open your Cart to review the items.';
    if (/(checkout|place.*order|order.*work)/.test(query)) return 'Open your Cart, review the quantities and prices, choose Checkout, enter your details, and place the order normally.';
    if (/(edit|change).*order/.test(query)) return 'Orders can be edited while they are Pending or Confirmed. Once an order is Processing, Out for Delivery, Delivered, or Cancelled, it can no longer be edited. Use My Orders.';
    if (/(cancel|cancellation)/.test(query)) return 'Pending and Confirmed orders can be cancelled. Orders that are Processing, Out for Delivery, Delivered, or Cancelled cannot be cancelled. Use My Orders.';
    if (/(order again|again|reorder)/.test(query)) return 'Use Order Again on a Delivered or Cancelled order. Available products are added to your cart at current prices so you can review them before Checkout.';
    if (/(delivery|deliver)/.test(query)) {
      return isValidSetting(storeSettings.deliveryInformation)
        ? `Delivery information: ${storeSettings.deliveryInformation}.`
        : 'Delivery information is not currently available. Please contact the shop for delivery details.';
    }
    if (/(contact|phone|address|hours|help|facebook)/.test(query)) {
      const contactInfo = isValidSetting(storeSettings.contactNumber) ? `Phone: ${storeSettings.contactNumber}.` : '';
      const addressInfo = isValidSetting(storeSettings.address) ? ` Address: ${storeSettings.address}.` : '';
      const hoursInfo = isValidSetting(storeSettings.businessHours) ? ` Hours: ${storeSettings.businessHours}.` : '';
      return `You can contact ${storeSettings.storeName}. ${contactInfo}${addressInfo}${hoursInfo}`.trim();
    }
    if (/(clean|prepare|cut|meat preparation)/.test(query)) return "Our pork cuts are cleaned and prepared according to the shop's normal preparation process. Ask us about available cuts or preparation options.";
    return `I'm not sure about that. Please contact ${storeSettings.storeName} using the information below.`;
  }

  async function askAssistant(question = assistantInput) {
    const trimmed = question.trim();
    if (!trimmed || assistantLoading) return;
    const isOrderQuery = /(where.*my order|my order|order status|track.*order|show.*order|status of.*order|when.*confirmed)/i.test(trimmed);
    setAssistantInput('');
    setAssistantError('');
    setAssistantMessages((current) => [...current, { role: 'user', text: trimmed }]);
    setAssistantLoading(true);
    try {
      const orderResults = isOrderQuery ? await fetchBuyerOrders() : null;
      await new Promise((resolve) => window.setTimeout(resolve, 250));
      const reply = await answerAssistant(trimmed, orderResults);
      setAssistantMessages((current) => [...current, { role: 'assistant', text: reply }]);
    } catch {
      setAssistantError('The assistant could not respond right now. Please use the contact information below.');
    } finally {
      setAssistantLoading(false);
    }
  }

  // Derived query and product lists must be computed unconditionally so hooks execute in the same order
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    return products.filter((product) => {
      const haystack = `${product.name || ''} ${product.description || ''}`.toLowerCase();
      return !normalizedQuery || haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery, products]);

  const displayedProducts = useMemo(() => {
    const copy = [...filteredProducts];
    if (sortKey === 'price-asc') {
      copy.sort((a, b) => Number(a.pricePerKg || 0) - Number(b.pricePerKg || 0));
    } else if (sortKey === 'price-desc') {
      copy.sort((a, b) => Number(b.pricePerKg || 0) - Number(a.pricePerKg || 0));
    } else if (sortKey === 'name-asc') {
      copy.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    }
    return copy;
  }, [filteredProducts, sortKey]);

  if (loading) return (
    <div className="flex min-h-[50vh] items-center justify-center rounded-[2rem] border border-burgundy/10 bg-white/70 p-8 text-center text-burgundy/70 shadow-card">
      <div className="max-w-sm space-y-2">
        <p className="text-lg font-semibold text-burgundy">Loading fresh cuts...</p>
        <p className="text-sm leading-6">We are preparing the storefront so you can browse our available pork cuts.</p>
      </div>
    </div>
  );
  if (error) return (
    <div className="flex min-h-[50vh] items-center justify-center rounded-[2rem] border border-burgundy/10 bg-white/80 p-8 text-center shadow-card">
      <div className="max-w-sm space-y-3">
        <p className="text-lg font-semibold text-burgundy">{error}</p>
        <p className="text-sm leading-6 text-burgundy/70">Please check your connection and try refreshing the page.</p>
      </div>
    </div>
  );

  const fallbackFeaturedProduct = products.find((product) => String(product.name || '').toLowerCase().includes('belly'))
    || products.find((product) => resolveImageUrl(product.imageUrl))
    || products[0];
  const effectiveFeaturedProduct = featuredProduct || fallbackFeaturedProduct;

  return (
    <div className="space-y-12">
      <section className="rounded-[2rem] bg-cream-50 px-6 py-14 shadow-card sm:px-10 sm:py-16 lg:px-12">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex rounded-full bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7A1F2B] shadow-sm shadow-burgundy/10">
              FRESH PORK, FRESHLY PREPARED
            </div>
            <div className="max-w-2xl space-y-6">
              <h1 className="font-display text-5xl font-bold leading-tight tracking-tight text-[#292522] sm:text-6xl lg:text-7xl">
                FRESH PORK,
                <br />
                STRAIGHT FROM
                <br />
                OUR HARVEST.
              </h1>
              <div className="h-0.5 w-24 rounded-full bg-[#F2C14E]/80" />
              <p className="max-w-xl text-base leading-8 text-[#756E67] sm:text-lg">
                Quality pork cuts sold by the kilo. Choose your cut and order exactly what you need.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); document.getElementById('cuts')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); window.history.replaceState({}, '', '/#cuts'); }}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-[#7A1F2B] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#54151E] sm:w-auto"
              >
                SHOP PRODUCTS
              </button>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); navigate('/contact'); }}
                className="inline-flex w-full items-center justify-center rounded-2xl border border-[#E8D8C8] bg-white px-6 py-3.5 text-sm font-semibold text-[#7A1F2B] transition hover:bg-[#FFF1D6] sm:w-auto"
              >
                CONTACT US
              </button>
            </div>
          </div>
          <div className="relative rounded-[2rem] border border-[#E8D8C8] bg-white/90 p-8 shadow-soft">
            <div className="absolute -left-8 top-10 h-20 w-20 rounded-full bg-[#F2C14E]/20 blur-2xl" />
            <div className="absolute -right-8 bottom-10 h-24 w-24 rounded-full bg-[#D98B3A]/20 blur-2xl" />
            <div className="relative space-y-6">
              <div className="inline-flex items-center gap-3 rounded-full border border-[#F2C14E] bg-[#FFF4D0] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#7A1F2B]">
                BUTCHER SHOP STYLE
              </div>
              <div className="space-y-4">
                <p className="text-base font-semibold uppercase tracking-[0.18em] text-[#7A1F2B]">Premium local cuts</p>
                <p className="text-3xl font-display font-bold leading-tight text-[#292522] sm:text-4xl">
                  A warm, refined selection of fresh pork for every table.
                </p>
                <p className="max-w-xl text-base leading-8 text-[#756E67]">
                  Enjoy a clean, premium shopping experience with live stock updates and clear product details.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-[#E8D8C8] bg-cream px-4 py-4 text-sm text-[#292522]">
                  <p className="font-semibold text-[#7A1F2B]">Local ingredients</p>
                  <p className="mt-2 text-[#756E67]">Trusted butcher quality from our market.</p>
                </div>
                <div className="rounded-3xl border border-[#E8D8C8] bg-cream px-4 py-4 text-sm text-[#292522]">
                  <p className="font-semibold text-[#7A1F2B]">Simple ordering</p>
                  <p className="mt-2 text-[#756E67]">Straightforward cart and checkout flow.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.75rem] border border-burgundy/10 bg-white/95 p-5 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cream-50 text-xl text-burgundy">
            🥩
          </div>
          <p className="mt-4 text-sm font-semibold text-burgundy">FRESH CUTS</p>
          <p className="mt-2 text-sm leading-6 text-burgundy/70">Quality pork prepared with care.</p>
        </div>
        <div className="rounded-[1.75rem] border border-burgundy/10 bg-white/95 p-5 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cream-50 text-xl text-burgundy">
            ⚖️
          </div>
          <p className="mt-4 text-sm font-semibold text-burgundy">SOLD BY THE KILO</p>
          <p className="mt-2 text-sm leading-6 text-burgundy/70">Order exactly the amount you need.</p>
        </div>
        <div className="rounded-[1.75rem] border border-burgundy/10 bg-white/95 p-5 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cream-50 text-xl text-burgundy">
            📦
          </div>
          <p className="mt-4 text-sm font-semibold text-burgundy">LIVE STOCK</p>
          <p className="mt-2 text-sm leading-6 text-burgundy/70">See current product availability before ordering.</p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-burgundy/10 bg-white/90 p-6 shadow-card sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="overflow-hidden rounded-[2rem] bg-cream-100">
            {effectiveFeaturedProduct && resolveImageUrl(effectiveFeaturedProduct.imageUrl) ? (
              <img
                src={resolveImageUrl(effectiveFeaturedProduct.imageUrl)}
                alt={effectiveFeaturedProduct.name}
                className="h-full min-h-[320px] w-full object-cover"
              />
            ) : (
              <div className="flex h-72 w-full items-center justify-center bg-cream-100 text-center text-sm text-burgundy/60">
                A featured cut will appear here when products are available.
              </div>
            )}
          </div>
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-burgundy/60">⭐ MOST POPULAR CUT</p>
              <h2 className="mt-4 text-3xl font-bold text-burgundy">{effectiveFeaturedProduct?.name || 'Featured pork cut'}</h2>
              <p className="mt-3 text-sm leading-7 text-burgundy/70">
                {effectiveFeaturedProduct?.description || 'Browse the product list to explore the latest available options.'}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-burgundy/10 bg-cream-50 p-4">
                <p className="text-sm text-burgundy/70">Price per kilo</p>
                <p className="mt-2 text-lg font-semibold text-burgundy">{effectiveFeaturedProduct ? `${formatCurrency(effectiveFeaturedProduct.pricePerKg)} / kg` : '—'}</p>
              </div>
              <div className="rounded-3xl border border-burgundy/10 bg-cream-50 p-4">
                <p className="text-sm text-burgundy/70">Current stock</p>
                <p className={`mt-2 text-lg font-semibold ${effectiveFeaturedProduct && Number(effectiveFeaturedProduct.stockKg) > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {effectiveFeaturedProduct ? (Number(effectiveFeaturedProduct.stockKg) > 0 ? `🟢 ${formatKg(effectiveFeaturedProduct.stockKg)} kg` : '🔴 Out of Stock') : '—'}
                </p>
              </div>
            </div>
            {effectiveFeaturedProduct?.id ? (
              <Link
                to={`/products/${effectiveFeaturedProduct.id}`}
                className="inline-flex items-center justify-center rounded-2xl bg-burgundy px-5 py-3 text-sm font-semibold text-white transition hover:bg-burgundy-soft"
              >
                VIEW PRODUCT →
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section id="cuts" className="scroll-mt-24 space-y-6">
        <div className="rounded-[2rem] border border-burgundy/10 bg-white/90 p-6 shadow-card sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="font-display text-3xl font-bold tracking-tight text-burgundy sm:text-4xl">FRESH CUTS FOR EVERY TABLE</p>
              <p className="mt-2 text-sm leading-7 text-burgundy/70 sm:text-base">
                Choose your favorite cut and order by the kilo.
              </p>
            </div>
            <div className="w-full max-w-full lg:max-w-md">
              <label htmlFor="product-search" className="mb-2 block text-sm font-semibold text-burgundy/80">
                Search products
              </label>
              <div className="product-search-controls flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <input
                    id="product-search"
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search products..."
                    className="w-full rounded-2xl border border-burgundy/10 bg-cream-50 px-3 py-2.5 text-sm text-burgundy outline-none placeholder:text-burgundy/50"
                  />
                </div>
                <div className="sort-control min-w-0 w-full sm:w-auto sm:max-w-[220px]">
                  <label htmlFor="product-sort" className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-burgundy/70">
                    Sort
                  </label>
                  <select
                    id="product-sort"
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value)}
                    className="sort-select block w-full min-w-0 max-w-full rounded-2xl border border-burgundy/10 bg-white px-3 py-2.5 text-sm text-burgundy outline-none shadow-sm box-border"
                    style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    <option value="default">Default</option>
                    <option value="price-asc">Price: Low → High</option>
                    <option value="price-desc">Price: High → Low</option>
                    <option value="name-asc">Name: A → Z</option>
                  </select>
                </div>
              </div>

              {/* Product count and search helper */}
              <div className="mt-3 flex flex-col gap-2 text-sm text-burgundy/70 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {displayedProducts.length === products.length
                    ? `${products.length} product${products.length === 1 ? '' : 's'}`
                    : `Showing ${displayedProducts.length} of ${products.length} products`}
                </div>
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="self-start rounded-full border border-burgundy/10 bg-white px-3 py-1 text-xs font-semibold text-burgundy hover:bg-cream/80"
                  >
                    Clear search
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {message && (
          <div className="pointer-events-none fixed left-1/2 top-6 z-50 w-auto -translate-x-1/2 rounded-2xl border border-leaf/20 bg-leaf-mist px-4 py-3 text-sm font-semibold text-leaf shadow-lg">
            {message}
          </div>
        )}

        {!products.length ? (
          <div className="market-card p-8 text-center text-burgundy/60">No products available.</div>
        ) : displayedProducts.length === 0 ? (
          <div className="market-card p-8 text-center">
            <p className="text-lg font-semibold text-burgundy">No results found</p>
            <p className="mt-2 text-sm text-burgundy/70">No products match "{searchQuery}". Try a different keyword, broaden your search, or clear the search to view all products.</p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="rounded-2xl bg-burgundy px-4 py-2 text-sm font-semibold text-white"
              >
                Clear search
              </button>
              <button
                type="button"
                onClick={() => setSortKey('default')}
                className="rounded-2xl border border-burgundy/10 bg-cream-50 px-4 py-2 text-sm font-semibold text-burgundy"
              >
                Browse all products
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayedProducts.map((product) => {
              const inventoryStock = Math.max(0, Number(product.stockKg) || 0);
              const stock = getStockStatus(inventoryStock);
              const remaining = getRemainingStock(product);
              const maxQty = remaining;
              const quantity = getQuantityForProduct(product);
              const inCart = getCartQuantity(product.id);
              const canAddMore = stock.canAdd && remaining > 0;
              return (
                <article
                  key={product.id}
                  className="market-card flex min-w-0 flex-col overflow-hidden bg-white shadow-soft h-full"
                >
                  <Link to={`/products/${product.id}`} className="relative block overflow-hidden">
                    {resolveImageUrl(product.imageUrl) ? (
                      <ImageWithFallback
                        src={resolveImageUrl(product.imageUrl)}
                        alt={product.name}
                        className={`h-48 w-full object-cover ${stock.canAdd ? '' : 'opacity-70 grayscale'}`}
                      />
                    ) : (
                      <div className="flex h-48 w-full items-center justify-center bg-cream-100 text-sm text-burgundy/50">
                        No image available
                      </div>
                    )}
                  </Link>
                  <div className="flex flex-1 flex-col p-4 sm:p-5">
                    {/* Product name with consistent height */}
                    <div className="mb-3">
                      <Link to={`/products/${product.id}`} className="font-display text-lg font-semibold text-burgundy hover:text-burgundy-soft line-clamp-2 leading-6 min-h-[3rem] flex items-start">
                        {product.name}
                      </Link>
                    </div>
                    
                    {/* Product description with consistent height */}
                    <div className="mb-4">
                      <p className="line-clamp-3 text-sm leading-6 text-burgundy/70 min-h-[4.5rem]">
                        {product.description || 'Freshly prepared pork cut ready for your next meal.'}
                      </p>
                    </div>
                    
                    {/* Price section */}
                    <div className="mb-3">
                      <p className="text-base font-semibold text-burgundy">{formatCurrency(product.pricePerKg)} / kg</p>
                    </div>
                    
                    {/* Stock status section */}
                    <div className="mb-3">
                      <StockBadge stockKg={inventoryStock} />
                    </div>
                    
                    {/* In cart section with consistent height */}
                    <div className="mb-4">
                      {inCart > 0 ? (
                        <p className="text-sm text-burgundy/60 min-h-[1.25rem]">In cart: {formatKg(inCart)} kg</p>
                      ) : (
                        <div className="min-h-[1.25rem]"></div>
                      )}
                    </div>
                    
                    {/* Quantity controls */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 rounded-2xl border border-burgundy/10 bg-cream-50 p-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (maxQty <= 0) return;
                            adjustProductQuantity(product, -0.5);
                          }}
                          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-lg font-semibold text-burgundy shadow-sm"
                          disabled={maxQty <= 0 || quantity <= 0.5}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="0.5"
                          step="0.5"
                          max={maxQty}
                          value={maxQty <= 0 ? 0 : quantity}
                          onChange={(event) => updateProductQuantity(product, event.target.value)}
                          className="w-full border-0 bg-transparent text-center text-sm font-semibold text-burgundy outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (maxQty <= 0) return;
                            adjustProductQuantity(product, 0.5);
                          }}
                          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-lg font-semibold text-burgundy shadow-sm"
                          disabled={maxQty <= 0 || quantity >= maxQty}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    
                    {/* Action buttons pushed to bottom */}
                    <div className="mt-auto flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!canAddMore) return;
                          if (addingMap[product.id]) return;
                          setAddingMap((m) => ({ ...m, [product.id]: true }));
                          const quantityToAdd = Math.min(remaining, Number(getQuantityForProduct(product)) || 0.5);
                          try {
                            addItem(product, quantityToAdd);
                            setMessage(`${product.name} — ${quantityToAdd.toFixed(1)}kg added to cart`);
                            window.setTimeout(() => setMessage(''), 2500);
                          } finally {
                            setTimeout(() => setAddingMap((m) => { const copy = { ...m }; delete copy[product.id]; return copy; }), 350);
                          }
                        }}
                        disabled={!canAddMore || Boolean(addingMap[product.id])}
                        className="market-btn flex-1 justify-center"
                      >
                        {!stock.canAdd
                          ? 'Out of Stock'
                          : remaining <= 0
                            ? 'Max in Cart'
                            : (addingMap[product.id] ? 'Adding...' : 'Add to Cart')}
                      </button>
                      <Link
                        to={`/products/${product.id}`}
                        className="inline-flex flex-1 items-center justify-center rounded-2xl border border-burgundy/10 bg-cream-50 px-4 py-3 text-sm font-semibold text-burgundy transition hover:bg-cream/80"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-[2rem] border border-burgundy/10 bg-cream-50 p-6 shadow-card sm:p-8">
        <div className="grid gap-5 md:grid-cols-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-burgundy/60">How it works</p>
            <p className="mt-3 text-2xl font-bold text-burgundy">Order in three simple steps.</p>
          </div>
          <div className="rounded-[1.75rem] bg-white p-5 text-sm text-burgundy shadow-sm">
            <p className="font-semibold text-burgundy">Choose your cut</p>
            <p className="mt-2 text-sm text-burgundy/70">Browse available pork cuts and pick what you want.</p>
          </div>
          <div className="rounded-[1.75rem] bg-white p-5 text-sm text-burgundy shadow-sm">
            <p className="font-semibold text-burgundy">Add to cart</p>
            <p className="mt-2 text-sm text-burgundy/70">Select kilos and add to your cart without changing stock.</p>
          </div>
          <div className="rounded-[1.75rem] bg-white p-5 text-sm text-burgundy shadow-sm">
            <p className="font-semibold text-burgundy">Checkout</p>
            <p className="mt-2 text-sm text-burgundy/70">Complete your order using the normal checkout flow.</p>
          </div>
        </div>
      </section>

      <section id="contact" className="scroll-mt-24 rounded-[2rem] border border-burgundy/10 bg-white/90 p-6 shadow-card sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-burgundy/60">Get in Touch</p>
            <h3 className="mt-2 font-display text-2xl font-bold text-burgundy sm:text-3xl">We are here to help with orders and questions.</h3>
            <p className="mt-3 text-sm leading-7 text-burgundy/75 sm:text-base">
              Contact the shop directly for product questions, custom orders, or pickup details.
            </p>
            <div className="mt-6 space-y-3 text-sm text-burgundy/80">
              {storeSettings?.contactNumber ? (
                <div className="flex items-center gap-3 rounded-2xl border border-burgundy/10 bg-cream-50 px-4 py-3">
                  <span className="text-lg">📞</span>
                  <a href={`tel:${storeSettings.contactNumber}`} className="font-semibold text-burgundy hover:text-burgundy-soft">
                    {storeSettings.contactNumber}
                  </a>
                </div>
              ) : null}
              {storeSettings?.email ? (
                <div className="flex items-center gap-3 rounded-2xl border border-burgundy/10 bg-cream-50 px-4 py-3">
                  <span className="text-lg">✉️</span>
                  <a href={`mailto:${storeSettings.email}`} className="font-semibold text-burgundy hover:text-burgundy-soft">
                    {storeSettings.email}
                  </a>
                </div>
              ) : null}
              {storeSettings?.address ? (
                <div className="flex items-center gap-3 rounded-2xl border border-burgundy/10 bg-cream-50 px-4 py-3">
                  <span className="text-lg">📍</span>
                  <span className="font-semibold text-burgundy">{storeSettings.address}</span>
                </div>
              ) : null}
            </div>
          </div>
          <div className="rounded-[2rem] border border-burgundy/10 bg-cream-50 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-burgundy/60">Store details</p>
            <p className="mt-2 text-xl font-semibold text-burgundy">{storeSettings?.storeName || 'Heritage Hog Co.'}</p>
            <p className="mt-3 text-sm leading-7 text-burgundy/75">
              {storeSettings?.description || 'We are committed to serving fresh pork cuts with dependable stock updates and a smooth ordering experience.'}
            </p>
            {storeSettings?.facebook ? (
              <a
                href={storeSettings.facebook}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center justify-center rounded-2xl bg-burgundy px-5 py-3 text-sm font-semibold text-white transition hover:bg-burgundy-soft"
              >
                Visit Facebook
              </a>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}