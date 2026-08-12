import { useEffect, useState } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import ProductPage from './pages/ProductPage.jsx';
import CartPage from './pages/CartPage.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import MyOrdersPage from './pages/MyOrdersPage.jsx';
import OrderDetailsPage from './pages/OrderDetailsPage.jsx';
import BuyersPage from './pages/BuyersPage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import { CartProvider } from './contexts/CartContext.jsx';
import { useCart } from './contexts/CartContext.jsx';
import { InventoryRealtimeProvider } from './realtime/InventoryRealtimeProvider.jsx';
import { OrderRealtimeProvider } from './realtime/OrderRealtimeProvider.jsx';
import { getApiBasePath } from './utils/apiUrl.js';

const navItems = [
  { to: '/', label: 'Home', icon: '🏠', end: true },
  { to: '/#cuts', label: 'Shop', icon: '🥩', hash: 'cuts' },
  { to: '/my-orders', label: 'My Orders', icon: '📦' },
  { to: '/contact', label: 'Contact Us', icon: '📞' },
];

function ScrollToTopOnRouteChange() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
}

function App() {
  const [storeSettings, setStoreSettings] = useState({});

  useEffect(() => {
    let active = true;
    fetch(`${getApiBasePath()}/settings`)
      .then((response) => response.json())
      .then((data) => {
        if (active) {
          setStoreSettings(data || {});
        }
      })
      .catch(() => {
        if (active) {
          setStoreSettings({});
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <CartProvider>
      <InventoryRealtimeProvider>
        <OrderRealtimeProvider>
          <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(168,50,66,0.08),_transparent_55%)] text-burgundy-ink">
            <ScrollToTopOnRouteChange />
            <DesktopHeader />
            <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-10">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/products/:id" element={<ProductPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/my-orders" element={<MyOrdersPage />} />
                <Route path="/my-orders/:id" element={<OrderDetailsPage />} />
                <Route path="/buyers" element={<BuyersPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
              </Routes>
            </main>
            <Footer storeSettings={storeSettings} />
            <MobileBottomNav />
          </div>
        </OrderRealtimeProvider>
      </InventoryRealtimeProvider>
    </CartProvider>
  );
}

function DesktopHeader() {
  const { items } = useCart();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, location.hash]);

  const isShopActive = location.pathname === '/' && location.hash === '#cuts';

  return (
    <header className="sticky top-0 z-20 border-b border-burgundy/10 bg-cream/95 shadow-sm shadow-burgundy/5 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/90 text-xl shadow-sm shadow-burgundy/5">
            🐖
          </div>
          <NavLink to="/" className="min-w-0 font-display text-base font-semibold tracking-tight text-burgundy sm:text-lg lg:text-xl">
            <span className="block truncate">Heritage Hog Co.</span>
          </NavLink>
        </div>

        <nav className="hidden items-center gap-6 text-sm font-semibold lg:flex">
          {navItems.map((item) => {
            if (item.hash) {
              return (
                <a
                  key={item.label}
                  href="/#cuts"
                  className={`transition ${isShopActive ? 'text-burgundy border-burgundy' : 'text-burgundy/70 hover:text-burgundy'}`}
                  style={isShopActive ? { borderBottomWidth: '2px', borderBottomStyle: 'solid' } : undefined}
                >
                  {item.label}
                </a>
              );
            }
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => {
                  if (item.to === '/' && item.end) {
                    const homeActive = location.pathname === '/' && location.hash !== '#cuts';
                    return homeActive ? 'text-burgundy border-burgundy' : 'text-burgundy/70 hover:text-burgundy';
                  }
                  return isActive && location.pathname === item.to
                    ? 'text-burgundy border-burgundy'
                    : 'text-burgundy/70 hover:text-burgundy';
                }}
                style={({ isActive }) => {
                  const homeActive = item.to === '/' && item.end && location.pathname === '/' && location.hash !== '#cuts';
                  return homeActive || isActive ? { borderBottomWidth: '2px', borderBottomStyle: 'solid' } : undefined;
                }}
              >
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <NavLink
            to="/cart"
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-burgundy/10 bg-white/90 text-xl shadow-sm"
            aria-label="Open cart"
          >
            🛒
            {items.length > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-burgundy px-1.5 text-[10px] font-semibold text-white">
                {items.length}
              </span>
            ) : null}
          </NavLink>
          <NavLink
            to="/my-orders"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-burgundy/10 bg-white/90 text-xl shadow-sm"
            aria-label="View account"
          >
            👤
          </NavLink>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <NavLink
            to="/cart"
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-burgundy/10 bg-white/90 text-xl shadow-sm"
            aria-label="Open cart"
          >
            🛒
            {items.length > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-burgundy px-1.5 text-[10px] font-semibold text-white">
                {items.length}
              </span>
            ) : null}
          </NavLink>
          <button
            type="button"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-burgundy/10 bg-white/90 text-xl shadow-sm"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {mobileMenuOpen ? (
        <div className="lg:hidden border-t border-burgundy/10 bg-white/95 px-4 py-4 shadow-card">
          <div className="mx-auto flex max-w-6xl flex-col gap-2">
            {navItems.map((item) => {
              if (item.hash) {
                return (
                  <a
                    key={item.label}
                    href="/#cuts"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between rounded-2xl bg-cream-50 px-4 py-4 text-sm font-semibold text-burgundy/80 transition hover:bg-cream/80"
                  >
                    <span className="flex items-center gap-3">
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </span>
                    <span>→</span>
                  </a>
                );
              }
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) => `flex items-center justify-between rounded-2xl px-4 py-4 text-sm font-semibold transition ${isActive ? 'bg-cream-100 text-burgundy' : 'bg-cream-50 text-burgundy/80 hover:bg-cream/80'}`}
                >
                  <span className="flex items-center gap-3">
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </span>
                  {item.showCount && items.length > 0 ? (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-burgundy px-2 text-[11px] font-semibold text-white">
                      {items.length}
                    </span>
                  ) : (
                    <span>→</span>
                  )}
                </NavLink>
              );
            })}
            <NavLink
              to="/cart"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between rounded-2xl bg-cream-50 px-4 py-4 text-sm font-semibold text-burgundy/80 transition hover:bg-cream/80"
            >
              <span className="flex items-center gap-3">🛒 Cart</span>
              {items.length > 0 ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-burgundy px-2 text-[11px] font-semibold text-white">
                  {items.length}
                </span>
              ) : (
                <span>→</span>
              )}
            </NavLink>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function Footer({ storeSettings }) {
  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/#cuts', label: 'Products' },
    { to: '/contact', label: 'Contact' },
    { to: '/cart', label: 'Cart' },
  ];

  return (
    <footer className="border-t border-burgundy/10 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr_0.8fr]">
        <div>
          <p className="font-display text-xl font-bold text-burgundy">{storeSettings?.storeName || 'Heritage Hog Co.'}</p>
          <p className="mt-1 text-sm font-semibold text-burgundy/70">Fresh Pork. Honest Quality.</p>
          <p className="mt-3 text-sm leading-7 text-burgundy/70">
            {storeSettings?.description || 'Fresh pork cuts served with dependable stock updates and a simple ordering experience.'}
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-burgundy/60">Contact</p>
          <div className="mt-3 space-y-2 text-sm text-burgundy/80">
            {storeSettings?.contactNumber ? <a href={`tel:${storeSettings.contactNumber}`} className="block hover:text-burgundy">{storeSettings.contactNumber}</a> : null}
            {storeSettings?.email ? <a href={`mailto:${storeSettings.email}`} className="block hover:text-burgundy">{storeSettings.email}</a> : null}
            {storeSettings?.address ? <p>{storeSettings.address}</p> : null}
            {storeSettings?.facebook ? (
              <a href={storeSettings.facebook} target="_blank" rel="noreferrer" className="block font-semibold text-burgundy hover:text-burgundy-soft">
                Facebook
              </a>
            ) : null}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-burgundy/60">Explore</p>
          <div className="mt-3 flex flex-col gap-2 text-sm text-burgundy/80">
            {navLinks.map((link) => (
              <NavLink key={link.to} to={link.to} className="w-fit hover:text-burgundy">
                {link.label}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-burgundy/10 px-4 py-4 text-center text-sm text-burgundy/60 sm:px-6">
        © {new Date().getFullYear()} {storeSettings?.storeName || 'Heritage Hog Co.'}. All rights reserved.
      </div>
    </footer>
  );
}

function MobileBottomNav() {
  const { items } = useCart();
  const location = useLocation();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-burgundy/10 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-card lg:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-1 px-2 py-2">
        {navItems
          .filter((item) => item.to !== '/buyers')
          .map((item) => {
          const isActive = item.hash
            ? location.pathname === '/' && location.hash === '#cuts'
            : item.end
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);

          if (item.hash) {
            return (
              <a
                key={item.label}
                href="/#cuts"
                className={`flex flex-col items-center min-w-0 rounded-2xl px-1 py-2 text-[11px] font-semibold ${
                  isActive ? 'bg-burgundy/10 text-burgundy' : 'text-burgundy/60'
                }`}
              >
                <span className="text-lg leading-none">{item.icon}</span>
                <span className={`${isActive ? 'mt-1 break-words text-center' : 'mt-1 whitespace-nowrap text-center'}`}>{item.label}</span>
              </a>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={`relative flex flex-col items-center min-w-0 rounded-2xl px-1 py-2 text-[11px] font-semibold ${
                isActive ? 'bg-burgundy/10 text-burgundy' : 'text-burgundy/60'
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className={`${isActive ? 'mt-1 break-words text-center' : 'mt-1 whitespace-nowrap text-center'}`}>{item.label}</span>
              {item.showCount && items.length > 0 ? (
                <span className="absolute right-2 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-burgundy px-1 text-[10px] text-white">
                  {items.length}
                </span>
              ) : null}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

export default App;
