import { useState, useEffect, useRef } from 'react';
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

const blankForm = {
  name: '', description: '', defaultPrompt: '', defaultTone: 'friendly',
  defaultLanguage: 'english', isActive: true, reviewPoolMin: 50, reviewBatchSize: 50,
};

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...blankForm });
  const [saving, setSaving] = useState(false);
  const [generatingPrompt, setGeneratingPrompt] = useState(false);
  const fileInputRef = useRef(null);

  const fetchCategories = () => {
    api.get('/admin/categories')
      .then(({ data }) => setCategories(data.categories))
      .catch(() => toast.error('Failed to load categories'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };

  const resetForm = () => {
    setForm({ ...blankForm });
    setEditing(null);
  };

  const handleEdit = (category) => {
    setForm({
      name: category.name, description: category.description || '',
      defaultPrompt: category.defaultPrompt || category.aiPrompt || '',
      defaultTone: category.defaultTone || 'friendly',
      defaultLanguage: category.defaultLanguage || 'english',
      isActive: category.isActive, reviewPoolMin: category.reviewPoolMin || 50,
      reviewBatchSize: category.reviewBatchSize || 50,
    });
    setEditing(category);
  };

  const handleAddNew = () => {
    setForm({ ...blankForm });
    setEditing(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, aiPrompt: form.defaultPrompt };
      if (editing) {
        await api.put(`/admin/categories/${editing._id}`, payload);
        toast.success('Category updated');
      } else {
        await api.post('/admin/categories', payload);
        toast.success('Category created');
      }
      setEditing(null);
      setForm({ ...blankForm });
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure? This will not affect existing shops.')) return;
    try {
      await api.delete(`/admin/categories/${id}`);
      toast.success('Category deleted');
      fetchCategories();
    } catch {
      toast.error('Failed to delete category');
    }
  };

  const handleDownloadTemplate = () => {
    window.open('/api/admin/categories/template', '_blank');
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await api.post('/admin/categories/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(`Upload complete: ${data.created} created, ${data.updated} updated`);
      fetchCategories();
    } catch {
      toast.error('Upload failed');
    } finally {
      e.target.value = null;
    }
  };

  const handleGeneratePrompt = async () => {
    if (!form.name.trim()) {
      toast.error('Please enter a category name first');
      return;
    }
    setGeneratingPrompt(true);
    try {
      const { data } = await api.post('/admin/categories/generate-prompt', {
        name: form.name,
        description: form.description,
        tone: form.defaultTone,
        language: form.defaultLanguage,
      });
      setForm({ ...form, defaultPrompt: data.prompt });
      toast.success('AI prompt generated');
    } catch {
      toast.error('Failed to generate prompt');
    } finally {
      setGeneratingPrompt(false);
    }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" /></div>;
  }

  return (
    <div className="mx-auto max-w-[1480px]">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-sm font-semibold text-indigo-600">Review categories</p>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#17182d]">Category master</h2>
          <p className="mt-2 text-sm text-slate-500">Each category can carry default tone, language, pool settings, and an AI prompt applied to new shops.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleDownloadTemplate} className="rounded-xl border border-[#e9edf5] bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50">Download Excel template</button>
          <label className="cursor-pointer rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700">
            Upload Excel
            <input type="file" accept=".xlsx,.xls" ref={fileInputRef} onChange={handleUpload} className="hidden" />
          </label>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.4fr]">
        <section className="h-fit rounded-2xl border border-[#e9edf5] bg-white p-6 shadow-[0_8px_28px_rgba(41,45,54,0.05)] md:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-extrabold">{editing ? `Edit: ${editing.name}` : 'Add new category'}</h3>
              <p className="mt-1 text-xs text-slate-400">Defaults are applied when creating shops.</p>
            </div>
            {!editing && (
              <button onClick={handleAddNew} className="rounded-xl border border-[#e9edf5] px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">+ New</button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-600">Category name *</label>
                <input name="name" value={form.name} onChange={handleChange} required className="input" placeholder="e.g., Restaurant, Medical, Retail" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-600">Description</label>
                <input name="description" value={form.description} onChange={handleChange} className="input" placeholder="Brief description of this category" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-600">Default tone</label>
                <select name="defaultTone" value={form.defaultTone} onChange={handleChange} className="input bg-white">
                  {TONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-600">Default language</label>
                <select name="defaultLanguage" value={form.defaultLanguage} onChange={handleChange} className="input bg-white">
                  {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-600">AI generated prompt</label>
              <textarea name="defaultPrompt" value={form.defaultPrompt} onChange={handleChange} rows={3} className="input resize-y" placeholder="Custom prompt for review generation. Use [SHOP_NAME] as placeholder." />
              <p className="hint">Use <code className="rounded bg-slate-100 px-1">[SHOP_NAME]</code> to reference the shop name dynamically. Leave empty to use the general prompt.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={handleGeneratePrompt} disabled={generatingPrompt || !form.name.trim()} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50">
                {generatingPrompt ? 'Generating...' : 'Generate with AI'}
              </button>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500" />
                Active
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-600">Review pool size</label>
                <input type="number" name="reviewPoolMin" value={form.reviewPoolMin} onChange={handleChange} min="10" className="input" />
                <p className="hint">Min reviews always available in queue.</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-600">Generate batch size</label>
                <input type="number" name="reviewBatchSize" value={form.reviewBatchSize} onChange={handleChange} min="10" className="input" />
                <p className="hint">Reviews per generation batch.</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Saving...' : editing ? 'Update category' : 'Create category'}
              </button>
              {editing && (
                <button type="button" onClick={resetForm} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
              )}
            </div>
          </form>
        </section>

        <section className="h-fit rounded-2xl border border-[#e9edf5] bg-white p-6 shadow-[0_8px_28px_rgba(41,45,54,0.05)] md:p-8">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-extrabold">All categories</h3>
              <p className="mt-1 text-xs text-slate-400">{categories.length} total</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-3">Name</th>
                  <th className="px-3 py-3">Tone / Lang</th>
                  <th className="px-3 py-3">Prompt</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((cat) => (
                  <tr key={cat._id} className="transition hover:bg-slate-50">
                    <td className="px-3 py-4">
                      <p className="font-bold text-slate-700">{cat.name}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{cat.description || '-'}</p>
                    </td>
                    <td className="px-3 py-4 text-xs capitalize text-slate-500">
                      {cat.defaultTone || 'friendly'} / {cat.defaultLanguage || 'english'}
                    </td>
                    <td className="max-w-[220px] truncate px-3 py-4 text-xs text-slate-500">
                      {cat.defaultPrompt || cat.aiPrompt ? <span title={cat.defaultPrompt || cat.aiPrompt}>{(cat.defaultPrompt || cat.aiPrompt).length > 60 ? (cat.defaultPrompt || cat.aiPrompt).substring(0, 60) + '...' : (cat.defaultPrompt || cat.aiPrompt)}</span> : <span className="italic text-slate-300">Using default</span>}
                    </td>
                    <td className="px-3 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${cat.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{cat.isActive ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="px-3 py-4 text-right">
                      <button onClick={() => handleEdit(cat)} className="text-sm font-bold text-indigo-600 hover:underline">Edit</button>
                      <button onClick={() => handleDelete(cat._id)} className="ml-3 text-sm font-bold text-red-600 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-10 text-center text-slate-400">No categories yet. Add manually or download the template, fill it, and upload.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}