import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const navigation = [
  { to: '/admin', label: 'Dashboard', icon: 'dashboard' },
  { to: '/admin/shops', label: 'Businesses', icon: 'shop' },
  { to: '/admin/logs', label: 'Activity Logs', icon: 'activity' },
  { to: '/admin/settings', label: 'Settings', icon: 'settings' },
  { to: '/admin/ai', label: 'AI Providers', icon: 'ai' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [aiStatus, setAIStatus] = useState(null);

  useEffect(() => {
    if (user?.role !== 'admin') return undefined;
    const loadStatus = () => api.get('/admin/ai-status').then(({ data }) => setAIStatus(data)).catch(() => {});
    loadStatus();
    const timer = setInterval(loadStatus, 20000);
    return () => clearInterval(timer);
  }, [user?.role]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const pageTitle = location.pathname.includes('/shops/add')
    ? 'Add business'
    : location.pathname.includes('/shops/')
      ? 'Business details'
      : location.pathname.includes('/shops')
        ? 'Businesses'
        : location.pathname.includes('/logs')
        ? 'Activity logs'
        : location.pathname.includes('/ai')
          ? 'AI Providers'
        : location.pathname.includes('/settings')
            ? 'Settings'
            : 'Dashboard';

  return (
    <div className="min-h-screen bg-[#f7f9fd] text-[#17182d]">
      {mobileOpen && <button aria-label="Close menu" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden" />}

      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[272px] flex-col border-r border-[#e9edf5] bg-white px-5 py-6 shadow-[8px_0_30px_rgba(41,45,54,0.03)] transition-transform duration-200 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-2">
          <Link to="/admin" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
            <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-gradient-to-br from-indigo-600 to-violet-500 text-sm font-extrabold text-white shadow-lg shadow-indigo-200">QR</span>
            <span>
              <strong className="block text-[17px] font-extrabold tracking-tight text-[#17182d]">QR <span className="text-indigo-600">Review</span></strong>
              <small className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Business growth</small>
            </span>
          </Link>
          <button onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 lg:hidden" aria-label="Close navigation">x</button>
        </div>

        <div className="mt-10 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Workspace</div>
        <nav className="mt-3 space-y-1.5">
          {navigation.map((item) => (
            <NavLink key={item.to} {...item} active={location.pathname === item.to || (item.to !== '/admin' && location.pathname.startsWith(item.to))} onClick={() => setMobileOpen(false)} />
          ))}
        </nav>

        <div className="mt-auto flex items-center gap-3 border-t border-[#edf0f5] px-2 pt-5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">{user?.name?.slice(0, 2).toUpperCase()}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{user?.name}</p>
            <p className="truncate text-xs text-slate-400">Administrator</p>
          </div>
          <button onClick={handleLogout} className="text-xs font-semibold text-slate-400 hover:text-red-500">Exit</button>
        </div>
      </aside>

      <div className="min-h-screen lg:ml-[272px]">
        <header className="sticky top-0 z-20 flex h-[78px] items-center justify-between border-b border-[#e9edf5] bg-white/90 px-5 backdrop-blur-xl md:px-9">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="rounded-xl border border-[#e7eaf2] p-2.5 text-slate-500 lg:hidden" aria-label="Open navigation">☰</button>
            <div>
              <p className="text-xs font-semibold text-slate-400">Admin workspace</p>
              <h1 className="text-xl font-extrabold tracking-tight text-[#17182d]">{pageTitle}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600 sm:inline-flex">System online</span>
            <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 text-xs font-extrabold text-indigo-700">{user?.name?.slice(0, 2).toUpperCase()}</span>
          </div>
        </header>

        <main className="px-5 py-7 md:px-9">
          {user?.role === 'admin' && <AIStatusBanner status={aiStatus} />}
          {children}
        </main>
      </div>
    </div>
  );
}

function NavLink({ to, label, icon, active, onClick }) {
  return (
    <Link to={to} onClick={onClick} className={`group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-bold transition ${active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
      <NavIcon type={icon} active={active} />
      <span>{label}</span>
      {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-600" />}
    </Link>
  );
}

function NavIcon({ type, active }) {
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    shop: <><path d="M3 10h18" /><path d="M5 10v10h14V10" /><path d="M4 10l2-6h12l2 6" /><path d="M9 20v-5h6v5" /></>,
    activity: <><path d="M4 19V5" /><path d="M4 15h5V9h5V5h6" /><path d="M17 5h3v3" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-2.5v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H6v-2.5h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V5h2.5v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2v2.5h-.2a1.7 1.7 0 0 0-1.5 1Z" /></>,
    ai: <><path d="M12 3v3" /><path d="M12 18v3" /><path d="M3 12h3" /><path d="M18 12h3" /><path d="m5.6 5.6 2.1 2.1" /><path d="m16.3 16.3 2.1 2.1" /><path d="m18.4 5.6-2.1 2.1" /><path d="m7.7 16.3-2.1 2.1" /><circle cx="12" cy="12" r="4" /></>,
  };
  return <svg className={`h-[19px] w-[19px] ${active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[type]}</svg>;
}

function AIStatusBanner({ status }) {
  if (!status) return null;
  const warning = status.fallbackUsed;
  return (
    <div className={`mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${warning ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
      <p className="text-sm font-bold">AI: {status.currentProviderLabel ? `generating with ${status.currentProviderLabel}` : warning ? 'fallback mode active' : 'waiting for first generation'}</p>
      <div className="flex flex-wrap gap-2">
        {status.providers.map((provider) => <span key={provider.provider} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${provider.status === 'active' ? 'bg-emerald-200 text-emerald-800' : provider.status === 'failed' ? 'bg-red-200 text-red-800' : 'bg-white/70 text-slate-600'}`}>{provider.label}: {provider.status}</span>)}
      </div>
    </div>
  );
}
