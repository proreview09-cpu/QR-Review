import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const fileRef = useRef(null);

  const load = () => api.get('/admin/categories').then(({ data }) => setCategories(data.categories)).catch(console.error).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const create = async (event) => {
    event.preventDefault();
    try { await api.post('/admin/categories', { name, description }); toast.success('Category added'); setName(''); setDescription(''); load(); }
    catch (error) { toast.error(error.response?.data?.message || 'Could not add category'); }
  };

  const importExcel = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const body = new FormData(); body.append('file', file);
    try { const { data } = await api.post('/admin/categories/import', body, { headers: { 'Content-Type': 'multipart/form-data' } }); toast.success(data.message); load(); }
    catch (error) { toast.error(error.response?.data?.message || 'Excel import failed'); }
    event.target.value = '';
  };

  const disable = async (id) => { try { await api.delete(`/admin/categories/${id}`); toast.success('Category disabled'); load(); } catch { toast.error('Could not disable category'); } };

  return <div className="max-w-4xl"><div className="mb-6 flex items-end justify-between"><div><h2 className="text-2xl font-bold">Category Master</h2><p className="mt-1 text-sm text-gray-500">Manage categories used for shop-specific AI prompts.</p></div><div className="flex gap-2"><a href="/api/admin/categories/template" className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-bold text-blue-700">Download Excel template</a><button onClick={() => fileRef.current?.click()} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white">Upload Excel</button><input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={importExcel} /></div></div>
    <div className="mb-6 rounded-lg bg-white p-6 shadow"><h3 className="mb-4 text-lg font-semibold">Add category manually</h3><form onSubmit={create} className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1.5fr_auto]"><input value={name} onChange={(e) => setName(e.target.value)} required className="input" placeholder="Category name" /><input value={description} onChange={(e) => setDescription(e.target.value)} className="input" placeholder="Description (optional)" /><button className="rounded-lg bg-indigo-600 px-5 py-2 font-bold text-white">Add</button></form></div>
    <div className="rounded-lg bg-white shadow"><div className="border-b p-5"><h3 className="font-semibold">Categories ({categories.length})</h3></div>{loading ? <p className="p-6 text-gray-400">Loading...</p> : <div className="divide-y">{categories.map((category) => <div key={category._id} className="flex items-center justify-between p-4"><div><p className="font-semibold text-gray-800">{category.name}</p><p className="text-xs text-gray-400">{category.description || 'No description'}</p></div>{category.name !== 'Other' && <button onClick={() => disable(category._id)} className="text-sm font-semibold text-red-600">Disable</button>}</div>)}{!categories.length && <p className="p-6 text-center text-gray-400">No categories yet.</p>}</div>}</div>
  </div>;
}
