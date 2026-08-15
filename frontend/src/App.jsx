import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/Dashboard';
import AdminShops from './pages/admin/Shops';
import AdminAddShop from './pages/admin/AddShop';
import AdminShopDetail from './pages/admin/ShopDetail';
import AdminCategories from './pages/admin/Categories';
import AdminSettings from './pages/admin/Settings';
import AdminLogs from './pages/admin/Logs';
import ShopOwnerDashboard from './pages/shopowner/Dashboard';
import ReviewPage from './pages/customer/ReviewPage';

function ProtectedRoute({ children, role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/login" />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/review/:shopId" element={<ReviewPage />} />

      <Route path="/admin" element={<Layout><ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute></Layout>} />
      <Route path="/admin/shops" element={<Layout><ProtectedRoute role="admin"><AdminShops /></ProtectedRoute></Layout>} />
      <Route path="/admin/shops/add" element={<Layout><ProtectedRoute role="admin"><AdminAddShop /></ProtectedRoute></Layout>} />
      <Route path="/admin/shops/:id" element={<Layout><ProtectedRoute role="admin"><AdminShopDetail /></ProtectedRoute></Layout>} />
      <Route path="/admin/settings" element={<Layout><ProtectedRoute role="admin"><AdminSettings /></ProtectedRoute></Layout>} />
      <Route path="/admin/logs" element={<Layout><ProtectedRoute role="admin"><AdminLogs /></ProtectedRoute></Layout>} />
      <Route path="/admin/categories" element={<Layout><ProtectedRoute role="admin"><AdminCategories /></ProtectedRoute></Layout>} />

      <Route path="/dashboard" element={<ProtectedRoute role="shop_owner"><ShopOwnerDashboard /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}
