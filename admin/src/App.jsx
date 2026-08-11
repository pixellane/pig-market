import { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ProductsPage from './pages/ProductsPage.jsx';
import BuyersPage from './pages/BuyersPage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import ContactPage from './pages/ContactPage.jsx';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/products', label: 'Products' },
  { to: '/buyers', label: 'Customers' },
  { to: '/orders', label: 'Orders' },
  { to: '/contact', label: 'Settings' },
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.12),_transparent_24%),linear-gradient(135deg,_#f8fafc_0%,_#eef2ff_100%)] text-slate-900">
      <div className="lg:flex">
        <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200/70 bg-slate-950 px-4 py-6 text-slate-100 shadow-2xl transition-transform duration-200 lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-3 py-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-600/20 text-xl">🥩</div>
            <div>
              <p className="text-sm font-semibold text-white">Fresh Pork Market</p>
              <p className="text-xs text-slate-400">Admin workspace</p>
            </div>
          </div>

          <nav className="mt-8 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `flex items-center rounded-2xl px-4 py-3 text-sm font-medium transition ${isActive ? 'bg-rose-600/20 text-white shadow-sm' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto rounded-3xl border border-white/10 bg-white/10 p-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="text-sm font-semibold text-white">Admin</span>
            </div>
            <p className="mt-2 text-sm text-slate-400">Online and ready for updates.</p>
          </div>
        </aside>

        {mobileMenuOpen ? <button type="button" aria-label="Close navigation" onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" /> : null}

        <div className="flex-1 lg:ml-72">
          <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-slate-950/95 px-4 py-3 text-white backdrop-blur lg:px-6">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setMobileMenuOpen((current) => !current)} className="rounded-2xl border border-white/10 bg-white/10 p-2 text-slate-100 lg:hidden" aria-label="Open navigation">
                  ☰
                </button>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Management</p>
                  <h1 className="text-lg font-semibold text-white">MeatShop Admin</h1>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-300 sm:flex">
                  {token ? 'Signed in' : 'Guest'}
                </div>
                {token ? (
                  <button type="button" onClick={handleLogout} className="rounded-2xl bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20">Logout</button>
                ) : (
                  <NavLink to="/login" className="rounded-2xl bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20">Login</NavLink>
                )}
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <Routes>
              <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/products" element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} />
              <Route path="/buyers" element={<ProtectedRoute><BuyersPage /></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
              <Route path="/contact" element={<ProtectedRoute><ContactPage /></ProtectedRoute>} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
