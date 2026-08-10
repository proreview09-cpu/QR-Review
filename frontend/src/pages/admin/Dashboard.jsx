import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

function formatNumber(n) {
  if (!n && n !== 0) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/dashboard').then(({ data }) => setData(data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;
  if (!data) return <p>Failed to load dashboard.</p>;

  const { stats, recentShops } = data;
  const tu = stats.tokenUsage || {};

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Admin Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Shops" value={stats.totalShops} color="blue" />
        <StatCard label="Active Shops" value={stats.activeShops} color="green" />
        <StatCard label="Shop Owners" value={stats.totalShopOwners} color="purple" />
        <StatCard label="Reviews Copied" value={stats.totalReviewsCopied} color="orange" />
      </div>

      <h3 className="text-lg font-semibold mb-4">ChatGPT Usage</h3>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <StatCard label="Reviews Generated" value={stats.totalReviewsGenerated} color="teal" />
        <StatCard label="API Calls" value={tu.totalCalls || 0} color="indigo" />
        <StatCard label="Total Tokens" value={formatNumber(tu.totalTokens)} color="pink" />
        <StatCard label="Prompt Tokens" value={formatNumber(tu.promptTokens)} color="slate" />
        <StatCard label="Completion Tokens" value={formatNumber(tu.completionTokens)} color="amber" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Recent Shops</h3>
          <Link to="/admin/shops" className="text-blue-600 hover:underline text-sm">View All</Link>
        </div>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Shop</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Owner</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Status</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Copied</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentShops.map((shop) => (
                <tr key={shop._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link to={`/admin/shops/${shop._id}`} className="text-blue-600 hover:underline font-medium">
                      {shop.shopName}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{shop.owner?.name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${shop.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {shop.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{shop.totalReviewsCopied}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700', green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700', orange: 'bg-orange-50 text-orange-700',
    teal: 'bg-teal-50 text-teal-700', indigo: 'bg-indigo-50 text-indigo-700',
    pink: 'bg-pink-50 text-pink-700', slate: 'bg-slate-100 text-slate-700',
    amber: 'bg-amber-50 text-amber-700',
  };
  return (
    <div className={`rounded-lg p-6 ${colors[color] || colors.blue}`}>
      <p className="text-sm font-medium opacity-75">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
}
