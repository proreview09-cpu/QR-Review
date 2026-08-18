import { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function GoogleLookup({ onFetched, selected = null, onClear }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loadingPlace, setLoadingPlace] = useState(false);
  const [error, setError] = useState('');
  const timer = useRef(null);
  const boxRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleQuery = (value) => {
    setQuery(value);
    setError('');
    clearTimeout(timer.current);
    if (value.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(() => {
      setSearching(true);
      api.post('/public/places/autocomplete', { query: value.trim() })
        .then(({ data }) => {
          setSuggestions(data.suggestions || []);
          setOpen(true);
        })
        .catch((err) => setError(err.response?.data?.message || 'Google search failed'))
        .finally(() => setSearching(false));
    }, 400);
  };

  const pick = async (item) => {
    setOpen(false);
    setLoadingPlace(true);
    setError('');
    try {
      const { data } = await api.post('/public/places/lookup', { placeId: item.placeId });
      onFetched({ ...data.place, displayName: data.place.name });
      setQuery('');
      toast.success(`Found: ${data.place.name}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load place details');
    } finally {
      setLoadingPlace(false);
    }
  };

  return (
    <div ref={boxRef} className="relative">
      <div className="mb-1 flex items-center justify-between">
        <label className="block text-sm font-bold text-slate-600">Search Google for your business</label>
        {selected && (
          <button type="button" onClick={() => { onClear(); toast.success('Removed Google match'); }} className="text-xs font-bold text-red-500 hover:underline">Remove match</button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            value={query}
            onChange={(e) => handleQuery(e.target.value)}
            className="input pr-9"
            placeholder={selected ? `Matched: ${selected.name}` : 'Type your business name (min 3 letters)...'}
            disabled={!!selected}
          />
          {(searching || loadingPlace) && <span className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />}
        </div>
        <button type="button" onClick={() => { handleQuery(query); }} className="rounded-xl border border-[#e7eaf2] bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50">Search</button>
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-[#e9edf5] bg-white shadow-lg">
          {suggestions.map((item, i) => (
            <button key={`${item.placeId}-${i}`} type="button" onClick={() => pick(item)} className="block w-full border-b border-slate-50 px-4 py-3 text-left transition hover:bg-indigo-50">
              <span className="block text-sm font-bold text-slate-700">{item.name}</span>
              {item.address && <span className="block truncate text-xs text-slate-400">{item.address}</span>}
            </button>
          ))}
        </div>
      )}
      {error && <p className="mt-1 text-xs font-bold text-red-500">{error}</p>}
      <p className="hint">Select your business from Google — name, address, phone and the Google review link fill in automatically.</p>
    </div>
  );
}