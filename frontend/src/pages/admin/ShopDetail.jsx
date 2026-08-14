import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import PromptVariables from '../../components/PromptVariables';

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

const PROMPT_MODES = [
  { value: 'general', label: 'Use general prompt only' },
  { value: 'combine', label: 'Combine general + shop prompt' },
  { value: 'override', label: 'Override general with shop prompt' },
];

export default function ShopDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [changed, setChanged] = useState(false);
  const [reviewHistory, setReviewHistory] = useState([]);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewTotal, setReviewTotal] = useState(0);

  const fetchShop = () => {
    api.get(`/admin/shops/${id}`)
      .then(({ data }) => {
        setData(data);
        setEditForm({
          shopName: data.shop.shopName, businessName: data.shop.businessName,
          ownerName: data.shop.ownerName || '', address: data.shop.address || '',
          phone: data.shop.phone || '', googleReviewUrl: data.shop.googleReviewUrl,
          reviewTone: data.shop.reviewTone, language: data.shop.language || 'english',
          customPrompt: data.shop.customPrompt || '', promptMode: data.shop.promptMode || 'general',
          isActive: data.shop.isActive, canOwnerSetTone: data.shop.canOwnerSetTone || false,
          reviewPoolMin: data.shop.reviewPoolMin || 50, reviewBatchSize: data.shop.reviewBatchSize || 50,
        });
        setChanged(false);
        fetchReviewHistory();
      })
      .catch(() => toast.error('Failed to load shop'))
      .finally(() => setLoading(false));
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

  const insertPromptVariable = (variable) => {
    setEditForm((current) => ({
      ...current,
      customPrompt: `${current.customPrompt || ''}${current.customPrompt && !/\s$/.test(current.customPrompt) ? ' ' : ''}${variable}`,
    }));
    setChanged(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/admin/shops/${id}`, editForm);
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
      const { data: result } = await api.post(`/admin/shops/${id}/regenerate`);
      toast.success(result.message || 'Reviews regenerated');
      fetchShop();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to regenerate');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;
  if (!data) return <p>Shop not found.</p>;

  const { shop, stats, tokenUsage } = data;
  const reviewLink = `${window.location.origin}/review/${shop._id}`;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/admin/shops" className="text-gray-400 hover:text-gray-600">&larr; Back</Link>
        <h2 className="text-2xl font-bold">{shop.shopName}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-blue-700">{stats.totalReviews}</p>
          <p className="text-sm text-blue-600">Total</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-700">{stats.availableReviews}</p>
          <p className="text-sm text-green-600">Available</p>
        </div>
        <div className="bg-orange-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-orange-700">{stats.usedReviews}</p>
          <p className="text-sm text-orange-600">Copied</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-purple-700">{stats.postedReviews || 0}</p>
          <p className="text-sm text-purple-600">Posted</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-indigo-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-indigo-700">{tokenUsage?.totalCalls || 0}</p>
          <p className="text-sm text-indigo-600">ChatGPT API Calls</p>
        </div>
        <div className="bg-pink-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-pink-700">{tokenUsage?.totalTokens?.toLocaleString() || 0}</p>
          <p className="text-sm text-pink-600">Tokens Used</p>
        </div>
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
        <h3 className="text-lg font-semibold mb-4">Review Settings</h3>
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
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select name="isActive" value={editForm.isActive ? 'true' : 'false'} onChange={(e) => { setEditForm({ ...editForm, isActive: e.target.value === 'true' }); setChanged(true); }}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 h-full">
            <input type="checkbox" name="canOwnerSetTone" checked={editForm.canOwnerSetTone || false} onChange={handleChange}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
            <div>
              <label className="text-sm font-medium text-gray-700">Allow owner to change tone/language</label>
              <p className="text-xs text-gray-400">Owner can modify review settings if enabled</p>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Shop-Specific Prompt</label>
            <textarea name="customPrompt" value={editForm.customPrompt || ''} onChange={handleChange} rows="4"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-y"
              placeholder="Example: Mention quick service, fresh products, and helpful staff." />
            <p className="text-xs text-gray-400 mt-1">Optional instructions specific to this shop.</p>
            <PromptVariables onInsert={insertPromptVariable} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prompt Behavior</label>
            <select name="promptMode" value={editForm.promptMode || 'general'} onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
              {PROMPT_MODES.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">Choose how the shop prompt uses the general prompt.</p>
            {editForm.customPrompt && editForm.promptMode === 'general' && (
              <p className="text-xs text-amber-600 mt-1">Shop prompt is currently ignored. Select Combine or Override to use it.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pool Size (Queue)</label>
            <input type="number" name="reviewPoolMin" value={editForm.reviewPoolMin ?? ''} onChange={handleChange} min="10"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            <p className="text-xs text-gray-400 mt-1">Minimum reviews always in queue.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Generate Batch</label>
            <input type="number" name="reviewBatchSize" value={editForm.reviewBatchSize ?? ''} onChange={handleChange} min="10"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            <p className="text-xs text-gray-400 mt-1">Reviews generated per refill.</p>
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
        <h3 className="text-lg font-semibold mb-4">QR Code & Link</h3>
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
