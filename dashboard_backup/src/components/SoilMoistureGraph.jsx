import React, { useState, useEffect } from 'react';
import { fetchHistory } from '../api';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function SoilMoistureGraph() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchHistory(50);
        if (res.ok) {
          // Backend returns { history: [...] } where each entry has timestamp (seconds) and soil_moisture_pct
          const data = (res.data.history || []).map((row) => ({
            time: new Date(row.timestamp * 1000).toLocaleString([], { hour: '2-digit', minute: '2-digit' }),
            soil: row.soil_moisture_pct,
          }));
          setHistory(data);
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
    return <div className="text-slate-400">Loading soil moisture graph…</div>;
  }
  if (error) {
    return <div className="text-rose-400">Error: {error}</div>;
  }
  if (!history.length) {
    return <div className="text-slate-500">No moisture data available.</div>;
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="mb-2 text-lg font-medium text-slate-200">Soil Moisture Over Time</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={history} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="time" stroke="#cbd5e1" tick={{ fontSize: 10 }} />
          <YAxis domain={[0, 100]} tickCount={6} stroke="#cbd5e1" tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} labelStyle={{ color: '#fff' }} />
          <Line type="monotone" dataKey="soil" stroke="#34d399" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
