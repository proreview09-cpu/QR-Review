import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

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

export default function ShopDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [catsLoading, setCatsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [changed, setChanged] = useState(false);
  const [reviewHistory, setReviewHistory] = useState([]);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [categories, setCategories] = useState([]);
  const [showOtherCategory, setShowOtherCategory] = useState(false);
  const [generatingPrompt, setGeneratingPrompt] = useState(false);

  const fetchCategories = () => {
    api.get('/admin/categories?activeOnly=true')
      .then(({ data }) => setCategories(data.categories))
      .catch(() => toast.error('Failed to load categories'))
      .finally(() => setCatsLoading(false));
  };

  const fetchShop = () => {
    api.get(`/admin/shops/${id}`)
      .then(({ data }) => {
        setData(data);
        setEditForm({
          shopName: data.shop.shopName, businessName: data.shop.businessName,
          ownerName: data.shop.ownerName || '', address: data.shop.address || '',
          phone: data.shop.phone || '', googleReviewUrl: data.shop.googleReviewUrl,
          reviewTone: data.shop.reviewTone, language: data.shop.language || 'english',
          isActive: data.shop.isActive, canOwnerSetTone: data.shop.canOwnerSetTone || false,
          reviewPoolMin: data.shop.reviewPoolMin || 50, reviewBatchSize: data.shop.reviewBatchSize || 50,
          category: data.shop.category?._id || '',
          customCategoryName: '',
          aiPrompt: data.shop.aiPrompt || '',
        });
        setChanged(false);
        fetchReviewHistory();
        fetchCategories();
      })
      .catch(() => toast.error('Failed to load shop'))
      .finally(() => { setLoading(false); });
  };

  useEffect(() => { fetchShop(); }, [id]);

  const fetchReviewHistory = (p = 1) => {
    api.get(`/admin/shops/${id}/reviews?page=${p}&limit=15`).then(({ data }) => {
      setReviewHistory(data.reviews);
      setReviewTotal(data.total);
      setReviewPage(data.page);
    }).catch(() => {});
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm({ ...editForm, [name]: type === 'checkbox' ? checked : value });
    setChanged(true);
  };

  const handleCategoryChange = (e) => {
    const value = e.target.value;
    if (value === 'other') {
      setShowOtherCategory(true);
      setEditForm({ ...editForm, category: '', customCategoryName: '' });
    } else if (value) {
      setShowOtherCategory(false);
      const selectedCat = categories.find((c) => c._id === value);
      setEditForm({
        ...editForm,
        category: value,
        customCategoryName: '',
        reviewTone: selectedCat?.defaultTone || 'friendly',
        language: selectedCat?.defaultLanguage || 'english',
        reviewPoolMin: selectedCat?.reviewPoolMin || 50,
        reviewBatchSize: selectedCat?.reviewBatchSize || 50,
        aiPrompt: selectedCat?.defaultPrompt || '',
      });
    }
    setChanged(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...editForm };
      if (!payload.category && payload.customCategoryName) {
        try {
          const { data: catData } = await api.post('/admin/categories', {
            name: payload.customCategoryName,
            description: '',
            defaultTone: payload.reviewTone,
            defaultLanguage: payload.language,
            isActive: true,
          });
          payload.category = catData.category._id;
        } catch (catErr) {
          console.error('Category creation skipped:', catErr.message);
        }
      }
      delete payload.customCategoryName;
      await api.put(`/admin/shops/${id}`, payload);
      toast.success('Shop updated');
      fetchShop();
    } catch {
      toast.error('Failed to update shop');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    try {
      await api.post(`/public/shop/${id}/generate`);
      toast.success('Regenerating reviews...');
      setTimeout(fetchShop, 2000);
    } catch {
      toast.error('Failed to regenerate');
    }
  };

  const handleGeneratePrompt = async () => {
    if (!editForm.shopName) {
      toast.error('Please enter a shop name first');
      return;
    }
    setGeneratingPrompt(true);
    try {
      const selectedCat = editForm.category ? categories.find((c) => c._id === editForm.category) : shop.category;
      const { data } = await api.post('/admin/categories/generate-prompt', {
        name: selectedCat?.name || '',
        description: selectedCat?.description || '',
        shopName: editForm.shopName,
        businessName: editForm.businessName,
        tone: editForm.reviewTone,
        language: editForm.language,
      });
      setEditForm({ ...editForm, aiPrompt: data.prompt });
      setChanged(true);
      toast.success('AI prompt generated');
    } catch {
      toast.error('Failed to generate prompt');
    } finally {
      setGeneratingPrompt(false);
    }
  };

  if (loading || catsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }
  if (!data) return <p>Shop not found.</p>;

  const { shop, stats, tokenUsage } = data;
  const reviewLink = `${window.location.origin}/review/${shop._id}`;
  const reviewsGenerated = tokenUsage?.reviewsGenerated || 0;
  const promptTokens = tokenUsage?.promptTokens || 0;
  const completionTokens = tokenUsage?.completionTokens || 0;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/admin/shops" className="text-gray-400 hover:text-gray-600">&larr; Back</Link>
        <h2 className="text-2xl font-bold">{shop.shopName}</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatCard label="Total Reviews" value={stats.totalReviews} color="blue" />
        <StatCard label="Available" value={stats.availableReviews} color="green" />
        <StatCard label="Copied" value={stats.usedReviews} color="orange" />
        <StatCard label="Posted" value={stats.postedReviews || 0} color="purple" />
        <StatCard label="Reviews Generated" value={reviewsGenerated} color="teal" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="ChatGPT API Calls" value={tokenUsage?.totalCalls || 0} color="indigo" />
        <StatCard label="Total Tokens" value={tokenUsage?.totalTokens?.toLocaleString() || 0} color="pink" />
        <StatCard label="Prompt Tokens" value={promptTokens?.toLocaleString() || 0} color="slate" />
        <StatCard label="Completion Tokens" value={completionTokens?.toLocaleString() || 0} color="amber" />
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Business Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
            <input name="businessName" value={editForm.businessName || ''} onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shop Display Name</label>
            <input name="shopName" value={editForm.shopName || ''} onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
            <input name="ownerName" value={editForm.ownerName || ''} onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input name="phone" value={editForm.phone || ''} onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input name="address" value={editForm.address || ''} onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Google Review URL</label>
            <input name="googleReviewUrl" value={editForm.googleReviewUrl || ''} onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Category &amp; Review Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={editForm.category ? (showOtherCategory ? 'other' : editForm.category) : (showOtherCategory ? 'other' : '')}
              onChange={handleCategoryChange}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="">No category</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
              <option value="other">Other (create new)</option>
            </select>
            {shop.category && (
              <p className="text-xs text-gray-400 mt-1">
                Current: <span className="font-medium text-gray-700">{shop.category.name}</span>
              </p>
            )}
          </div>

          {showOtherCategory && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Category Name</label>
              <input
                name="customCategoryName" value={editForm.customCategoryName || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Enter new category name"
              />
              <p className="text-xs text-gray-400 mt-1">A new category will be created with the current settings</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Review Tone</label>
              <select name="reviewTone" value={editForm.reviewTone || 'friendly'} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                {TONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Review Language</label>
              <select name="language" value={editForm.language || 'english'} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
              <p className="text-xs text-gray-400 mt-1">Native language reviews (Gujarati shops get Gujarati, etc.)</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">AI Generated Prompt</label>
              <button
                type="button"
                onClick={handleGeneratePrompt}
                disabled={generatingPrompt}
                className="px-3 py-1 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {generatingPrompt ? 'Generating...' : 'Generate AI Prompt'}
              </button>
            </div>
            <textarea
              name="aiPrompt" value={editForm.aiPrompt || ''} onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              rows={4}
              placeholder="Custom prompt for review generation. Use [SHOP_NAME] for dynamic shop name."
            />
            <p className="text-xs text-gray-400 mt-1">
              Use <code className="bg-gray-100 px-1 rounded">[SHOP_NAME]</code> to reference the shop name dynamically.
              Empty = system default prompt.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Review Pool Size (Queue)</label>
              <input type="number" name="reviewPoolMin" value={editForm.reviewPoolMin || 50} onChange={handleChange} min="10"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              <p className="text-xs text-gray-400 mt-1">Min reviews always in queue</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Generate Batch</label>
              <input type="number" name="reviewBatchSize" value={editForm.reviewBatchSize || 50} onChange={handleChange} min="10"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              <p className="text-xs text-gray-400 mt-1">Reviews per generation batch</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
            <input type="checkbox" name="isActive" checked={editForm.isActive !== false} onChange={handleChange}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700">Shop is active</label>
              <p className="text-xs text-gray-400">Inactive shops won't receive new reviews</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
            <input type="checkbox" name="canOwnerSetTone" checked={editForm.canOwnerSetTone || false} onChange={handleChange}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
            <div>
              <label className="text-sm font-medium text-gray-700">Allow owner to change tone/language</label>
              <p className="text-xs text-gray-400">Owner can modify review settings if enabled</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button onClick={handleRegenerate}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
            Regenerate Reviews
          </button>
          {changed && (
            <span className="text-sm text-amber-600 self-center">Unsaved changes</span>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">QR Code &amp; Link</h3>
        {shop.qrCodeData ? (
          <div className="text-center mb-4">
            <img src={shop.qrCodeData} alt={`QR Code for ${shop.shopName}`} className="mx-auto w-64 h-64" />
            <a href={shop.qrCodeData} download={`qrcode-${shop.shopName}.png`}
              className="inline-block mt-2 text-sm text-blue-600 hover:underline">
              Download QR Code
            </a>
          </div>
        ) : (
          <p className="text-gray-400 italic mb-4">QR code not generated yet.</p>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Review Page Link</label>
          <div className="flex items-center gap-2">
            <input readOnly value={reviewLink} className="flex-1 px-3 py-2 border rounded-lg bg-gray-50 text-sm" />
            <button onClick={() => { navigator.clipboard.writeText(reviewLink); toast.success('Link copied!'); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Copy</button>
            <a href={reviewLink} target="_blank" rel="noopener noreferrer"
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Open</a>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-3">Owner Account</h3>
        <p><span className="text-gray-500">Name:</span> {shop.owner?.name}</p>
        <p><span className="text-gray-500">Email:</span> {shop.owner?.email}</p>
        <p className="text-sm text-gray-400 mt-2">Created: {new Date(shop.createdAt).toLocaleDateString()}</p>
        <p className="text-sm text-gray-400">Language: {shop.language === 'gujarati' ? 'ગુજરાતી (Native)' : shop.language === 'hindi' ? 'हिन्दी (Native)' : 'English'}</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Review Activity ({reviewTotal})</h3>
        {reviewHistory.length === 0 ? (
          <p className="text-gray-400 text-sm">No reviews copied yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-gray-500">Review</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-500">Copied At</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-500">Device</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-500">IP</th>
                    <th className="text-center px-4 py-2 font-medium text-gray-500">Posted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reviewHistory.map((r) => (
                    <tr key={r._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 max-w-xs truncate">{r.content}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(r.usedAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-[120px] truncate">{r.copiedByUA || '-'}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{r.copiedByIp || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.isPosted ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {r.isPosted ? 'Posted' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {reviewTotal > 15 && (
              <div className="flex justify-center gap-2 mt-4">
                <button disabled={reviewPage <= 1} onClick={() => fetchReviewHistory(reviewPage - 1)}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-30 hover:bg-gray-50">&laquo; Prev</button>
                <span className="px-3 py-1 text-sm text-gray-500">Page {reviewPage}</span>
                <button disabled={reviewPage * 15 >= reviewTotal} onClick={() => fetchReviewHistory(reviewPage + 1)}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-30 hover:bg-gray-50">Next &raquo;</button>
              </div>
            )}
          </>
        )}
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
    <div className={`rounded-lg p-4 ${colors[color] || colors.blue}`}>
      <p className="text-sm font-medium opacity-75">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
