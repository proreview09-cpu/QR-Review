import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const TONES = [
  { value: 'professional', label: 'Professional', icon: '📋', color: 'from-blue-500 to-blue-700' },
  { value: 'friendly', label: 'Friendly', icon: '😊', color: 'from-green-500 to-green-700' },
  { value: 'casual', label: 'Casual', icon: '👋', color: 'from-teal-500 to-teal-700' },
  { value: 'enthusiastic', label: 'Enthusiastic', icon: '🔥', color: 'from-orange-500 to-orange-700' },
  { value: 'grateful', label: 'Grateful', icon: '🙏', color: 'from-pink-500 to-pink-700' },
  { value: 'humorous', label: 'Humorous', icon: '😄', color: 'from-yellow-500 to-yellow-700' },
];

const LANGUAGES = [
  { value: 'english', label: 'English', flag: 'GB' },
  { value: 'gujarati', label: 'Gujarati', flag: 'IN' },
  { value: 'hindi', label: 'Hindi', flag: 'IN' },
];

function InfoBox({ icon, label, value, dim, full }) {
  return (
    <div className={`${full ? 'md:col-span-3' : ''} bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className={`font-semibold ${dim ? 'text-gray-300 italic' : 'text-gray-800'}`}>{value}</p>
    </div>
  );
}

function StepBox({ step, icon, title, desc }) {
  return (
    <div className="text-center">
      <div className="w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center text-2xl mx-auto mb-3 border border-blue-100">
        {icon}
      </div>
      <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mx-auto mb-2">{step}</div>
      <h4 className="font-semibold text-blue-900 mb-1">{title}</h4>
      <p className="text-xs text-blue-600/70 leading-relaxed">{desc}</p>
    </div>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editTone, setEditTone] = useState('');
  const [editLanguage, setEditLanguage] = useState('');

  useEffect(() => {
    api.get('/shop/my-shop').then(({ data }) => {
      setData(data);
      setEditTone(data.shop.reviewTone);
      setEditLanguage(data.shop.language || 'english');
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/shop/my-shop', { reviewTone: editTone, language: editLanguage });
      toast.success('Settings updated!');
      const { data: fresh } = await api.get('/shop/my-shop');
      setData(fresh);
    } catch {
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 animate-pulse mb-4">
            <span className="text-3xl">&#11088;</span>
          </div>
          <p className="text-gray-500 animate-pulse">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center p-12 bg-red-50 rounded-2xl">
        <span className="text-5xl mb-4 block">:(</span>
        <p className="text-red-600 font-medium">Unable to load dashboard</p>
        <p className="text-red-400 text-sm mt-1">Please contact admin</p>
      </div>
    </div>
  );

  const { shop, stats } = data;
  const activeTone = TONES.find((t) => t.value === shop.reviewTone) || TONES[1];
  const activeLang = LANGUAGES.find((l) => l.value === shop.language) || LANGUAGES[0];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm">QR</div>
          <div>
            <h1 className="font-semibold text-gray-900 text-sm">QR Review</h1>
            <p className="text-xs text-gray-400">{user?.name}</p>
          </div>
        </div>
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="px-4 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          Logout
        </button>
      </header>

      <div className="p-6 max-w-4xl mx-auto">
    <div className="max-w-4xl">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-8 mb-8 shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full" style={{ transform: 'translate(5rem, -5rem)' }} />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full" style={{ transform: 'translate(-2.5rem, 4rem)' }} />
        <div className="relative">
          <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur rounded-full text-xs font-medium text-white mb-3">
            {shop.isActive ? 'Active' : 'Inactive'}
          </span>
          <h1 className="text-4xl font-bold text-white mb-1">{shop.businessName}</h1>
          <p className="text-purple-200 text-lg">{shop.shopName}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="relative overflow-hidden bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full" style={{ transform: 'translate(2.5rem, -2.5rem)' }} />
        <div className="relative flex items-center gap-6">
          <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-200">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <div>
            <p className="text-5xl font-extrabold text-gray-900">{stats.totalCopied}</p>
            <p className="text-gray-500 text-sm mt-1">Total Google Reviews Copied by Your Customers</p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-green-500 text-xs font-medium">Live counter</span>
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Shop Info */}
      <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">S</span>
          Shop Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <InfoBox icon="B" label="Business Name" value={shop.businessName} />
          <InfoBox icon="N" label="Shop Name" value={shop.shopName} />
          <InfoBox icon="P" label="Phone" value={shop.phone || 'Not set'} dim={!shop.phone} />
          <InfoBox icon="A" label="Address" value={shop.address || 'Not set'} dim={!shop.address} full />
          <InfoBox icon={activeTone.icon} label="Review Tone" value={activeTone.label} />
          <InfoBox icon={activeLang.flag} label="Review Language" value={activeLang.label} />
        </div>
      </div>

      {/* Review Settings (only if admin allows) */}
      {shop.canOwnerSetTone && (
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm">G</span>
            Review Settings
          </h3>
          <p className="text-sm text-gray-400 mb-6">Admin has allowed you to customize review tone & language. Changes regenerate all reviews.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Review Tone</label>
              <select value={editTone} onChange={(e) => setEditTone(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none bg-white text-gray-700">
                {TONES.map((t) => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Review Language</label>
              <select value={editLanguage} onChange={(e) => setEditLanguage(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none bg-white text-gray-700">
                {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          </div>
          <button onClick={handleSave} disabled={saving}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 transition-all shadow-lg shadow-purple-200">
            {saving ? 'Updating...' : 'Update Settings'}
          </button>
        </div>
      )}
      </div>
      </div>
    </div>
  );
}
