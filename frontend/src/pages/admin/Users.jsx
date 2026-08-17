import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ROLE_LABELS = { admin: 'Admin', shop_owner: 'Business Owner' };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    api.get('/admin/users')
      .then(({ data }) => setUsers(data.users))
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (!q) return true;
      return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    });
  }, [users, query, roleFilter]);

  const isNew = (u) => Date.now() - new Date(u.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" /></div>;
  }

  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-sm font-semibold text-indigo-600">User management</p>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#17182d]">All Users</h2>
          <p className="mt-2 text-sm text-slate-500">Every account on the platform — newly registered users appear here first.</p>
        </div>
        <Link to="/admin/shops/add" className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-indigo-700">+ Add business</Link>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#e9edf5] bg-white p-5 shadow-[0_8px_28px_rgba(41,45,54,0.05)]">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total users</p>
          <p className="mt-1 text-3xl font-extrabold text-[#17182d]">{users.length}</p>
        </div>
        <div className="rounded-2xl border border-[#e9edf5] bg-white p-5 shadow-[0_8px_28px_rgba(41,45,54,0.05)]">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">New this week</p>
          <p className="mt-1 text-3xl font-extrabold text-emerald-600">{users.filter(isNew).length}</p>
        </div>
        <div className="rounded-2xl border border-[#e9edf5] bg-white p-5 shadow-[0_8px_28px_rgba(41,45,54,0.05)]">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Owners without business</p>
          <p className="mt-1 text-3xl font-extrabold text-amber-600">{users.filter((u) => u.role === 'shop_owner' && u.shops.length === 0).length}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-[#e9edf5] bg-white p-6 shadow-[0_8px_28px_rgba(41,45,54,0.05)] md:p-8">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-2">
            {['all', 'shop_owner', 'admin'].map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${roleFilter === r ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                {r === 'all' ? `All (${users.length})` : r === 'shop_owner' ? `Owners (${users.filter((u) => u.role === 'shop_owner').length})` : `Admins (${users.filter((u) => u.role === 'admin').length})`}
              </button>
            ))}
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="input md:w-72"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No users match your search.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-3">User</th>
                  <th className="px-3 py-3">Role</th>
                  <th className="px-3 py-3">Linked businesses</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((user) => (
                  <tr key={user._id} className="transition hover:bg-slate-50">
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-indigo-100 text-xs font-extrabold text-indigo-700">{user.name?.slice(0, 2).toUpperCase()}</span>
                        <div>
                          <p className="flex items-center gap-2 font-bold text-slate-700">
                            {user.name}
                            {isNew(user) && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-700">New</span>}
                          </p>
                          <p className="text-xs text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${user.role === 'admin' ? 'bg-violet-100 text-violet-700' : 'bg-indigo-50 text-indigo-600'}`}>{ROLE_LABELS[user.role]}</span>
                    </td>
                    <td className="px-3 py-4">
                      {user.shops.length === 0 ? (
                        <span className="text-xs text-slate-400">No business assigned</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {user.shops.map((shop) => (
                            <Link key={shop._id} to={`/admin/shops/${shop._id}`} className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100">{shop.shopName}</Link>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{user.isActive ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-xs text-slate-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}