import React, { useState, useEffect } from 'react';
import { fetchHistory } from '../api';

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetchHistory(30);
        if (res.ok) {
          setHistory(res.data.history || []);
        } else {
          setError(res.error || 'Failed to load history');
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <div className="text-slate-400">Loading history...</div>;
  }
  if (error) {
    return <div className="text-rose-400">Error: {error}</div>;
  }
  if (!history.length) {
    return <div className="text-slate-500">No history records yet.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60">
      <table className="min-w-full table-auto text-sm">
        <thead className="bg-slate-800 text-slate-200">
          <tr>
            <th className="px-4 py-2">Time</th>
            <th className="px-4 py-2">Soil %</th>
            <th className="px-4 py-2">Pump</th>
            <th className="px-4 py-2">Duration s</th>
            <th className="px-4 py-2">Reason</th>
          </tr>
        </thead>
        <tbody className="text-slate-300">
          {history.map((row, idx) => (
            <tr key={idx} className="border-t border-slate-800">
              <td className="px-4 py-2 whitespace-nowrap">{new Date(row.timestamp * 1000).toLocaleString()}</td>
              <td className="px-4 py-2 text-center">{row.soil_moisture_pct?.toFixed(1)}%</td>
              <td className="px-4 py-2 text-center">
                {row.decision?.trigger_pump ? (
                  <span className="text-emerald-400 font-medium">ON</span>
                ) : (
                  <span className="text-rose-400 font-medium">OFF</span>
                )}
              </td>
              <td className="px-4 py-2 text-center">{row.decision?.duration_sec ?? '—'}</td>
              <td className="px-4 py-2">{row.decision?.reason ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
