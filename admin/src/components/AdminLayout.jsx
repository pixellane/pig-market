import { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import RealtimeStatus from './RealtimeStatus.jsx';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊', end: true },
  { to: '/products', label: 'Products', icon: '🥩' },
  { to: '/buyers', label: 'Customers', icon: '👥' },
  { to: '/orders', label: 'Orders', icon: '📦' },
  { to: '/contact', label: 'Settings', icon: '⚙️' },
];

function DesktopSidebar({ token, handleLogout }) {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-slate-900 border-r border-slate-800">
      {/* Sidebar Header */}
      <div className="flex items-center gap-3 p-6 border-b border-slate-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-burgundy text-lg">
          🥩
        </div>
        <div>
          <h1 className="font-display text-lg font-bold text-white">Heritage Hog Co.</h1>
          <p className="text-xs text-slate-400">Fresh Pork. Honest Quality.</p>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <nav className="flex-1 px-4 py-6">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = item.end 
              ? location.pathname === item.to 
              : location.pathname.startsWith(item.to);
            
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-burgundy text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Sidebar Footer */}
      <div className="border-t border-slate-800 p-4">
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {token ? 'Admin' : 'Guest'}
          </div>
          {token ? (
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              Logout
            </button>
          ) : (
            <NavLink
              to="/login"
              className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              Login
            </NavLink>
          )}
        </div>
      </div>
    </aside>
  );
}

function FixedHeader({ mobileMenuOpen, setMobileMenuOpen, token, handleLogout }) {
  const location = useLocation();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, location.hash, setMobileMenuOpen]);

  return (
    <header className="fixed top-0 right-0 z-30 h-16 bg-slate-900 border-b border-slate-800 lg:left-64 left-0">
      <div className="flex h-full items-center justify-between px-6">
        {/* Mobile: Logo + Menu Button */}
        <div className="flex items-center gap-4 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-burgundy text-base">
            🥩
          </div>
          <div>
            <h1 className="font-display text-sm font-bold text-white">Heritage Hog Co.</h1>
            <p className="text-xs text-slate-400">Fresh Pork. Honest Quality.</p>
          </div>
        </div>

        {/* Desktop: Page Title Area + Real-time Status */}
        <div className="hidden lg:flex items-center gap-4">
          <h1 className="text-lg font-semibold text-white">Admin Dashboard</h1>
          <RealtimeStatus />
        </div>

        {/* Mobile: Hamburger Menu */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-600"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Desktop: User Menu */}
        <div className="hidden items-center gap-3 lg:flex">
          <div className="text-xs text-slate-400">
            {token ? 'Admin' : 'Guest'}
          </div>
          {token ? (
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              Logout
            </button>
          ) : (
            <NavLink
              to="/login"
              className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              Login
            </NavLink>
          )}
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen ? (
        <div className="lg:hidden mobile-menu-sheet">
          <div className="relative">
            <button
              type="button"
              aria-label="Close navigation menu"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-md bg-slate-800 text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-600"
            >
              ✕
            </button>
            <div className="flex flex-col gap-1 p-4 pt-12">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-4 text-base font-medium transition-colors ${isActive ? 'bg-burgundy text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
              <div className="mt-4 pt-4 border-t border-slate-800">
                {token ? (
                  <button
                    type="button"
                    onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                    <span>🚪</span>
                    <span>Logout</span>
                  </button>
                ) : (
                  <NavLink
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                    <span>🔑</span>
                    <span>Login</span>
                  </NavLink>
                )}
              </div>
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
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-800 bg-slate-900 pb-[env(safe-area-inset-bottom)] shadow-lg lg:hidden">
        <div className="grid grid-cols-5 gap-1 px-3 py-3">
        {navItems.map((item) => {
          const isActive = item.end
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              aria-label={item.label}
              className={`flex flex-col items-center min-w-0 rounded-lg px-2 py-3 text-xs font-medium transition-colors ${
                isActive ? 'bg-burgundy text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="mt-1 truncate text-center w-full">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

export default function AdminLayout({ children }) {
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

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Desktop Sidebar - Fixed */}
      <div className="hidden lg:block">
        <DesktopSidebar token={token} handleLogout={handleLogout} />
      </div>
      
      {/* Fixed Header */}
      <FixedHeader 
        mobileMenuOpen={mobileMenuOpen} 
        setMobileMenuOpen={setMobileMenuOpen} 
        token={token} 
        handleLogout={handleLogout} 
      />
      
      {/* Main Content Area */}
      <main className="pt-16 lg:pl-64">
        <div className="min-h-screen bg-slate-100">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="space-y-6 pb-20 lg:pb-6">
              {children}
            </div>
          </div>
        </div>
      </main>
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}