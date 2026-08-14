import { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI', model: 'gpt-4o-mini' },
  { value: 'gemini', label: 'Google Gemini', model: 'Auto-select supported model' },
  { value: 'anthropic', label: 'Anthropic Claude', model: 'claude-3-5-haiku-latest' },
  { value: 'groq', label: 'Groq', model: 'llama-3.1-8b-instant' },
];

const blankProvider = () => ({ provider: 'openai', apiKey: '', enabled: true });

export default function AIProviders() {
  const [providers, setProviders] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);

  const load = () => Promise.all([api.get('/admin/settings'), api.get('/admin/ai-status')]).then(([settings, health]) => {
    setProviders(settings.data.aiProviders?.length ? settings.data.aiProviders : (settings.data.openaiApiKey ? [{ provider: 'openai', apiKey: settings.data.openaiApiKey, enabled: true }] : []));
    setStatus(health.data);
  }).catch(console.error).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const updateProvider = (index, field, value) => {
    setProviders((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  };

  const moveProvider = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= providers.length) return;
    const next = [...providers];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setProviders(next);
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/admin/settings', { aiProviders: providers });
      toast.success('AI providers saved');
      const { data: health } = await api.post('/admin/ai-status/check');
      setStatus(health);
      toast.success('Provider status checked');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save providers');
    } finally {
      setSaving(false);
    }
  };

  const checkHealth = async () => {
    setChecking(true);
    try {
      const { data } = await api.post('/admin/ai-status/check');
      setStatus(data);
      toast.success('Provider status refreshed');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Status check failed');
    } finally {
      setChecking(false);
    }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" /></div>;

  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div><p className="mb-2 text-sm font-semibold text-indigo-600">AI control center</p><h2 className="text-3xl font-extrabold tracking-tight">Providers & health</h2><p className="mt-2 text-sm text-slate-500">Add keys, choose fallback order, and see which provider is currently working.</p></div>
        <button onClick={checkHealth} disabled={checking} className="rounded-xl border border-indigo-200 bg-white px-4 py-3 text-sm font-bold text-indigo-700 shadow-sm hover:bg-indigo-50 disabled:opacity-50">{checking ? 'Checking...' : 'Check all providers'}</button>
      </div>

      <section className="mb-6 rounded-2xl border border-[#e9edf5] bg-white p-6 shadow-[0_8px_28px_rgba(41,45,54,0.05)]">
        <div className="mb-5 flex items-center justify-between"><div><h3 className="text-lg font-extrabold">Fallback order</h3><p className="mt-1 text-xs text-slate-400">The first enabled provider runs first. If it fails, the next one starts automatically.</p></div><span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">{providers.length} configured</span></div>
        <div className="space-y-3">
          {providers.map((item, index) => {
            const meta = PROVIDERS.find((provider) => provider.value === item.provider);
            return <div key={`${item.provider}-${index}`} className="rounded-xl border border-slate-100 bg-[#f8f9fc] p-4">
              <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[180px_1fr_auto]">
                <label className="text-xs font-bold text-slate-500">Provider<select value={item.provider} onChange={(e) => updateProvider(index, 'provider', e.target.value)} className="input mt-1 bg-white">{PROVIDERS.map((provider) => <option key={provider.value} value={provider.value}>{provider.label}</option>)}</select></label>
                <label className="text-xs font-bold text-slate-500">API key<input type="password" value={item.apiKey} onChange={(e) => updateProvider(index, 'apiKey', e.target.value)} className="input mt-1 bg-white" placeholder="Paste key" /></label>
                <div className="flex flex-wrap items-center gap-2 pb-1"><label className="flex items-center gap-1 text-xs font-semibold text-slate-500"><input type="checkbox" checked={item.enabled !== false} onChange={(e) => updateProvider(index, 'enabled', e.target.checked)} /> Enabled</label><button type="button" onClick={() => moveProvider(index, -1)} disabled={index === 0} className="rounded border px-2 py-1 text-xs disabled:opacity-30">Up</button><button type="button" onClick={() => moveProvider(index, 1)} disabled={index === providers.length - 1} className="rounded border px-2 py-1 text-xs disabled:opacity-30">Down</button><button type="button" onClick={() => setProviders((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded border border-red-200 px-2 py-1 text-xs font-bold text-red-600">Remove</button></div>
              </div>
              <p className="mt-2 text-xs text-slate-400">Default model: {meta?.model}</p>
            </div>;
          })}
        </div>
        <div className="mt-4 flex gap-3"><button type="button" onClick={() => setProviders((current) => [...current, blankProvider()])} className="rounded-xl border border-indigo-200 px-4 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-50">+ Add provider</button><button type="button" onClick={save} disabled={saving} className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 disabled:opacity-50">{saving ? 'Saving...' : 'Save keys'}</button></div>
      </section>

      <section className="rounded-2xl border border-[#e9edf5] bg-white p-6 shadow-[0_8px_28px_rgba(41,45,54,0.05)]">
        <div className="mb-5 flex items-center justify-between"><div><h3 className="text-lg font-extrabold">Provider status</h3><p className="mt-1 text-xs text-slate-400">Usage is recorded after generation attempts.</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${status?.fallbackUsed ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{status?.currentProviderLabel ? `Using ${status.currentProviderLabel}` : status?.fallbackUsed ? 'Fallback active' : 'No successful generation yet'}</span></div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {(status?.providers || []).map((provider) => <ProviderCard key={provider.provider} provider={provider} />)}
          {!status?.providers?.length && <div className="col-span-full rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">Add an API key above and run a health check.</div>}
        </div>
      </section>
    </div>
  );
}

function ProviderCard({ provider }) {
  const quota = provider.quotaStatus === 'exhausted' ? 'Credits/quota unavailable' : provider.quotaStatus === 'available' ? 'Available on last generation' : 'Balance not exposed by provider';
  return <article className="rounded-2xl border border-slate-100 bg-[#f8f9fc] p-5"><div className="flex items-start justify-between gap-3"><div><h4 className="font-extrabold text-slate-800">{provider.label}</h4><p className="mt-1 text-xs text-slate-400">Model: {provider.selectedModel || provider.models?.[0] || 'Not selected'}</p><p className="mt-1 text-xs text-slate-400">{provider.models?.length ? `${provider.models.length} supported models found` : 'Run health check to list models'}</p></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${provider.status === 'active' ? 'bg-emerald-100 text-emerald-700' : provider.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600'}`}>{provider.status === 'failed' ? 'Fallback' : provider.status}</span></div><div className="mt-5 grid grid-cols-2 gap-4"><Metric label="Tokens used" value={Number(provider.totalTokens || 0).toLocaleString()} /><Metric label="API calls" value={provider.apiCalls || 0} /><Metric label="Reviews" value={provider.reviewsGenerated || 0} /><Metric label="Quota" value={quota} /></div>{provider.lastError && <p className="mt-4 rounded-lg bg-red-50 p-3 text-xs leading-relaxed text-red-700">{provider.lastError}</p>}</article>;
}

function Metric({ label, value }) { return <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-sm font-extrabold text-slate-700">{value}</p></div>; }
