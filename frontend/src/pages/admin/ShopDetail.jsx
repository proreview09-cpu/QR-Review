import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
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

const CUSTOMER_FIELDS = [
  { key: 'name', label: 'Full name' },
  { key: 'phone', label: 'Phone number' },
  { key: 'email', label: 'Email' },
  { key: 'city', label: 'City' },
  { key: 'orderNo', label: 'Order / receipt number' },
  { key: 'vehicleNo', label: 'Vehicle number' },
  { key: 'note', label: 'Note / feedback' },
];

function toLocalDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function ShopDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const readOnly = searchParams.get('mode') === 'view';
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
  const [resetOpen, setResetOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetResult, setResetResult] = useState('');
  const [resetting, setResetting] = useState(false);

  const fetchCategories = () => {
    api.get('/admin/categories?activeOnly=true')
      .then(({ data }) => setCategories(data.categories))
      .catch(() => toast.error('Failed to load categories'))
      .finally(() => setCatsLoading(false));
  };

  const fetchReviewHistory = (p = 1) => {
    api.get(`/admin/shops/${id}/reviews?page=${p}&limit=15`).then(({ data }) => {
      setReviewHistory(data.reviews);
      setReviewTotal(data.total);
      setReviewPage(data.page);
    }).catch(() => {});
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
          aiPrompt: data.shop.aiPrompt || '',
          promptMode: data.shop.promptMode || 'combine',
          customerFields: CUSTOMER_FIELDS.map((field) => {
            const saved = (data.shop.customerFields || []).find((item) => item.key === field.key);
            return { ...field, enabled: !!saved?.enabled, required: !!saved?.required };
          }),
          isActive: data.shop.isActive, canOwnerSetTone: data.shop.canOwnerSetTone || false,
          reviewPoolMin: data.shop.reviewPoolMin || 50, reviewBatchSize: data.shop.reviewBatchSize || 50,
          expiresAt: toLocalDateTime(data.shop.expiresAt),
          category: data.shop.category?._id || '',
          customCategoryName: '',
        });
        setChanged(false);
        fetchReviewHistory();
      })
      .catch(() => toast.error('Failed to load shop'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchShop();
    fetchCategories();
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm({ ...editForm, [name]: type === 'checkbox' ? checked : value });
    setChanged(true);
  };

  const insertPromptVariable = (variable) => {
    setEditForm((current) => ({
      ...current,
      aiPrompt: `${current.aiPrompt || ''}${current.aiPrompt && !/\s$/.test(current.aiPrompt) ? ' ' : ''}${variable}`,
    }));
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
        aiPrompt: selectedCat?.defaultPrompt || selectedCat?.aiPrompt || '',
      });
    } else {
      setShowOtherCategory(false);
      setEditForm({ ...editForm, category: '', customCategoryName: '' });
    }
    setChanged(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...editForm, expiresAt: editForm.expiresAt ? new Date(editForm.expiresAt).toISOString() : null };
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
      const { data: result } = await api.post(`/admin/shops/${id}/regenerate`);
      toast.success(result.message || 'Reviews regenerated');
      fetchShop();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to regenerate');
    }
  };

  const handleGeneratePrompt = async () => {
    if (!editForm.shopName) {
      toast.error('Please enter a shop name first');
      return;
    }
    setGeneratingPrompt(true);
    try {
      const selectedCat = editForm.category ? categories.find((c) => c._id === editForm.category) : (data?.shop?.category || null);
      const { data: result } = await api.post('/admin/categories/generate-prompt', {
        name: selectedCat?.name || '',
        description: selectedCat?.description || '',
        shopName: editForm.shopName,
        businessName: editForm.businessName,
        tone: editForm.reviewTone,
        language: editForm.language,
      });
      setEditForm({ ...editForm, aiPrompt: result.prompt });
      setChanged(true);
      toast.success('AI prompt generated');
    } catch {
      toast.error('Failed to generate prompt');
    } finally {
      setGeneratingPrompt(false);
    }
  };

  const handleResetPassword = async () => {
    setResetting(true);
    try {
      const { data: result } = await api.post(`/admin/shops/${id}/reset-owner-password`, { password: resetPassword });
      setResetResult(result.temporaryPassword);
      setResetPassword('');
      toast.success('Owner password reset');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setResetting(false);
    }
  };

  if (loading || catsLoading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" /></div>;
  }
  if (!data) return <p className="text-center text-red-500">Shop not found.</p>;

  const { shop, stats, tokenUsage, customerDetailsStats } = data;
  const reviewLink = `${window.location.origin}/review/${shop._id}`;
  const reviewsGenerated = tokenUsage?.reviewsGenerated || 0;
  const detailsStats = customerDetailsStats || { totalFilled: 0, byField: {} };

  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/admin/shops" className="text-slate-400 hover:text-slate-600">&larr; Back</Link>
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#17182d]">{shop.shopName}</h2>
            <p className="mt-1 text-sm text-slate-500">{shop.businessName}</p>
          </div>
          {readOnly && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">View only</span>}
        </div>
        {readOnly && <button onClick={() => navigate(`/admin/shops/${id}?mode=edit`)} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">Edit entry</button>}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total reviews" value={stats.totalReviews} tone="indigo" />
        <StatCard label="Available" value={stats.availableReviews} tone="emerald" />
        <StatCard label="Copied" value={stats.usedReviews} tone="orange" />
        <StatCard label="Posted" value={stats.postedReviews || 0} tone="violet" />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="AI generated" value={reviewsGenerated} tone="teal" />
        <StatCard label="API calls" value={tokenUsage?.totalCalls || 0} tone="blue" />
        <StatCard label="Tokens used" value={tokenUsage?.totalTokens?.toLocaleString() || 0} tone="pink" />
        <StatCard label="Valid until" value={shop.expiresAt ? new Date(shop.expiresAt).toLocaleDateString() : 'Unlimited'} tone={shop.expiresAt && new Date(shop.expiresAt) <= new Date() ? 'red' : 'slate'} />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Details filled" value={detailsStats.totalFilled} tone="cyan" />
        <StatCard label="Details pending" value={(stats.usedReviews || 0) - detailsStats.totalFilled} tone="orange" />
      </div>

      <section className="mb-6 rounded-2xl border border-[#e9edf5] bg-white p-6 shadow-[0_8px_28px_rgba(41,45,54,0.05)] md:p-8">
        <h3 className="mb-6 text-lg font-extrabold">Business details</h3>
        <fieldset disabled={readOnly} className="contents">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Business name"><input name="businessName" value={editForm.businessName || ''} onChange={handleChange} className="input" /></Field>
            <Field label="Shop display name"><input name="shopName" value={editForm.shopName || ''} onChange={handleChange} className="input" /></Field>
            <Field label="Contact person"><input name="ownerName" value={editForm.ownerName || ''} onChange={handleChange} className="input" /></Field>
            <Field label="Phone"><input name="phone" value={editForm.phone || ''} onChange={handleChange} className="input" /></Field>
            <div className="md:col-span-2">
              <Field label="Address"><input name="address" value={editForm.address || ''} onChange={handleChange} className="input" /></Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Google review URL"><input name="googleReviewUrl" value={editForm.googleReviewUrl || ''} onChange={handleChange} className="input" /></Field>
            </div>
          </div>
        </fieldset>
      </section>

      <section className="mb-6 rounded-2xl border border-[#e9edf5] bg-white p-6 shadow-[0_8px_28px_rgba(41,45,54,0.05)] md:p-8">
        <h3 className="mb-6 text-lg font-extrabold">Category &amp; review settings</h3>
        <fieldset disabled={readOnly} className="contents">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-bold text-slate-600">Category</label>
              <select
                value={editForm.category ? (showOtherCategory ? 'other' : editForm.category) : (showOtherCategory ? 'other' : '')}
                onChange={handleCategoryChange}
                className="input bg-white"
              >
                <option value="">No category</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
                <option value="other">Other (create new)</option>
              </select>
              {shop.category && (
                <p className="hint">Current: <span className="font-bold text-slate-600">{shop.category.name}</span></p>
              )}
            </div>

            {showOtherCategory && (
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-bold text-slate-600">New category name</label>
                <input name="customCategoryName" value={editForm.customCategoryName || ''} onChange={handleChange} className="input" placeholder="Enter new category name" />
                <p className="hint">A new category will be created with the current settings.</p>
              </div>
            )}

            <Field label="Review tone">
              <select name="reviewTone" value={editForm.reviewTone || 'friendly'} onChange={handleChange} className="input bg-white">
                {TONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Review language">
              <select name="language" value={editForm.language || 'english'} onChange={handleChange} className="input bg-white">
                {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
              <p className="hint">Gujarati shops get Gujarati reviews, Hindi shops get Hindi reviews.</p>
            </Field>

            <Field label="Prompt mode">
              <select name="promptMode" value={editForm.promptMode || 'combine'} onChange={handleChange} className="input bg-white">
                <option value="combine">Merge with default prompt (Recommended)</option>
                <option value="override">Only shop prompt</option>
              </select>
              <p className="hint">Merge: shop prompt + default prompt from Settings both used. Only shop prompt: default is ignored.</p>
            </Field>

            <div className="md:col-span-2">
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-sm font-bold text-slate-600">AI generated prompt</label>
                <button
                  type="button"
                  onClick={handleGeneratePrompt}
                  disabled={generatingPrompt}
                  className="rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  {generatingPrompt ? 'Generating...' : 'Generate with AI'}
                </button>
              </div>
              <textarea name="aiPrompt" value={editForm.aiPrompt || ''} onChange={handleChange} rows={4} className="input resize-y" placeholder="Custom prompt for review generation. Use [SHOP_NAME] for the dynamic shop name." />
              <p className="hint">Empty = uses the general prompt from Settings.</p>
              <PromptVariables onInsert={insertPromptVariable} />
            </div>

            <Field label="Status">
              <select name="isActive" value={editForm.isActive ? 'true' : 'false'} onChange={(e) => { setEditForm({ ...editForm, isActive: e.target.value === 'true' }); setChanged(true); }} className="input bg-white">
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </Field>
            <div className="flex items-center gap-3 rounded-xl bg-[#f8f9fc] p-4">
              <input type="checkbox" name="canOwnerSetTone" checked={editForm.canOwnerSetTone || false} onChange={handleChange} className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500" />
              <div>
                <label className="text-sm font-bold text-slate-600">Allow owner to change tone/language</label>
                <p className="text-xs text-slate-400">Owner can modify review settings if enabled.</p>
              </div>
            </div>
            <Field label="Pool size (queue)">
              <input type="number" name="reviewPoolMin" value={editForm.reviewPoolMin ?? ''} onChange={handleChange} min="10" className="input" />
              <p className="hint">Minimum reviews always in queue.</p>
            </Field>
            <Field label="Generate batch">
              <input type="number" name="reviewBatchSize" value={editForm.reviewBatchSize ?? ''} onChange={handleChange} min="10" className="input" />
              <p className="hint">Reviews generated per refill.</p>
            </Field>
            <Field label="Valid until">
              <input type="datetime-local" name="expiresAt" value={editForm.expiresAt ?? ''} onChange={handleChange} className="input" />
              <p className="hint">After this time, login, QR, and review link deactivate. Clear for unlimited.</p>
            </Field>
          </div>
        </fieldset>
        <div className="mt-6 flex flex-wrap gap-3">
          {!readOnly && <button onClick={handleSave} disabled={saving} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save changes'}</button>}
          {!readOnly && <button onClick={handleRegenerate} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Regenerate reviews</button>}
          {!readOnly && changed && <span className="self-center text-sm text-amber-600">Unsaved changes</span>}
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-[#e9edf5] bg-white p-6 shadow-[0_8px_28px_rgba(41,45,54,0.05)] md:p-8">
        <h3 className="mb-6 text-lg font-extrabold">QR code &amp; link</h3>
        {shop.qrCodeData ? (
          <div className="mb-4 text-center">
            <img src={shop.qrCodeData} alt={`QR Code for ${shop.shopName}`} className="mx-auto h-64 w-64 rounded-xl border-4 border-[#f1f3f9]" />
            <a href={shop.qrCodeData} download={`qrcode-${shop.shopName}.png`} className="mt-2 inline-block text-sm font-bold text-indigo-600 hover:underline">Download QR code</a>
          </div>
        ) : (
          <p className="mb-4 italic text-slate-400">QR code not generated yet.</p>
        )}
        <div>
          <label className="mb-1 block text-sm font-bold text-slate-600">Review page link</label>
          <div className="flex items-center gap-2">
            <input readOnly value={reviewLink} className="input flex-1 bg-slate-50 text-sm" />
            <button onClick={() => { navigator.clipboard.writeText(reviewLink); toast.success('Link copied!'); }} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">Copy</button>
            <a href={reviewLink} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Open</a>
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-[#e9edf5] bg-white p-6 shadow-[0_8px_28px_rgba(41,45,54,0.05)] md:p-8">
        <h3 className="mb-1 text-lg font-extrabold">Customer details form</h3>
        <p className="mb-4 text-sm text-slate-500">Enable fields customers must fill before copying a review. Values appear in the activity table below. <span className="font-bold text-indigo-600">{detailsStats.totalFilled} customers filled details</span></p>
        <fieldset disabled={readOnly} className="contents">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {CUSTOMER_FIELDS.map((field) => {
              const saved = editForm.customerFields?.find((item) => item.key === field.key);
              const enabled = !!saved?.enabled;
              const required = !!saved?.required;
              return (
                <div key={field.key} className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${enabled ? 'border-indigo-200 bg-indigo-50/60' : 'border-slate-200 bg-[#f8f9fc]'}`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => {
                        setEditForm({
                          ...editForm,
                          customerFields: editForm.customerFields.map((item) => item.key === field.key ? { ...item, enabled: e.target.checked, required: e.target.checked && item.required ? true : item.required } : item),
                        });
                        setChanged(true);
                      }}
                      className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-bold text-slate-700">{field.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {enabled && (
                      <>
                        <span className="text-xs font-bold text-slate-500">Required</span>
                        <input
                          type="checkbox"
                          checked={required}
                          onChange={(e) => {
                            setEditForm({
                              ...editForm,
                              customerFields: editForm.customerFields.map((item) => item.key === field.key ? { ...item, required: e.target.checked } : item),
                            });
                            setChanged(true);
                          }}
                          className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        {detailsStats.byField[field.key] > 0 && (
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">{detailsStats.byField[field.key]} filled</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-slate-400">No fields enabled = customers copy reviews directly without filling any details.</p>
        </fieldset>
      </section>

      <section className="mb-6 rounded-2xl border border-[#e9edf5] bg-white p-6 shadow-[0_8px_28px_rgba(41,45,54,0.05)] md:p-8">
        <h3 className="mb-1 text-lg font-extrabold">Owner account</h3>
        <p className="mb-4 text-sm text-slate-500"><span className="font-bold">{shop.owner?.name}</span> &middot; {shop.owner?.email} &middot; created {new Date(shop.createdAt).toLocaleDateString()}</p>
        <div className="rounded-xl bg-[#f8f9fc] p-4">
          <p className="text-sm font-bold text-slate-700">Password access</p>
          <p className="mt-1 text-xs text-slate-400">Old passwords cannot be viewed because they are securely hashed. You can set a new password or generate a temporary one.</p>
          <button onClick={() => { setResetOpen(!resetOpen); setResetResult(''); }} className="mt-3 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50">Reset owner password</button>
          {resetOpen && (
            <div className="mt-3 rounded-xl bg-white p-4">
              <label className="block text-xs font-bold text-slate-600">New password (optional)</label>
              <input type="text" value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} placeholder="Leave blank to generate one" className="input mt-2" />
              <button onClick={handleResetPassword} disabled={resetting} className="mt-3 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50">{resetting ? 'Resetting...' : 'Confirm reset'}</button>
              {resetResult && (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-xs font-bold text-emerald-700">New password (copy it now)</p>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="flex-1 break-all text-sm font-bold text-emerald-900">{resetResult}</code>
                    <button onClick={() => { navigator.clipboard.writeText(resetResult); toast.success('Password copied'); }} className="rounded bg-white px-2 py-1 text-xs font-bold text-emerald-700">Copy</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-[#e9edf5] bg-white p-6 shadow-[0_8px_28px_rgba(41,45,54,0.05)] md:p-8">
        <h3 className="mb-6 text-lg font-extrabold">Review activity ({reviewTotal})</h3>
        {reviewHistory.length === 0 ? (
          <p className="text-sm text-slate-400">No reviews copied yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-3 py-3">Review</th>
                    <th className="px-3 py-3">Customer</th>
                    <th className="px-3 py-3">Copied at</th>
                    <th className="px-3 py-3">Device</th>
                    <th className="px-3 py-3">IP</th>
                    <th className="px-3 py-3 text-center">Posted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reviewHistory.map((r) => {
                    const details = r.customerDetails || {};
                    const detailText = Object.entries(details)
                      .map(([key, value]) => `${(CUSTOMER_FIELDS.find((f) => f.key === key)?.label || key)}: ${value}`)
                      .join(' · ');
                    return (
                      <tr key={r._id} className="hover:bg-slate-50">
                        <td className="max-w-xs truncate px-3 py-4">{r.content}</td>
                        <td className="max-w-[160px] px-3 py-4">
                          {detailText ? <span className="block max-w-[160px] truncate text-xs text-slate-600" title={detailText}>{detailText}</span> : <span className="text-xs text-slate-300">-</span>}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-slate-500">{new Date(r.usedAt).toLocaleString()}</td>
                        <td className="max-w-[120px] truncate px-3 py-4 text-xs text-slate-500">{r.copiedByUA || '-'}</td>
                        <td className="px-3 py-4 font-mono text-xs text-slate-500">{r.copiedByIp || '-'}</td>
                        <td className="px-3 py-4 text-center">
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${r.isPosted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{r.isPosted ? 'Posted' : 'Pending'}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {reviewTotal > 15 && (
              <div className="mt-4 flex justify-center gap-2">
                <button disabled={reviewPage <= 1} onClick={() => fetchReviewHistory(reviewPage - 1)} className="rounded border px-3 py-1 text-sm disabled:opacity-30 hover:bg-slate-50">&laquo; Prev</button>
                <span className="px-3 py-1 text-sm text-slate-500">Page {reviewPage}</span>
                <button disabled={reviewPage * 15 >= reviewTotal} onClick={() => fetchReviewHistory(reviewPage + 1)} className="rounded border px-3 py-1 text-sm disabled:opacity-30 hover:bg-slate-50">Next &raquo;</button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-bold text-slate-600">{label}</label>
      {children}
    </div>
  );
}

function StatCard({ label, value, tone }) {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-700', emerald: 'bg-emerald-50 text-emerald-700',
    orange: 'bg-orange-50 text-orange-700', violet: 'bg-violet-50 text-violet-700',
    teal: 'bg-teal-50 text-teal-700', blue: 'bg-blue-50 text-blue-700',
    pink: 'bg-pink-50 text-pink-700', slate: 'bg-slate-100 text-slate-700',
    red: 'bg-red-50 text-red-700', cyan: 'bg-cyan-50 text-cyan-700',
  };
  return (
    <div className={`rounded-2xl border border-[#e9edf5] p-5 shadow-[0_8px_28px_rgba(41,45,54,0.045)] ${tones[tone] || tones.slate}`}>
      <p className="text-xs font-bold uppercase tracking-wider opacity-75">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
    </div>
  );
}