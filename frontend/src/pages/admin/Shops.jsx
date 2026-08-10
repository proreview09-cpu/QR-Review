import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function Shops() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);

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
                <td className="px-6 py-4 text-sm text-gray-600">{shop.owner?.name}</td>
                <td className="px-6 py-4 text-sm capitalize">{shop.reviewTone}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${shop.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {shop.isActive ? 'Active' : 'Inactive'}
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
    </div>
  );
}
