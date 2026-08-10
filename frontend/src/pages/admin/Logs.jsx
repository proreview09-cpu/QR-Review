import { useState, useEffect } from 'react';
import api from '../../services/api';

const ACTION_COLORS = {
  CREATE: 'bg-green-100 text-green-700',
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
    <div>
      <h2 className="text-2xl font-bold mb-6">Activity Log</h2>

      <div className="flex flex-wrap gap-2 mb-6">
        {['', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'ERROR', 'COPY', 'POSTED', 'SETTINGS'].map((a) => (
          <button
            key={a}
            onClick={() => { setFilter(a); fetchLogs(1, a); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === a ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {a || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-400 mb-3">{total} total events</p>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 w-24">Time</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 w-24">Action</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Description</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 w-40">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((l) => (
                  <tr key={l._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                      {new Date(l.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[l.action] || 'bg-gray-100 text-gray-600'}`}>
                        {l.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{l.description}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{l.performedBy}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No activity yet</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {total > 25 && (
            <div className="flex justify-center gap-3 mt-4">
              <button disabled={page <= 1} onClick={() => fetchLogs(page - 1, filter)}
                className="px-4 py-2 text-sm border rounded-lg disabled:opacity-30 hover:bg-gray-50">Prev</button>
              <span className="px-4 py-2 text-sm text-gray-500">Page {page}</span>
              <button disabled={page * 25 >= total} onClick={() => fetchLogs(page + 1, filter)}
                className="px-4 py-2 text-sm border rounded-lg disabled:opacity-30 hover:bg-gray-50">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
