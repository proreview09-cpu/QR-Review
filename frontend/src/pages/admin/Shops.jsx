import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function Shops() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedShop, setSelectedShop] = useState(null);
  const navigate = useNavigate();

  const fetchShops = () => {
    api.get('/admin/shops').then(({ data }) => setShops(data.shops)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchShops(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure? This will delete all reviews too.')) return;
    try {
      await api.delete(`/admin/shops/${id}`);
      toast.success('Shop deleted');
      fetchShops();
    } catch {
      toast.error('Failed to delete shop');
    }
  };

  const handleToggle = async (shop) => {
    try {
      await api.put(`/admin/shops/${shop._id}`, { isActive: !shop.isActive });
      toast.success(shop.isActive ? 'Shop deactivated' : 'Shop activated');
      fetchShops();
    } catch {
      toast.error('Failed to update shop');
    }
  };

  const handleLoginAsUser = async () => {
    try {
      const { data } = await api.post(`/admin/shops/${selectedShop._id}/impersonate`);
      sessionStorage.setItem('qr-admin-session', JSON.stringify({
        token: localStorage.getItem('token'),
        user: localStorage.getItem('user'),
      }));
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = '/dashboard';
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to open user dashboard');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">All Shops</h2>
        <Link to="/admin/shops/add" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          + Add Shop
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Shop</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Business</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Owner</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Tone</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Status</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {shops.map((shop) => (
              <tr key={shop._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{shop.shopName}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{shop.businessName}</td>
                <td className="px-6 py-4 text-sm">
                  <button onClick={() => setSelectedShop(shop)} className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline">{shop.owner?.name || 'No owner'}</button>
                  <span className="block text-xs text-gray-400">{shop.owner?.email}</span>
                </td>
                <td className="px-6 py-4 text-sm capitalize">{shop.reviewTone}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${shop.expiresAt && new Date(shop.expiresAt) <= new Date() ? 'bg-amber-100 text-amber-800' : shop.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {shop.expiresAt && new Date(shop.expiresAt) <= new Date() ? 'Expired' : shop.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 space-x-2">
                  <Link to={`/admin/shops/${shop._id}`} className="text-blue-600 hover:underline text-sm">View</Link>
                  <button onClick={() => handleToggle(shop)} className="text-yellow-600 hover:underline text-sm">
                    {shop.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => handleDelete(shop._id)} className="text-red-600 hover:underline text-sm">Delete</button>
                </td>
              </tr>
            ))}
            {shops.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No shops yet. Add your first shop!</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4" onClick={() => setSelectedShop(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Owner actions</p>
                <h3 className="mt-1 text-xl font-extrabold text-slate-800">{selectedShop.owner?.name}</h3>
                <p className="text-sm text-slate-400">{selectedShop.owner?.email}</p>
              </div>
              <button onClick={() => setSelectedShop(null)} className="text-xl text-slate-400 hover:text-slate-700">x</button>
            </div>
            <div className="space-y-2">
              <button onClick={() => navigate(`/admin/shops/${selectedShop._id}?mode=view`)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">Just view this entry<span className="mt-1 block text-xs font-normal text-slate-400">Open details without editable fields.</span></button>
              <button onClick={() => navigate(`/admin/shops/${selectedShop._id}?mode=edit`)} className="w-full rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-left text-sm font-bold text-indigo-700 hover:bg-indigo-100">Edit this entry<span className="mt-1 block text-xs font-normal text-indigo-500">Update business and review settings.</span></button>
              <button onClick={handleLoginAsUser} className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-500 px-4 py-3 text-left text-sm font-bold text-white shadow-lg shadow-indigo-200 hover:from-indigo-700 hover:to-violet-600">Login as this user<span className="mt-1 block text-xs font-normal text-indigo-100">Open their dashboard in preview mode.</span></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
