import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/admin/Dashboard';
import AdminShops from './pages/admin/Shops';
import AdminAddShop from './pages/admin/AddShop';
import AdminShopDetail from './pages/admin/ShopDetail';
import AdminCategories from './pages/admin/Categories';
import AdminUsers from './pages/admin/Users';
import AdminSettings from './pages/admin/Settings';
import AdminAIProviders from './pages/admin/AIProviders';
import AdminLogs from './pages/admin/Logs';
import ShopOwnerDashboard from './pages/shopowner/Dashboard';
import SetupBusiness from './pages/shopowner/SetupBusiness';
import ReviewPage from './pages/customer/ReviewPage';

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <AuthLoading />;
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/login" />;
  return children;
}

function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f9fd]">
      <div className="animate-spin h-9 w-9 border-4 border-indigo-600 border-t-transparent rounded-full" />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/review/:shopId" element={<ReviewPage />} />

      <Route path="/admin" element={<Layout><ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute></Layout>} />
      <Route path="/admin/shops" element={<Layout><ProtectedRoute role="admin"><AdminShops /></ProtectedRoute></Layout>} />
      <Route path="/admin/shops/add" element={<Layout><ProtectedRoute role="admin"><AdminAddShop /></ProtectedRoute></Layout>} />
      <Route path="/admin/shops/:id" element={<Layout><ProtectedRoute role="admin"><AdminShopDetail /></ProtectedRoute></Layout>} />
      <Route path="/admin/categories" element={<Layout><ProtectedRoute role="admin"><AdminCategories /></ProtectedRoute></Layout>} />
      <Route path="/admin/owners" element={<Layout><ProtectedRoute role="admin"><AdminUsers /></ProtectedRoute></Layout>} />
      <Route path="/admin/settings" element={<Layout><ProtectedRoute role="admin"><AdminSettings /></ProtectedRoute></Layout>} />
      <Route path="/admin/ai" element={<Layout><ProtectedRoute role="admin"><AdminAIProviders /></ProtectedRoute></Layout>} />
      <Route path="/admin/logs" element={<Layout><ProtectedRoute role="admin"><AdminLogs /></ProtectedRoute></Layout>} />

      <Route path="/dashboard" element={<ProtectedRoute role="shop_owner"><ShopOwnerDashboard /></ProtectedRoute>} />
      <Route path="/setup-business" element={<ProtectedRoute role="shop_owner"><SetupBusiness /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}