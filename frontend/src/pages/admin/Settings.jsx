import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import PromptVariables from '../../components/PromptVariables';

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI', help: 'GPT-4o mini' },
  { value: 'gemini', label: 'Google Gemini', help: 'Auto-select supported model' },
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
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null);

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

  const handleCheck = async () => {
    setChecking(true);
    setCheckResult(null);
    try {
      const { data } = await api.post('/admin/ai-status/check');
      setCheckResult(data);
      if (data.currentProvider) {
        toast.success(`AI check done - ${data.currentProvider}`);
      } else {
        toast.error('No AI provider is working right now');
      }
    } catch {
      toast.error('Failed to check AI providers');
    } finally {
      setChecking(false);
    }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" /></div>;

  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="mb-8">
        <p className="mb-2 text-sm font-semibold text-indigo-600">Workspace defaults</p>
        <h2 className="text-3xl font-extrabold tracking-tight">Settings</h2>
        <p className="mt-2 text-sm text-slate-500">AI provider keys, fallback order, and the general prompt used by every shop.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <section className="rounded-2xl border border-[#e9edf5] bg-white p-6 shadow-[0_8px_28px_rgba(41,45,54,0.05)] md:p-8">
          <h3 className="mb-1 text-lg font-extrabold">AI providers</h3>
          <p className="mb-6 text-sm text-slate-500">Providers run from top to bottom. If one key has no credits or fails, the next enabled provider is tried automatically. The first successful provider stops the chain.</p>

          <div className="space-y-3">
            {aiProviders.map((item, index) => (
              <div key={`${item.provider}-${index}`} className="rounded-xl border border-[#e9edf5] bg-[#f8f9fc] p-4">
                <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[180px_1fr_auto]">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-500">Provider</label>
                    <select value={item.provider} onChange={(e) => updateProvider(index, 'provider', e.target.value)} className="input bg-white">
                      {PROVIDERS.map((provider) => <option key={provider.value} value={provider.value}>{provider.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-500">API key</label>
                    <input type="password" value={item.apiKey} onChange={(e) => updateProvider(index, 'apiKey', e.target.value)} className="input" placeholder="Paste provider API key" />
                  </div>
                  <div className="flex items-center gap-2 pb-1">
                    <label className="flex items-center gap-1 text-xs font-bold text-slate-500">
                      <input type="checkbox" checked={item.enabled !== false} onChange={(e) => updateProvider(index, 'enabled', e.target.checked)} className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500" /> Enabled
                    </label>
                    <button type="button" onClick={() => moveProvider(index, -1)} disabled={index === 0} className="rounded border border-slate-200 bg-white px-2 py-1 text-xs disabled:opacity-30">Up</button>
                    <button type="button" onClick={() => moveProvider(index, 1)} disabled={index === aiProviders.length - 1} className="rounded border border-slate-200 bg-white px-2 py-1 text-xs disabled:opacity-30">Down</button>
                    <button type="button" onClick={() => setAIProviders((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded border border-red-200 bg-white px-2 py-1 text-xs font-bold text-red-600">Remove</button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-400">Default model: {PROVIDERS.find((provider) => provider.value === item.provider)?.help}</p>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setAIProviders((current) => [...current, newProvider()])} className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-100">
            + Add AI provider
          </button>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleCheck}
              disabled={checking}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {checking ? 'Checking...' : 'Test AI providers now'}
            </button>
            {checkResult?.currentProvider && (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                Working: {checkResult.currentProvider}
              </span>
            )}
          </div>

          {checkResult?.providers?.length > 0 && (
            <div className="mt-4 space-y-2">
              {checkResult.providers.map((provider) => (
                <div key={provider.provider} className="flex items-center justify-between rounded-lg border border-[#e9edf5] bg-white px-3 py-2 text-sm">
                  <span className="font-bold text-slate-600">{provider.label}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${provider.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {provider.status === 'active' ? 'Working' : 'Failed'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[#e9edf5] bg-white p-6 shadow-[0_8px_28px_rgba(41,45,54,0.05)] md:p-8">
          <h3 className="mb-6 text-lg font-extrabold">Default review settings</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-600">Default review tone</label>
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
              <label className="mb-1 block text-sm font-bold text-slate-600">Default review language</label>
              <select value={defaultLanguage} onChange={(e) => setDefaultLanguage(e.target.value)} className="input bg-white">
                <option value="english">English</option>
                <option value="gujarati">Gujarati</option>
                <option value="hindi">Hindi</option>
              </select>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#e9edf5] bg-white p-6 shadow-[0_8px_28px_rgba(41,45,54,0.05)] md:p-8">
          <label className="mb-1 block text-sm font-bold text-slate-600">General review prompt</label>
          <textarea value={generalReviewPrompt} onChange={(e) => setGeneralReviewPrompt(e.target.value)} rows={6} className="input resize-y" placeholder="Write general instructions for every shop. Example: Mention fresh products, quick service, and helpful staff." />
          <p className="hint">Used by every shop. With prompt mode "Merge" (default), this prompt and the shop's own prompt are both sent to the AI. With "Only shop prompt", this is ignored for shops that have their own prompt.</p>
          <PromptVariables onInsert={insertPromptVariable} />
        </section>

        <button type="submit" disabled={saving} className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-500 px-8 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save settings'}
        </button>
      </form>
    </div>
  );
}