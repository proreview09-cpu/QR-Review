import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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

const VALIDITY_OPTIONS = [
  { value: 7, label: '7 days' },
  { value: 15, label: '15 days' },
  { value: 30, label: '30 days' },
  { value: 60, label: '60 days' },
  { value: 90, label: '90 days' },
  { value: 365, label: '1 year' },
  { value: 0, label: 'Unlimited' },
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

const emptyForm = () => ({
  ownerEmail: '', ownerName: '', ownerPassword: '',
  businessName: '', shopName: '', address: '', phone: '',
  googleReviewUrl: '', reviewTone: 'friendly', language: 'english',
  canOwnerSetTone: false, validityDays: 30, reviewPoolMin: 50, reviewBatchSize: 50,
  category: '', customCategoryName: '', aiPrompt: '', promptMode: 'combine',
  customerFields: CUSTOMER_FIELDS.map((field) => ({ ...field, enabled: false, required: false })),
});

export default function AddShop() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [catsLoading, setCatsLoading] = useState(true);
  const [showOtherCategory, setShowOtherCategory] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [result, setResult] = useState(null);
  const [generatingPrompt, setGeneratingPrompt] = useState(false);

  const fetchCategories = () => {
    api.get('/admin/categories?activeOnly=true')
      .then(({ data }) => setCategories(data.categories))
      .catch(() => toast.error('Failed to load categories'))
      .finally(() => setCatsLoading(false));
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };

  const insertPromptVariable = (variable) => {
    setForm((current) => ({
      ...current,
      aiPrompt: `${current.aiPrompt || ''}${current.aiPrompt && !/\s$/.test(current.aiPrompt) ? ' ' : ''}${variable}`,
    }));
  };

  const handleCategoryChange = (e) => {
    const value = e.target.value;
    if (value === 'other') {
      setShowOtherCategory(true);
      setForm({ ...form, category: '', customCategoryName: '' });
    } else {
      setShowOtherCategory(false);
      const selectedCat = categories.find((c) => c._id === value);
      setForm({
        ...form,
        category: value,
        customCategoryName: '',
        reviewTone: selectedCat?.defaultTone || 'friendly',
        language: selectedCat?.defaultLanguage || 'english',
        reviewPoolMin: selectedCat?.reviewPoolMin || 50,
        reviewBatchSize: selectedCat?.reviewBatchSize || 50,
        aiPrompt: selectedCat?.defaultPrompt || selectedCat?.aiPrompt || '',
      });
    }
  };

  const handleGeneratePrompt = async () => {
    if (!form.shopName.trim()) {
      toast.error('Please enter a shop name first');
      return;
    }
    setGeneratingPrompt(true);
    try {
      const selectedCat = form.category ? categories.find((c) => c._id === form.category) : null;
      const { data } = await api.post('/admin/categories/generate-prompt', {
        name: selectedCat?.name || form.customCategoryName || '',
        description: selectedCat?.description || '',
        shopName: form.shopName,
        businessName: form.businessName,
        tone: form.reviewTone,
        language: form.language,
      });
      setForm({ ...form, aiPrompt: data.prompt });
      toast.success('AI prompt generated');
    } catch {
      toast.error('Failed to generate prompt');
    } finally {
      setGeneratingPrompt(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form };
      if (!payload.category && payload.customCategoryName) {
        const { data: catData } = await api.post('/admin/categories', {
          name: payload.customCategoryName,
          description: '',
          defaultTone: payload.reviewTone,
          defaultLanguage: payload.language,
          isActive: true,
        });
        payload.category = catData.category._id;
      }
      delete payload.customCategoryName;
      const { data } = await api.post('/admin/shops', payload);
      toast.success('Shop created successfully!');
      setResult(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create shop');
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="mx-auto max-w-[1180px]">
        <div className="mb-8"><p className="mb-2 text-sm font-semibold text-indigo-600">Setup complete</p><h2 className="text-3xl font-extrabold tracking-tight">Shop created</h2></div>
        <div className="max-w-2xl rounded-2xl border border-[#e9edf5] bg-white p-8 shadow-[0_8px_28px_rgba(41,45,54,0.05)]">
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="font-bold text-emerald-800">Shop created successfully!</p>
          </div>
          <div className="mb-4">
            <p className="mb-1 text-sm text-slate-500">Review link</p>
            <div className="flex items-center gap-2">
              <input readOnly value={result.reviewLink} className="input flex-1 bg-slate-50 text-sm" />
              <button onClick={() => { navigator.clipboard.writeText(result.reviewLink); toast.success('Link copied!'); }}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">Copy</button>
            </div>
          </div>
          {result.warnings?.length > 0 && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
              {result.warnings.map((w, i) => <p key={i} className="text-sm text-amber-800">{w}</p>)}
            </div>
          )}
          <div className="flex gap-3">
            <Link to={`/admin/shops/${result.shop._id}`} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">View shop</Link>
            <button onClick={() => { setResult(null); setForm(emptyForm()); setShowOtherCategory(false); }}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Add another</button>
          </div>
        </div>
      </div>
    );
  }

  if (catsLoading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" /></div>;
  }

  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div><p className="mb-2 text-sm font-semibold text-indigo-600">Business setup</p><h2 className="text-3xl font-extrabold tracking-tight">Add new business</h2><p className="mt-2 text-sm text-slate-500">Create the shop, its owner account, review preferences, and QR code.</p></div>
        <button onClick={() => navigate('/admin/shops')} className="rounded-xl border border-[#e9edf5] bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50">Back to businesses</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-2xl border border-[#e9edf5] bg-white p-6 shadow-[0_8px_28px_rgba(41,45,54,0.05)] md:p-8">
          <h3 className="mb-1 text-lg font-extrabold">Owner details</h3>
          <p className="mb-6 text-xs text-slate-400">Account used by the business owner to see review stats.</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Owner name" hint="Full name of the person using this account.">
              <input name="ownerName" value={form.ownerName} onChange={handleChange} required className="input" placeholder="Rajesh Patel" />
            </Field>
            <Field label="Owner email" hint="Used for shop-owner login.">
              <input name="ownerEmail" type="email" value={form.ownerEmail} onChange={handleChange} required className="input" placeholder="owner@example.com" />
            </Field>
            <Field label="Password" hint="Leave empty for the default password.">
              <input name="ownerPassword" type="password" value={form.ownerPassword} onChange={handleChange} className="input" placeholder="Optional password" />
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-[#e9edf5] bg-white p-6 shadow-[0_8px_28px_rgba(41,45,54,0.05)] md:p-8">
          <h3 className="mb-1 text-lg font-extrabold">Business details</h3>
          <p className="mb-6 text-xs text-slate-400">Information shown on the customer review page and used by AI to write reviews.</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Business name" hint="Exact name shown on Google Business Profile.">
              <input name="businessName" value={form.businessName} onChange={handleChange} required className="input" placeholder="ABC Stores Pvt Ltd" />
            </Field>
            <Field label="Shop display name" hint="Name customers see on the review page.">
              <input name="shopName" value={form.shopName} onChange={handleChange} required className="input" placeholder="ABC Stores" />
            </Field>
            <Field label="Phone" hint="Optional contact number.">
              <input name="phone" value={form.phone} onChange={handleChange} className="input" placeholder="+91 9876543210" />
            </Field>
            <div className="md:col-span-2">
              <Field label="Address" hint="Optional shop address.">
                <input name="address" value={form.address} onChange={handleChange} className="input" placeholder="Shop 12, ABC Complex, Main Road, City" />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Google review URL" hint="Google Business Profile &gt; Ask for reviews &gt; Copy link.">
                <input name="googleReviewUrl" value={form.googleReviewUrl} onChange={handleChange} required className="input" placeholder="https://search.google.com/local/writereview?placeid=..." />
              </Field>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#e9edf5] bg-white p-6 shadow-[0_8px_28px_rgba(41,45,54,0.05)] md:p-8">
          <h3 className="mb-1 text-lg font-extrabold">Category &amp; review settings</h3>
          <p className="mb-6 text-xs text-slate-400">Category defaults fill in tone, language, pool size, and prompt automatically.</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-bold text-slate-600">Category</label>
              <select value={form.category ? form.category : 'other'} onChange={handleCategoryChange} className="input bg-white">
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
                <option value="other">Other (create new)</option>
              </select>
            </div>

            {showOtherCategory && (
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-bold text-slate-600">New category name</label>
                <input name="customCategoryName" value={form.customCategoryName} onChange={handleChange} className="input" placeholder="Enter new category name" />
                <p className="hint">A new category will be created automatically with the current tone/language settings.</p>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-600">Review tone</label>
              <select name="reviewTone" value={form.reviewTone} onChange={handleChange} className="input bg-white">
                {TONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-600">Review language</label>
              <select name="language" value={form.language} onChange={handleChange} className="input bg-white">
                {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
              <p className="hint">Gujarati shops get Gujarati reviews, Hindi shops get Hindi reviews.</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-600">Prompt mode</label>
              <select name="promptMode" value={form.promptMode} onChange={handleChange} className="input bg-white">
                <option value="combine">Merge with default prompt (Recommended)</option>
                <option value="override">Only shop prompt</option>
              </select>
              <p className="hint">Merge: shop prompt + default prompt from Settings both used. Only shop prompt: default is ignored.</p>
            </div>

            <div className="md:col-span-2">
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-sm font-bold text-slate-600">AI generated prompt</label>
                <button
                  type="button"
                  onClick={handleGeneratePrompt}
                  disabled={generatingPrompt || !form.shopName.trim()}
                  className="rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  {generatingPrompt ? 'Generating...' : 'Generate with AI'}
                </button>
              </div>
              <textarea name="aiPrompt" value={form.aiPrompt} onChange={handleChange} rows={4} className="input resize-y" placeholder="Custom prompt for this shop. Use [SHOP_NAME] as placeholder for the shop name." />
              <p className="hint">Optional. Uses category default prompt if left empty. Use <code className="rounded bg-slate-100 px-1">[SHOP_NAME]</code> for the dynamic shop name.</p>
              <PromptVariables onInsert={insertPromptVariable} />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-600">Account validity</label>
              <select name="validityDays" value={form.validityDays} onChange={handleChange} className="input bg-white">
                {VALIDITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <p className="hint">After expiry, owner login, QR, and review link deactivate.</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-600">Review pool size</label>
              <input type="number" name="reviewPoolMin" value={form.reviewPoolMin} onChange={handleChange} min="10" max="500" className="input" />
              <p className="hint">Minimum reviews always available in the queue.</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-600">Generate batch size</label>
              <input type="number" name="reviewBatchSize" value={form.reviewBatchSize} onChange={handleChange} min="10" max="200" className="input" />
              <p className="hint">How many reviews to generate at once.</p>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-[#f8f9fc] p-4">
              <input type="checkbox" name="canOwnerSetTone" checked={form.canOwnerSetTone} onChange={handleChange} className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500" />
              <div>
                <label className="text-sm font-bold text-slate-600">Allow owner to change tone/language</label>
                <p className="text-xs text-slate-400">If unchecked, only admin can modify review tone &amp; language.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#e9edf5] bg-white p-6 shadow-[0_8px_28px_rgba(41,45,54,0.05)] md:p-8">
          <h3 className="mb-1 text-lg font-extrabold">Customer details form</h3>
          <p className="mb-6 text-xs text-slate-400">Enable fields customers must fill before copying a review. Values appear in the admin activity table. Can be changed later.</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {CUSTOMER_FIELDS.map((field) => {
              const saved = form.customerFields.find((item) => item.key === field.key);
              return (
                <div key={field.key} className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${saved?.enabled ? 'border-indigo-200 bg-indigo-50/60' : 'border-slate-200 bg-[#f8f9fc]'}`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={saved?.enabled || false}
                      onChange={(e) => {
                        setForm({
                          ...form,
                          customerFields: form.customerFields.map((item) => item.key === field.key ? { ...item, enabled: e.target.checked, required: e.target.checked && item.required ? true : item.required } : item),
                        });
                      }}
                      className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-bold text-slate-700">{field.label}</span>
                  </div>
                  {saved?.enabled && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">Required</span>
                      <input
                        type="checkbox"
                        checked={saved?.required || false}
                        onChange={(e) => {
                          setForm({
                            ...form,
                            customerFields: form.customerFields.map((item) => item.key === field.key ? { ...item, required: e.target.checked } : item),
                          });
                        }}
                        className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <button type="submit" disabled={loading}
          className="w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-500 py-4 text-sm font-extrabold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 disabled:opacity-50">
          {loading ? 'Creating shop...' : 'Create shop'}
        </button>
      </form>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-bold text-slate-600">{label}</label>
      {children}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}