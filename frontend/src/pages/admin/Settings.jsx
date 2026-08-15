import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function Settings() {
  const [openaiKey, setOpenaiKey] = useState('');
  const [defaultTone, setDefaultTone] = useState('friendly');
  const [defaultLanguage, setDefaultLanguage] = useState('english');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/admin/settings').then(({ data }) => {
      setOpenaiKey(data.openaiApiKey || '');
      setDefaultTone(data.defaultTone || 'friendly');
      setDefaultLanguage(data.defaultLanguage || 'english');
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/admin/settings', { openaiApiKey: openaiKey, defaultTone, defaultLanguage });
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-6">Settings</h2>
      <form onSubmit={handleSave} className="bg-white rounded-lg shadow p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">OpenAI API Key</label>
          <input
            type="password"
            value={openaiKey}
            onChange={(e) => setOpenaiKey(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="sk-..."
          />
          <p className="text-xs text-gray-400 mt-1">Used to generate AI-powered reviews via ChatGPT</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Default Review Tone</label>
          <select
            value={defaultTone}
            onChange={(e) => setDefaultTone(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="professional">Professional</option>
            <option value="friendly">Friendly</option>
            <option value="casual">Casual</option>
            <option value="enthusiastic">Enthusiastic</option>
            <option value="grateful">Grateful</option>
            <option value="humorous">Humorous</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">Default tone for all new shops</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Default Review Language</label>
          <select
            value={defaultLanguage}
            onChange={(e) => setDefaultLanguage(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="english">English</option>
            <option value="gujarati">Gujarati</option>
            <option value="hindi">Hindi</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">All AI reviews will be generated in this language</p>
        </div>

        <button type="submit" disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
