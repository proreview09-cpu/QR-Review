import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import GoogleLookup from '../../components/GoogleLookup';

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

const CUSTOMER_FIELDS = [
  { key: 'name', label: 'Full name' },
  { key: 'phone', label: 'Phone number' },
  { key: 'email', label: 'Email' },
  { key: 'city', label: 'City' },
  { key: 'orderNo', label: 'Order / receipt number' },
  { key: 'vehicleNo', label: 'Vehicle number' },
  { key: 'note', label: 'Note / feedback' },
];

const STEPS = ['Business', 'Review settings'];

export default function SetupBusiness() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [categories, setCategories] = useState([]);
  const [catsLoading, setCatsLoading] = useState(true);
  const [showOtherCategory, setShowOtherCategory] = useState(false);
  const [matchedGoogle, setMatchedGoogle] = useState(null);

  const [business, setBusiness] = useState({ businessName: '', shopName: '', phone: '', address: '', googleReviewUrl: '', googlePlaceId: '' });
  const [settings, setSettings] = useState({
    category: '', customCategoryName: '', reviewTone: 'friendly', language: 'english', promptMode: 'combine', aiPrompt: '',
    customerFields: CUSTOMER_FIELDS.map((field) => ({ ...field, enabled: false, required: false })),
  });

  useEffect(() => {
    api.get('/public/categories')
      .then(({ data }) => setCategories(data.categories))
      .catch(() => {})
      .finally(() => setCatsLoading(false));
  }, []);

  const setBusinessField = (e) => setBusiness({ ...business, [e.target.name]: e.target.value });

  const next = () => {
    if (!business.businessName.trim() || !business.shopName.trim() || !business.googleReviewUrl.trim()) {
      toast.error('Please fill business name, shop name and Google review link');
      return;
    }
    setStep(1);
  };

  const handleCategoryChange = (e) => {
    const value = e.target.value;
    if (value === 'other') {
      setShowOtherCategory(true);
      setSettings({ ...settings, category: '', customCategoryName: '' });
    } else {
      setShowOtherCategory(false);
      const selectedCat = categories.find((c) => c._id === value);
      setSettings({
        ...settings,
        category: value,
        customCategoryName: '',
        reviewTone: selectedCat?.defaultTone || settings.reviewTone,
        language: selectedCat?.defaultLanguage || settings.language,
      });
    }
  };

  const toggleField = (key, patch) => {
    setSettings({
      ...settings,
      customerFields: settings.customerFields.map((item) => item.key === key ? { ...item, ...patch } : item),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/shop/my-shop', { ...business, ...settings });
      toast.success('Your business is ready!');
      setResult(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create business');
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="min-h-screen bg-[#f7f9fd]">
        <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
          <div className="mb-8 text-center">
            <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-2xl text-emerald-600">✓</span>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#17182d]">Your business is ready!</h1>
            <p className="mt-2 text-sm text-slate-500">Reviews are being generated — they'll appear in a few minutes.</p>
          </div>
          <div className="rounded-2xl border border-[#e9edf5] bg-white p-8 shadow-[0_8px_28px_rgba(41,45,54,0.05)]">
            <p className="mb-1 text-sm text-slate-500">Your review link</p>
            <div className="flex items-center gap-2">
              <input readOnly value={result.reviewLink} className="input flex-1 bg-slate-50 text-sm" />
              <button onClick={() => { navigator.clipboard.writeText(result.reviewLink); toast.success('Link copied!'); }}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">Copy</button>
            </div>
            <button onClick={() => navigate('/dashboard')}
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-500 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5">
              Go to my dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9fd]">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 py-10">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-500 text-lg font-extrabold text-white shadow-lg shadow-indigo-200">QR</span>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#17182d]">Set up your business</h1>
          <p className="mt-2 text-sm text-slate-500">Link your Google Business to your account — takes less than a minute</p>
        </div>

        <div className="mb-6 flex items-center justify-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-extrabold ${i === step ? 'bg-indigo-600 text-white' : i < step ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{i < step ? '✓' : i + 1}</span>
              <span className={`text-xs font-bold ${i === step ? 'text-indigo-700' : 'text-slate-400'}`}>{label}</span>
              {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-slate-200" />}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-[#e9edf5] bg-white p-8 shadow-[0_8px_28px_rgba(41,45,54,0.05)]">
          {step === 0 && (
            <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); next(); }}>
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                <GoogleLookup
                  selected={matchedGoogle}
                  onClear={() => { setMatchedGoogle(null); setBusiness({ ...business, businessName: '', shopName: '', phone: '', address: '', googleReviewUrl: '', googlePlaceId: '' }); }}
                  onFetched={(place) => {
                    setMatchedGoogle({ name: place.name, placeId: place.placeId });
                    setBusiness({
                      ...business,
                      businessName: place.name || business.businessName,
                      shopName: place.name || business.shopName,
                      phone: place.phone || business.phone,
                      address: place.address || business.address,
                      googlePlaceId: place.placeId,
                      googleReviewUrl: business.googleReviewUrl || `https://search.google.com/local/writereview?placeid=${encodeURIComponent(place.placeId)}`,
                    });
                  }}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-600">Business name</label>
                  <input name="businessName" value={business.businessName} onChange={setBusinessField} className="input" required placeholder="ABC Stores Pvt Ltd" />
                  <p className="hint">Exact name shown on Google Business Profile.</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-600">Shop display name</label>
                  <input name="shopName" value={business.shopName} onChange={setBusinessField} className="input" required placeholder="ABC Stores" />
                  <p className="hint">Name customers see on the review page.</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-600">Phone</label>
                  <input name="phone" value={business.phone} onChange={setBusinessField} className="input" placeholder="+91 9876543210" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-600">Address</label>
                  <input name="address" value={business.address} onChange={setBusinessField} className="input" placeholder="Shop 12, ABC Complex, Main Road" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-600">Google review link</label>
                <input name="googleReviewUrl" type="url" value={business.googleReviewUrl} onChange={setBusinessField} className="input" required placeholder="https://search.google.com/local/writereview?placeid=..." />
                <p className="hint">Google Business Profile &gt; Ask for reviews &gt; Copy link. Auto-filled when you pick your business from Google.</p>
              </div>
              <button type="submit" className="w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-500 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5">Continue</button>
            </form>
          )}

          {step === 1 && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-600">Category</label>
                <select value={settings.category ? settings.category : 'other'} onChange={handleCategoryChange} className="input bg-white">
                  <option value="">Select a category</option>
                  {!catsLoading && categories.map((cat) => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
                  <option value="other">Other (create new)</option>
                </select>
                <p className="hint">Category fills in default tone, language, and prompt.</p>
              </div>
              {showOtherCategory && (
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-600">New category name</label>
                  <input value={settings.customCategoryName} onChange={(e) => setSettings({ ...settings, customCategoryName: e.target.value })} className="input" placeholder="Enter new category name" />
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-600">Review tone</label>
                  <select value={settings.reviewTone} onChange={(e) => setSettings({ ...settings, reviewTone: e.target.value })} className="input bg-white">
                    {TONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-600">Review language</label>
                  <select value={settings.language} onChange={(e) => setSettings({ ...settings, language: e.target.value })} className="input bg-white">
                    {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                  <p className="hint">Gujarati shops get Gujarati reviews, Hindi shops get Hindi reviews.</p>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-600">Prompt mode</label>
                <select value={settings.promptMode} onChange={(e) => setSettings({ ...settings, promptMode: e.target.value })} className="input bg-white">
                  <option value="combine">Merge with default prompt (Recommended)</option>
                  <option value="override">Only shop prompt</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-600">Your AI review prompt <span className="font-normal text-slate-400">(optional)</span></label>
                <textarea value={settings.aiPrompt} onChange={(e) => setSettings({ ...settings, aiPrompt: e.target.value })} rows={4} className="input resize-y" placeholder="Tell AI how to write your reviews. Example: Mention fresh products, quick service, and helpful staff." />
                <p className="hint">Leave empty to use the admin's default prompt. With "Merge" mode both are used; with "Only shop prompt" only yours is used.</p>
              </div>
              <div>
                <p className="mb-2 block text-sm font-bold text-slate-600">Ask customers for details <span className="font-normal text-slate-400">(optional — can be changed later)</span></p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {CUSTOMER_FIELDS.map((field) => {
                    const saved = settings.customerFields.find((item) => item.key === field.key);
                    return (
                      <div key={field.key} className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${saved?.enabled ? 'border-indigo-200 bg-indigo-50/60' : 'border-slate-200 bg-[#f8f9fc]'}`}>
                        <div className="flex items-center gap-3">
                          <input type="checkbox" checked={saved?.enabled || false} onChange={(e) => toggleField(field.key, { enabled: e.target.checked })} className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500" />
                          <span className="text-sm font-bold text-slate-700">{field.label}</span>
                        </div>
                        {saved?.enabled && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500">Required</span>
                            <input type="checkbox" checked={saved?.required || false} onChange={(e) => toggleField(field.key, { required: e.target.checked })} className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(0)} className="rounded-2xl border border-slate-200 px-5 py-3.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Back</button>
                <button type="submit" disabled={loading} className="flex-1 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-500 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 disabled:opacity-50">
                  {loading ? 'Creating your business...' : 'Create my business'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}