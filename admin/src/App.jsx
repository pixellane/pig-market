import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminRealtimeProvider } from './realtime/AdminRealtimeProvider.jsx';
import { DashboardRealtimeProvider } from './realtime/DashboardRealtimeProvider.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ProductsPage from './pages/ProductsPage.jsx';
import BuyersPage from './pages/BuyersPage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import AdminLayout from './components/AdminLayout.jsx';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('pigmarket-admin-token');
  return token ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <AdminRealtimeProvider>
      <DashboardRealtimeProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={
            <AdminLayout>
              <Routes>
                <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                <Route path="/products" element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} />
                <Route path="/buyers" element={<ProtectedRoute><BuyersPage /></ProtectedRoute>} />
                <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
                <Route path="/contact" element={<ProtectedRoute><ContactPage /></ProtectedRoute>} />
              </Routes>
            </AdminLayout>
          } />
        </Routes>
      </DashboardRealtimeProvider>
    </AdminRealtimeProvider>
  );
}

export default App;
