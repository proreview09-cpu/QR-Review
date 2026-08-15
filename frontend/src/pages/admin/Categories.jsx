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
    setForm({ ...category });
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
      if (editing) {
        await api.put(`/admin/categories/${editing._id}`, form);
        toast.success('Category updated');
      } else {
        await api.post('/admin/categories', form);
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
    window.open('/api/admin/categories/template/download', '_blank');
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await api.post('/admin/categories/upload', formData, {
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
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold">Category Master</h2>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
          >
            Download Excel Template
          </button>
          <label className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer text-sm transition-colors">
            Upload Excel
            <input
              type="file"
              accept=".xlsx,.xls"
              ref={fileInputRef}
              onChange={handleUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        Manage review categories. Each category can have default tone, language, and an AI-generated prompt.
        These defaults are applied when creating new shops under that category.
      </p>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{editing ? `Edit: ${editing.name}` : 'Add New Category'}</h3>
          {!editing && (
            <button
              onClick={handleAddNew}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              + New Category
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category Name *</label>
              <input
                name="name" value={form.name} onChange={handleChange} required
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g., Restaurant, Medical, Retail"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                name="description" value={form.description} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Brief description of this category"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Tone</label>
              <select name="defaultTone" value={form.defaultTone} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                {TONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Language</label>
              <select name="defaultLanguage" value={form.defaultLanguage} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">AI Generated Prompt</label>
            <textarea
              name="defaultPrompt" value={form.defaultPrompt} onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              rows={3}
              placeholder="Custom prompt for review generation. Use [SHOP_NAME] as placeholder."
            />
            <p className="text-xs text-gray-400 mt-1">
              Use <code className="bg-gray-100 px-1 rounded">[SHOP_NAME]</code> to reference the shop name dynamically.
              Leave empty to use the default system prompt.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleGeneratePrompt}
              disabled={generatingPrompt || !form.name.trim()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {generatingPrompt ? 'Generating...' : 'Generate AI Prompt'}
            </button>
            <label className="flex items-center gap-2">
              <input
                type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Active</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Review Pool Size</label>
              <input
                type="number" name="reviewPoolMin" value={form.reviewPoolMin} onChange={handleChange} min="10"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">Min reviews always available in queue</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Generate Batch Size</label>
              <input
                type="number" name="reviewBatchSize" value={form.reviewBatchSize} onChange={handleChange} min="10"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">Reviews per generation batch</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit" disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : editing ? 'Update Category' : 'Create Category'}
            </button>
            {editing && (
              <button
                type="button" onClick={resetForm}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Name</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Description</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Default Tone</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Default Language</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Prompt</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Status</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {categories.map((cat) => (
              <tr key={cat._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{cat.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{cat.description || '-'}</td>
                <td className="px-6 py-4 text-sm capitalize">{cat.defaultTone}</td>
                <td className="px-6 py-4 text-sm capitalize">{cat.defaultLanguage}</td>
                <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                  {cat.defaultPrompt ? (cat.defaultPrompt.length > 60 ? cat.defaultPrompt.substring(0, 60) + '...' : cat.defaultPrompt) : <span className="text-gray-400 italic">Using default</span>}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${cat.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {cat.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 space-x-2">
                  <button
                    onClick={() => handleEdit(cat)}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(cat._id)}
                    className="text-red-600 hover:underline text-sm"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  No categories yet. Download the template, fill it, and upload, or add manually.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
