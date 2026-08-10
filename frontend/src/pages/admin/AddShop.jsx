import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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

export default function AddShop() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    ownerEmail: '', ownerName: '', ownerPassword: '',
    businessName: '', shopName: '', address: '', phone: '',
    googleReviewUrl: '', reviewTone: 'friendly', language: 'english',
    canOwnerSetTone: false, reviewPoolMin: 50, reviewBatchSize: 50,
  });
  const [result, setResult] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/admin/shops', form);
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
      <div>
        <h2 className="text-2xl font-bold mb-6">Shop Created</h2>
        <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800 font-medium">Shop created successfully!</p>
          </div>
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-1">Review Link</p>
            <div className="flex items-center gap-2">
              <input readOnly value={result.reviewLink} className="flex-1 px-3 py-2 border rounded-lg bg-gray-50 text-sm" />
              <button onClick={() => { navigator.clipboard.writeText(result.reviewLink); toast.success('Link copied!'); }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Copy</button>
            </div>
          </div>
          <div className="flex gap-3">
            <Link to={`/admin/shops/${result.shop._id}`} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">View Shop</Link>
            <button onClick={() => { setResult(null); setForm({ ownerEmail: '', ownerName: '', ownerPassword: '', businessName: '', shopName: '', address: '', phone: '', googleReviewUrl: '', reviewTone: 'friendly', language: 'english', canOwnerSetTone: false }); }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Add Another</button>
          </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Review Pool Size</label>
              <input type="number" name="reviewPoolMin" value={form.reviewPoolMin} onChange={handleChange} min="10" max="500"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              <p className="text-xs text-gray-400 mt-1">Min reviews always available in queue</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Generate Batch Size</label>
              <input type="number" name="reviewBatchSize" value={form.reviewBatchSize} onChange={handleChange} min="10" max="200"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              <p className="text-xs text-gray-400 mt-1">How many reviews to generate at once</p>
            </div>
          </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-6">Add New Shop</h2>
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-3 border-b pb-2">Owner Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name *</label>
              <input name="ownerName" value={form.ownerName} onChange={handleChange} required
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Owner Email *</label>
              <input name="ownerEmail" type="email" value={form.ownerEmail} onChange={handleChange} required
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input name="ownerPassword" type="password" value={form.ownerPassword} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Leave empty for default" />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3 border-b pb-2">Business Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
              <input name="businessName" value={form.businessName} onChange={handleChange} required
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="ABC Stores Pvt Ltd" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shop Display Name *</label>
              <input name="shopName" value={form.shopName} onChange={handleChange} required
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="ABC Stores" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input name="phone" value={form.phone} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="+91 9876543210" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input name="address" value={form.address} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Shop 12, ABC Complex, Main Road, City" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Google Review URL *</label>
              <input name="googleReviewUrl" value={form.googleReviewUrl} onChange={handleChange} required
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="https://search.google.com/local/writereview?placeid=..." />
              <p className="text-xs text-gray-400 mt-1">Google Business Profile &gt; Ask for reviews &gt; Copy link</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3 border-b pb-2">Review Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Review Tone</label>
              <select name="reviewTone" value={form.reviewTone} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                {TONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Review Language</label>
              <select name="language" value={form.language} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div className="md:col-span-2 flex items-center gap-3 bg-gray-50 rounded-lg p-3">
              <input type="checkbox" name="canOwnerSetTone" checked={form.canOwnerSetTone} onChange={handleChange}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
              <div>
                <label className="text-sm font-medium text-gray-700">Allow owner to change tone/language</label>
                <p className="text-xs text-gray-400">If unchecked, only admin can modify review tone &amp; language</p>
              </div>
            </div>
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {loading ? 'Creating...' : 'Create Shop'}
        </button>
      </form>
    </div>
  );
}
