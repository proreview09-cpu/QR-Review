import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import PromptVariables from '../../components/PromptVariables';

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI', help: 'GPT-4o mini' },
  { value: 'gemini', label: 'Google Gemini', help: 'Gemini 1.5 Flash' },
  { value: 'anthropic', label: 'Anthropic Claude', help: 'Claude 3.5 Haiku' },
  { value: 'groq', label: 'Groq', help: 'Llama 3.1 Instant' },
];

const newProvider = () => ({ provider: 'openai', apiKey: '', enabled: true });

export default function Settings() {
  const [aiProviders, setAIProviders] = useState([]);
  const [defaultTone, setDefaultTone] = useState('friendly');
  const [defaultLanguage, setDefaultLanguage] = useState('english');
  const [generalReviewPrompt, setGeneralReviewPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/admin/settings').then(({ data }) => {
      setAIProviders(data.aiProviders?.length ? data.aiProviders : (data.openaiApiKey ? [{ provider: 'openai', apiKey: data.openaiApiKey, enabled: true }] : []));
      setDefaultTone(data.defaultTone || 'friendly');
      setDefaultLanguage(data.defaultLanguage || 'english');
      setGeneralReviewPrompt(data.generalReviewPrompt || '');
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const updateProvider = (index, field, value) => {
    setAIProviders((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  };

  const moveProvider = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= aiProviders.length) return;
    const next = [...aiProviders];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setAIProviders(next);
  };

  const insertPromptVariable = (variable) => {
    setGeneralReviewPrompt((current) => `${current}${current && !/\s$/.test(current) ? ' ' : ''}${variable}`);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/admin/settings', { aiProviders, defaultTone, defaultLanguage, generalReviewPrompt });
      toast.success('Settings saved');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold mb-6">Settings</h2>
      <form onSubmit={handleSave} className="bg-white rounded-lg shadow p-6 space-y-6">
        <section>
          <h3 className="text-lg font-semibold mb-1">AI Providers</h3>
          <p className="text-sm text-gray-500 mb-4">Providers run from top to bottom. If one key has no credits or fails, the next enabled provider is tried automatically. The first successful provider stops the chain.</p>

          <div className="space-y-3">
            {aiProviders.map((item, index) => (
              <div key={`${item.provider}-${index}`} className="border rounded-lg p-4 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-[180px_1fr_auto] gap-3 items-end">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Provider</label>
                    <select value={item.provider} onChange={(e) => updateProvider(index, 'provider', e.target.value)} className="input bg-white">
                      {PROVIDERS.map((provider) => <option key={provider.value} value={provider.value}>{provider.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">API Key</label>
                    <input type="password" value={item.apiKey} onChange={(e) => updateProvider(index, 'apiKey', e.target.value)} className="input" placeholder="Paste provider API key" />
                  </div>
                  <div className="flex items-center gap-2 pb-1">
                    <label className="flex items-center gap-1 text-xs text-gray-600">
                      <input type="checkbox" checked={item.enabled !== false} onChange={(e) => updateProvider(index, 'enabled', e.target.checked)} /> Enabled
                    </label>
                    <button type="button" onClick={() => moveProvider(index, -1)} disabled={index === 0} className="px-2 py-1 border rounded disabled:opacity-30">Up</button>
                    <button type="button" onClick={() => moveProvider(index, 1)} disabled={index === aiProviders.length - 1} className="px-2 py-1 border rounded disabled:opacity-30">Down</button>
                    <button type="button" onClick={() => setAIProviders((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="px-2 py-1 text-red-600 border border-red-200 rounded">Remove</button>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">Default model: {PROVIDERS.find((provider) => provider.value === item.provider)?.help}</p>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setAIProviders((current) => [...current, newProvider()])} className="mt-3 px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50">
            + Add AI Provider
          </button>
        </section>

        <section>
          <h3 className="text-lg font-semibold mb-3">Default Review Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Review Tone</label>
              <select value={defaultTone} onChange={(e) => setDefaultTone(e.target.value)} className="input bg-white">
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="casual">Casual</option>
                <option value="enthusiastic">Enthusiastic</option>
                <option value="grateful">Grateful</option>
                <option value="humorous">Humorous</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Review Language</label>
              <select value={defaultLanguage} onChange={(e) => setDefaultLanguage(e.target.value)} className="input bg-white">
                <option value="english">English</option>
                <option value="gujarati">Gujarati</option>
                <option value="hindi">Hindi</option>
              </select>
            </div>
          </div>
        </section>

        <section>
          <label className="block text-sm font-medium text-gray-700 mb-1">General Review Prompt</label>
          <textarea value={generalReviewPrompt} onChange={(e) => setGeneralReviewPrompt(e.target.value)} rows="6" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-y" placeholder="Write general instructions for every shop." />
          <p className="hint">Used by every shop in General or Combine mode.</p>
          <PromptVariables onInsert={insertPromptVariable} />
        </section>

        <button type="submit" disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
