import { useState, useEffect } from 'react';
import api from '../../services/api';

const ACTION_COLORS = {
  CREATE: 'bg-emerald-100 text-emerald-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  LOGIN: 'bg-indigo-100 text-indigo-700',
  ERROR: 'bg-red-200 text-red-800',
  COPY: 'bg-purple-100 text-purple-700',
  POSTED: 'bg-teal-100 text-teal-700',
  GENERATE: 'bg-cyan-100 text-cyan-700',
  REGENERATE: 'bg-cyan-100 text-cyan-700',
  SETTINGS: 'bg-yellow-100 text-yellow-700',
  SEED: 'bg-gray-100 text-gray-600',
};

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = (p = 1, f = '') => {
    setLoading(true);
    const params = `?page=${p}&limit=25${f ? '&action=' + f : ''}`;
    api.get('/admin/logs' + params).then(({ data }) => {
      setLogs(data.logs);
      setTotal(data.total);
      setPage(data.page);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchLogs(); }, []);

  return (
    <div className="mx-auto max-w-[1480px]">
      <div className="mb-8">
        <p className="mb-2 text-sm font-semibold text-indigo-600">Audit trail</p>
        <h2 className="text-3xl font-extrabold tracking-tight">Activity log</h2>
        <p className="mt-2 text-sm text-slate-500">Every create, update, delete, login, and review action is recorded here.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {['', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'ERROR', 'COPY', 'POSTED', 'SETTINGS'].map((a) => (
          <button
            key={a}
            onClick={() => { setFilter(a); fetchLogs(1, a); }}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${filter === a ? 'bg-indigo-600 text-white' : 'bg-[#eef1f8] text-slate-500 hover:bg-indigo-100 hover:text-indigo-700'}`}
          >
            {a || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-400">{total} total events</p>
          <div className="overflow-hidden rounded-2xl border border-[#e9edf5] bg-white shadow-[0_8px_28px_rgba(41,45,54,0.05)]">
            <table className="w-full text-sm">
              <thead className="bg-[#f8f9fc]">
                <tr>
                  <th className="w-40 px-4 py-3 text-left font-bold text-slate-400">Time</th>
                  <th className="w-28 px-4 py-3 text-left font-bold text-slate-400">Action</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-400">Description</th>
                  <th className="w-44 px-4 py-3 text-left font-bold text-slate-400">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f3f8]">
                {logs.map((l) => (
                  <tr key={l._id} className="transition hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">
                      {new Date(l.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${ACTION_COLORS[l.action] || 'bg-gray-100 text-gray-600'}`}>
                        {l.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{l.description}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{l.performedBy}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No activity yet</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {total > 25 && (
            <div className="mt-4 flex justify-center gap-3">
              <button disabled={page <= 1} onClick={() => fetchLogs(page - 1, filter)}
                className="rounded-xl border border-[#e7eaf2] px-4 py-2 text-sm font-bold text-slate-600 disabled:opacity-30 hover:bg-slate-50">Prev</button>
              <span className="px-4 py-2 text-sm text-slate-500">Page {page}</span>
              <button disabled={page * 25 >= total} onClick={() => fetchLogs(page + 1, filter)}
                className="rounded-xl border border-[#e7eaf2] px-4 py-2 text-sm font-bold text-slate-600 disabled:opacity-30 hover:bg-slate-50">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}