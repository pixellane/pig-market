import { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ProductsPage from './pages/ProductsPage.jsx';
import BuyersPage from './pages/BuyersPage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import ContactPage from './pages/ContactPage.jsx';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊', end: true },
  { to: '/products', label: 'Products', icon: '🥩' },
  { to: '/buyers', label: 'Customers', icon: '👥' },
  { to: '/orders', label: 'Orders', icon: '📦' },
  { to: '/contact', label: 'Settings', icon: '⚙️' },
];

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('pigmarket-admin-token');
  return token ? children : <Navigate to="/login" replace />;
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const token = localStorage.getItem('pigmarket-admin-token');

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('pigmarket-admin-token');
    navigate('/login');
  };

  if (location.pathname === '/login') {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(168,50,66,0.08),_transparent_55%)] text-burgundy-ink">
      <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} token={token} handleLogout={handleLogout} />
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-10">
        <Routes>
          <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/products" element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} />
          <Route path="/buyers" element={<ProtectedRoute><BuyersPage /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
          <Route path="/contact" element={<ProtectedRoute><ContactPage /></ProtectedRoute>} />
        </Routes>
      </main>
      <MobileBottomNav />
    </div>
  );
}

function Header({ mobileMenuOpen, setMobileMenuOpen, token, handleLogout }) {
  const location = useLocation();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, location.hash, setMobileMenuOpen]);

  return (
    <header className="sticky top-0 z-20 border-b border-burgundy/10 bg-cream/95 shadow-sm shadow-burgundy/5 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/90 text-xl shadow-sm shadow-burgundy/5">
            🥩
          </div>
          <NavLink to="/dashboard" className="min-w-0 font-display text-base font-semibold tracking-tight text-burgundy sm:text-lg lg:text-xl">
            <span className="block truncate">Fresh Pork Market</span>
            <span className="block text-xs font-normal text-burgundy/60">Admin Panel</span>
          </NavLink>
        </div>

        <nav className="hidden items-center gap-6 text-sm font-semibold lg:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => {
                return isActive && location.pathname === item.to
                  ? 'text-burgundy border-burgundy'
                  : 'text-burgundy/70 hover:text-burgundy';
              }}
              style={({ isActive }) => {
                return isActive ? { borderBottomWidth: '2px', borderBottomStyle: 'solid' } : undefined;
              }}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <div className="text-xs text-burgundy/60">
            {token ? 'Admin' : 'Guest'}
          </div>
          {token ? (
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-burgundy/10 bg-white/90 px-4 text-sm font-semibold text-burgundy shadow-sm hover:bg-burgundy hover:text-white transition-colors"
            >
              Logout
            </button>
          ) : (
            <NavLink
              to="/login"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-burgundy/10 bg-white/90 px-4 text-sm font-semibold text-burgundy shadow-sm hover:bg-burgundy hover:text-white transition-colors"
            >
              Login
            </NavLink>
          )}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
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
            {navItems.map((item) => (
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
                <span>→</span>
              </NavLink>
            ))}
            <div className="mt-4 pt-4 border-t border-burgundy/10">
              {token ? (
                <button
                  type="button"
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="w-full flex items-center justify-between rounded-2xl bg-cream-50 px-4 py-4 text-sm font-semibold text-burgundy/80 transition hover:bg-cream/80"
                >
                  <span className="flex items-center gap-3">
                    <span>🚪</span>
                    <span>Logout</span>
                  </span>
                  <span>→</span>
                </button>
              ) : (
                <NavLink
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-between rounded-2xl bg-cream-50 px-4 py-4 text-sm font-semibold text-burgundy/80 transition hover:bg-cream/80"
                >
                  <span className="flex items-center gap-3">
                    <span>🔑</span>
                    <span>Login</span>
                  </span>
                  <span>→</span>
                </NavLink>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-burgundy/10 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-card lg:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-1 px-2 py-2">
        {navItems.map((item) => {
          const isActive = item.end
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={`flex flex-col items-center min-w-0 rounded-2xl px-1 py-2 text-[11px] font-semibold ${
                isActive ? 'bg-burgundy/10 text-burgundy' : 'text-burgundy/60'
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className={`${isActive ? 'mt-1 break-words text-center' : 'mt-1 whitespace-nowrap text-center'}`}>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

export default App;
