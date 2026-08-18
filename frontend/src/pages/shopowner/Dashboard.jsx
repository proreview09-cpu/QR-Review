import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'casual', label: 'Casual' },
  { value: 'enthusiastic', label: 'Enthusiastic' },
  { value: 'grateful', label: 'Grateful' },
  { value: 'humorous', label: 'Humorous' },
];

const LANGUAGES = [
  { value: 'english', label: 'English' },
  { value: 'gujarati', label: 'Gujarati' },
  { value: 'hindi', label: 'Hindi' },
];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editTone, setEditTone] = useState('');
  const [editLanguage, setEditLanguage] = useState('');
  const [isAdminPreview, setIsAdminPreview] = useState(false);
  const [activity, setActivity] = useState([]);
  const [shops, setShops] = useState([]);
  const [selectedShopId, setSelectedShopId] = useState('');
  const [noShop, setNoShop] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  const fetchNotifications = (showToast = false) => {
    api.get('/shop/notifications').then(({ data }) => {
      setNotifications(data.notifications || []);
      if (showToast && data.unread > unread && data.unread > 0) {
        const latest = (data.notifications || [])[0];
        if (latest) toast.success(latest.message);
      }
      setUnread(data.unread || 0);
    }).catch(() => {});
  };

  useEffect(() => {
    fetchNotifications(true);
    const timer = setInterval(() => fetchNotifications(true), 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openNotifications = async () => {
    setNotifOpen((current) => !current);
    if (!notifOpen && unread > 0) {
      try {
        await api.post('/shop/notifications/read');
        setUnread(0);
      } catch { /* ignore */ }
    }
  };

  const fetchDashboard = (shopId) => {
    const qs = shopId ? `?shop=${shopId}` : '';
    api.get(`/shop/my-shop${qs}`).then(({ data: result }) => {
      setData(result);
      setShops(result.shops || []);
      if (result.shops?.length > 1 && !shopId) {
        setSelectedShopId(result.shop._id);
      }
      setEditTone(result.shop.reviewTone);
      setEditLanguage(result.shop.language || 'english');
    }).catch((err) => {
      if (err.response?.status === 404) {
        setNoShop(true);
      } else {
        console.error(err);
      }
    }).finally(() => setLoading(false));
    api.get(`/shop/reviews${qs}`).then(({ data: result }) => setActivity(result.reviews)).catch(() => {});
  };

  useEffect(() => {
    fetchDashboard('');
  }, []);

  useEffect(() => {
    setIsAdminPreview(Boolean(sessionStorage.getItem('qr-admin-session')));
  }, []);

  const exitAdminPreview = () => {
    const originalSession = sessionStorage.getItem('qr-admin-session');
    if (!originalSession) return;
    const session = JSON.parse(originalSession);
    localStorage.setItem('token', session.token);
    localStorage.setItem('user', session.user);
    sessionStorage.removeItem('qr-admin-session');
    window.location.href = '/admin/shops';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/shop/my-shop?shop=${selectedShopId}`, { reviewTone: editTone, language: editLanguage });
      toast.success('Settings updated');
      fetchDashboard(selectedShopId);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;
  if (noShop) {
    return (
      <div className="min-h-screen bg-[#f7f9fd]">
        <header className="sticky top-0 z-20 flex h-[78px] items-center justify-between border-b border-[#e9edf5] bg-white/90 px-5 backdrop-blur-xl md:px-10">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-gradient-to-br from-indigo-600 to-violet-500 text-sm font-extrabold text-white shadow-lg shadow-indigo-200">QR</span>
            <span><strong className="block text-[17px] font-extrabold tracking-tight">QR <span className="text-indigo-600">Review</span></strong><small className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Business growth</small></span>
          </div>
          <button onClick={() => { logout(); navigate('/login'); }} className="ml-1 rounded-xl border border-[#e7eaf2] px-3 py-2 text-xs font-bold text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600">Logout</button>
        </header>
        <main className="mx-auto flex max-w-xl flex-col items-center px-5 py-16 text-center">
          <span className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-indigo-100 text-2xl font-extrabold text-indigo-600">!</span>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#17182d]">No business linked yet</h1>
          <p className="mt-3 text-sm text-slate-500">Set up your business now — link your Google Business, get your review link and QR code. Takes less than a minute.</p>
          <button onClick={() => navigate('/setup-business')} className="mt-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-500 px-8 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5">
            Set up my business
          </button>
        </main>
      </div>
    );
  }
  if (!data) return <div className="min-h-screen bg-[#f7f9fd] p-8 text-center text-red-500">Unable to load dashboard.</div>;

  const { shop, stats } = data;
  const tone = TONES.find((item) => item.value === shop.reviewTone)?.label || shop.reviewTone;
  const language = LANGUAGES.find((item) => item.value === shop.language)?.label || shop.language || 'English';
  const fieldLabels = {};
  (shop.customerFields || []).forEach((field) => { fieldLabels[field.key] = field.label; });

  return (
    <div className="min-h-screen bg-[#f7f9fd] text-[#17182d]">
      <header className="sticky top-0 z-20 flex h-[78px] items-center justify-between border-b border-[#e9edf5] bg-white/90 px-5 backdrop-blur-xl md:px-10">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-gradient-to-br from-indigo-600 to-violet-500 text-sm font-extrabold text-white shadow-lg shadow-indigo-200">QR</span>
          <span><strong className="block text-[17px] font-extrabold tracking-tight">QR <span className="text-indigo-600">Review</span></strong><small className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Business growth</small></span>
        </div>
        <div className="flex items-center gap-3">
          {isAdminPreview && <span className="hidden rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-700 sm:inline-flex">Admin preview</span>}
          <div ref={notifRef} className="relative">
            <button onClick={openNotifications} className="relative grid h-10 w-10 place-items-center rounded-full border border-[#e7eaf2] bg-white text-slate-500 transition hover:bg-slate-50" aria-label="Notifications">
              <svg className="h-[19px] w-[19px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-extrabold text-white">{unread}</span>}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-12 z-40 w-80 rounded-2xl border border-[#e9edf5] bg-white shadow-[0_18px_50px_rgba(41,45,54,0.15)]">
                <div className="flex items-center justify-between border-b border-[#e9edf5] px-4 py-3">
                  <p className="text-sm font-extrabold">Notifications</p>
                  {notifications.length > 0 && <button onClick={openNotifications} className="text-xs font-bold text-slate-400 hover:text-slate-600">Close</button>}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-slate-400">No notifications yet.</p>
                  ) : (
                    notifications.map((n) => (
                      <div key={n._id} className="border-b border-slate-50 px-4 py-3">
                        <p className="text-sm text-slate-700">{n.message}</p>
                        <p className="mt-1 text-[11px] text-slate-400">{new Date(n.createdAt).toLocaleString()}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <span className="hidden text-right sm:block"><strong className="block text-sm font-bold">{user?.name}</strong><small className="text-xs text-slate-400">Business owner</small></span>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-indigo-100 text-xs font-extrabold text-indigo-700">{user?.name?.slice(0, 2).toUpperCase()}</span>
          <button onClick={isAdminPreview ? exitAdminPreview : () => { logout(); navigate('/login'); }} className="ml-1 rounded-xl border border-[#e7eaf2] px-3 py-2 text-xs font-bold text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600">{isAdminPreview ? 'Exit preview' : 'Logout'}</button>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-5 py-8 md:px-10">
        <section className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-sm font-semibold text-indigo-600">Welcome back, {user?.name?.split(' ')[0]}</p>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{shop.businessName}</h1>
            <p className="mt-2 text-sm text-slate-500">Here is how your customer feedback is performing.</p>
          </div>
          <div className="flex items-center gap-3">
            {shops.length > 1 && (
              <select
                value={selectedShopId}
                onChange={(e) => {
                  setSelectedShopId(e.target.value);
                  setLoading(true);
                  fetchDashboard(e.target.value);
                }}
                className="input w-56 bg-white"
              >
                {shops.map((item) => (
                  <option key={item._id} value={item._id}>{item.shopName}</option>
                ))}
              </select>
            )}
            <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-bold ${shop.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{shop.isActive ? 'Active business' : 'Inactive business'}</span>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-[1.5fr_1fr]">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500 p-7 text-white shadow-[0_12px_30px_rgba(99,79,211,0.25)]">
            <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10" />
            <div className="relative flex items-center gap-5">
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-white/15 text-2xl font-extrabold">R</span>
              <div>
                <p className="text-sm font-semibold text-indigo-100">Total reviews copied</p>
                <p className="mt-1 text-5xl font-extrabold tracking-tight">{stats.totalCopied || 0}</p>
                <p className="mt-2 text-xs font-semibold text-indigo-100">Live customer activity</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-[#e9edf5] bg-white p-6 shadow-[0_8px_28px_rgba(41,45,54,0.045)]">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Current setup</p>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <MiniStat label="Tone" value={tone} />
              <MiniStat label="Language" value={language} />
              <MiniStat label="Pool" value={stats.availableReviews || 0} />
              <MiniStat label="Posted" value={shop.totalReviewsPosted || 0} />
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-[#e9edf5] bg-white p-6 shadow-[0_8px_28px_rgba(41,45,54,0.045)]">
          <div className="mb-5 flex items-center justify-between">
            <div><h2 className="text-lg font-extrabold">Business profile</h2><p className="mt-1 text-xs text-slate-400">Information connected to your review page</p></div>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-sm font-extrabold text-indigo-600">B</span>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <InfoItem label="Business name" value={shop.businessName} />
            <InfoItem label="Display name" value={shop.shopName} />
            <InfoItem label="Contact phone" value={shop.phone || 'Not set'} muted={!shop.phone} />
            <InfoItem label="Address" value={shop.address || 'Not set'} muted={!shop.address} wide />
            <InfoItem label="Review tone" value={tone} />
            <InfoItem label="Review language" value={language} />
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-[#e9edf5] bg-white p-6 shadow-[0_8px_28px_rgba(41,45,54,0.045)]">
          <div className="mb-5 flex items-center justify-between">
            <div><h2 className="text-lg font-extrabold">Customer activity</h2><p className="mt-1 text-xs text-slate-400">Latest customers who copied a review, with their details</p></div>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-sm font-extrabold text-indigo-600">C</span>
          </div>
          {activity.length === 0 ? (
            <p className="rounded-xl bg-[#f8f9fc] p-4 text-sm text-slate-400">No customer activity yet. Share your QR code to get started.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-3 py-3">Review</th>
                    <th className="px-3 py-3">Customer</th>
                    <th className="px-3 py-3">Copied at</th>
                    <th className="px-3 py-3 text-center">Posted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activity.map((r) => {
                    const details = r.customerDetails || {};
                    const detailText = Object.entries(details)
                      .map(([key, value]) => `${fieldLabels[key] || key}: ${value}`)
                      .join(' · ');
                    return (
                      <tr key={r._id} className="hover:bg-slate-50">
                        <td className="max-w-xs truncate px-3 py-4">{r.content}</td>
                        <td className="max-w-[160px] px-3 py-4">
                          {detailText ? <span className="block max-w-[160px] truncate text-xs text-slate-600" title={detailText}>{detailText}</span> : <span className="text-xs text-slate-300">-</span>}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-slate-500">{new Date(r.usedAt).toLocaleString()}</td>
                        <td className="px-3 py-4 text-center">
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${r.isPosted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{r.isPosted ? 'Posted' : 'Pending'}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-[#e9edf5] bg-white p-6 shadow-[0_8px_28px_rgba(41,45,54,0.045)]">
          <div className="mb-5 flex items-center justify-between">
            <div><h2 className="text-lg font-extrabold">Submitted customer details</h2><p className="mt-1 text-xs text-slate-400">Full details customers filled before copying a review</p></div>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-sm font-extrabold text-indigo-600">D</span>
          </div>
          {activity.filter((r) => r.customerDetails && Object.keys(r.customerDetails).length > 0).length === 0 ? (
            <p className="rounded-xl bg-[#f8f9fc] p-4 text-sm text-slate-400">No submissions yet. Customers appear here after they copy a review on your review page.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {activity
                .filter((r) => r.customerDetails && Object.keys(r.customerDetails).length > 0)
                .map((r) => (
                  <div key={r._id} className="rounded-xl border border-[#e9edf5] bg-white p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-400">{new Date(r.usedAt).toLocaleString()}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${r.isPosted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{r.isPosted ? 'Posted' : 'Pending'}</span>
                    </div>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {Object.entries(r.customerDetails).map(([key, value]) => (
                        <span key={key} className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                          {fieldLabels[key] || key}: {value}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm leading-relaxed text-slate-600">{r.content}</p>
                  </div>
                ))}
            </div>
          )}
        </section>

        {shop.canOwnerSetTone && (
          <section className="mt-6 rounded-2xl border border-[#e9edf5] bg-white p-6 shadow-[0_8px_28px_rgba(41,45,54,0.045)]">
            <div className="mb-5"><h2 className="text-lg font-extrabold">Review preferences</h2><p className="mt-1 text-xs text-slate-400">Your administrator has allowed you to customize these settings.</p></div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="text-sm font-bold text-slate-600">Tone<select value={editTone} onChange={(e) => setEditTone(e.target.value)} className="input mt-2 bg-white">{TONES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label className="text-sm font-bold text-slate-600">Language<select value={editLanguage} onChange={(e) => setEditLanguage(e.target.value)} className="input mt-2 bg-white">{LANGUAGES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            </div>
            <button onClick={handleSave} disabled={saving} className="mt-5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 disabled:opacity-50">{saving ? 'Updating...' : 'Save preferences'}</button>
          </section>
        )}

        <section className="mt-6 rounded-2xl border border-[#e9edf5] bg-white p-6 shadow-[0_8px_28px_rgba(41,45,54,0.045)]">
          <div className="mb-5 flex items-center justify-between">
            <div><h2 className="text-lg font-extrabold">QR code</h2><p className="mt-1 text-xs text-slate-400">Scan to write a review — print it or share it with your customers</p></div>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-sm font-extrabold text-indigo-600">Q</span>
          </div>
          <div className="flex flex-col items-center gap-6 md:flex-row">
            {shop.qrCodeData ? (
              <img src={shop.qrCodeData} alt={`QR code for ${shop.shopName}`} className="w-52 rounded-2xl border border-[#e9edf5] bg-white p-2" />
            ) : (
              <div className="grid h-52 w-52 place-items-center rounded-2xl bg-[#f8f9fc] text-sm font-bold text-slate-400">QR not available</div>
            )}
            <div className="text-center md:text-left">
              <p className="text-sm font-extrabold text-slate-700">{shop.shopName}</p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3 md:justify-start">
                {shop.qrCodeData && (
                  <a
                    href={shop.qrCodeData}
                    download={`${shop.shopName}-qr.png`}
                    className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5"
                  >
                    Download QR
                  </a>
                )}
                <button onClick={() => { window.print(); }} className="rounded-xl border border-[#e7eaf2] bg-white px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50">Print</button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function InfoItem({ label, value, muted, wide }) { return <div className={`${wide ? 'md:col-span-3' : ''} rounded-xl bg-[#f8f9fc] p-4`}><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className={`mt-2 text-sm font-bold ${muted ? 'text-slate-300' : 'text-slate-700'}`}>{value}</p></div>; }
function MiniStat({ label, value }) { return <div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 truncate text-base font-extrabold capitalize text-slate-700">{value}</p></div>; }
function Loading() { return <div className="flex min-h-screen items-center justify-center bg-[#f7f9fd]"><div className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" /></div>; }