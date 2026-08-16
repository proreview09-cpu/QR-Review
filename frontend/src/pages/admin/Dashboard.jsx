import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

function formatNumber(value) {
  const number = Number(value || 0);
  if (number >= 1000000) return `${(number / 1000000).toFixed(1)}M`;
  if (number >= 1000) return `${(number / 1000).toFixed(1)}K`;
  return number.toLocaleString();
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/dashboard').then(({ data: result }) => setData(result)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (!data) return <EmptyState />;

  const { stats, recentShops = [] } = data;
  const usage = stats.tokenUsage || {};
  const aiStatus = stats.aiStatus || { providers: [], currentProviderLabel: null, fallbackUsed: false };

  return (
    <div className="mx-auto max-w-[1480px]">
      <section className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-sm font-semibold text-indigo-600">Good to see you, Admin</p>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#17182d] md:text-4xl">Your review workspace</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">Keep every business moving forward with better feedback, smarter AI usage, and a clear view of what is happening.</p>
        </div>
        <Link to="/admin/shops/add" className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:shadow-xl">
          <span className="text-lg leading-none">+</span> Add business
        </Link>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total businesses" value={stats.totalShops} note={`${stats.activeShops} currently active`} icon="B" tone="indigo" />
        <MetricCard label="Active businesses" value={stats.activeShops} note="Ready to collect reviews" icon="A" tone="emerald" />
        <MetricCard label="Reviews copied" value={stats.totalReviewsCopied} note="Customer actions recorded" icon="R" tone="orange" />
        <MetricCard label="Tokens used" value={formatNumber(usage.totalTokens)} note={`${usage.totalCalls || 0} provider calls`} icon="T" tone="violet" />
      </section>

      <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[1.45fr_1fr]">
        <div className="rounded-2xl border border-[#e9edf5] bg-white p-6 shadow-[0_8px_28px_rgba(41,45,54,0.05)]">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-extrabold">AI provider performance</h3>
              <p className="mt-1 text-xs text-slate-400">Usage and fallback health across your workspace</p>
            </div>
            <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${aiStatus.fallbackUsed ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {aiStatus.currentProviderLabel ? `${aiStatus.currentProviderLabel} is live` : aiStatus.fallbackUsed ? 'Fallback active' : 'Waiting for usage'}
            </span>
          </div>
          <div className="space-y-3">
            {aiStatus.providers.map((provider) => (
              <div key={provider.provider} className="grid grid-cols-[minmax(130px,1fr)_auto_auto] items-center gap-3 rounded-xl bg-[#f8f9fc] px-4 py-3 sm:grid-cols-[minmax(170px,1fr)_auto_auto_auto]">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-700">{provider.label}</p>
                  <p className="text-xs text-slate-400">{provider.apiCalls} calls &middot; {provider.reviewsGenerated} reviews</p>
                </div>
                <p className="text-right text-sm font-extrabold text-slate-700">{formatNumber(provider.totalTokens)} <span className="block text-[10px] font-semibold text-slate-400">tokens</span></p>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${provider.status === 'active' ? 'bg-emerald-100 text-emerald-700' : provider.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600'}`}>{provider.status === 'failed' ? 'Fallback' : provider.status}</span>
                <p className="hidden max-w-[180px] truncate text-xs text-red-500 sm:block" title={provider.lastError}>{provider.lastError || 'No errors'}</p>
              </div>
            ))}
            {aiStatus.providers.length === 0 && <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">Add your first AI provider from Settings.</div>}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500 p-6 text-white shadow-[0_12px_30px_rgba(99,79,211,0.25)]">
          <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-white/10" />
          <div className="absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-white/10" />
          <div className="relative">
            <span className="mb-6 grid h-11 w-11 place-items-center rounded-2xl bg-white/15 text-lg font-extrabold">AI</span>
            <p className="text-sm font-semibold text-indigo-100">Reviews generated</p>
            <p className="mt-2 text-5xl font-extrabold tracking-tight">{formatNumber(stats.totalReviewsGenerated)}</p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-indigo-100">Your configured providers are keeping the review queue ready for every business.</p>
            <Link to="/admin/settings" className="mt-7 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50">Manage AI setup <span className="ml-2">-&gt;</span></Link>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-[#e9edf5] bg-white p-6 shadow-[0_8px_28px_rgba(41,45,54,0.05)]">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-extrabold">Recent businesses</h3>
            <p className="mt-1 text-xs text-slate-400">Your latest business setups</p>
          </div>
          <Link to="/admin/shops" className="text-sm font-bold text-indigo-600 hover:text-indigo-800">View all</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-3 py-3">Business</th><th className="px-3 py-3">Owner</th><th className="px-3 py-3">Status</th><th className="px-3 py-3 text-right">Copied</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentShops.map((shop) => (
                <tr key={shop._id} className="transition hover:bg-slate-50">
                  <td className="px-3 py-4"><Link to={`/admin/shops/${shop._id}`} className="font-bold text-slate-700 hover:text-indigo-600">{shop.businessName || shop.shopName}</Link><span className="mt-0.5 block text-xs text-slate-400">{shop.shopName}</span></td>
                  <td className="px-3 py-4 text-slate-500">{shop.owner?.name || '-'}</td>
                  <td className="px-3 py-4"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${shop.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{shop.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-3 py-4 text-right font-bold text-slate-700">{shop.totalReviewsCopied || 0}</td>
                </tr>
              ))}
              {recentShops.length === 0 && <tr><td colSpan="4" className="px-3 py-8 text-center text-slate-400">No businesses yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, note, icon, tone }) {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-600', emerald: 'bg-emerald-50 text-emerald-600', orange: 'bg-orange-50 text-orange-600', violet: 'bg-violet-50 text-violet-600',
  };
  return <div className="rounded-2xl border border-[#e9edf5] bg-white p-5 shadow-[0_8px_28px_rgba(41,45,54,0.045)]"><div className="flex items-start justify-between"><span className={`grid h-10 w-10 place-items-center rounded-xl text-xs font-extrabold ${tones[tone]}`}>{icon}</span><span className="text-xs font-bold text-emerald-500">Live</span></div><p className="mt-5 text-xs font-semibold text-slate-400">{label}</p><p className="mt-1 text-3xl font-extrabold tracking-tight text-[#17182d]">{value}</p><p className="mt-1 text-xs text-slate-400">{note}</p></div>;
}

function Loading() { return <div className="flex h-72 items-center justify-center"><div className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" /></div>; }
function EmptyState() { return <div className="rounded-2xl bg-white p-12 text-center shadow-sm"><p className="font-bold text-red-600">Unable to load dashboard</p><p className="mt-1 text-sm text-slate-400">Please try again.</p></div>; }
