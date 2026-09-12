import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Code, AlertCircle } from 'lucide-react';

export default function DebugPanel({ logs }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-slate-800 rounded-2xl bg-slate-900/60">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2 text-slate-300 hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-emerald-400" />
          <span className="font-medium">Developer Debug Panel (Latest {logs.length} entries)</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <div className="max-h-96 overflow-y-auto p-4 space-y-4 text-xs font-mono text-slate-200">
          {logs.length === 0 ? (
            <div className="text-slate-500">No API activity yet.</div>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} className="border border-slate-800 rounded p-3 bg-slate-950/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-emerald-400">{log.method} {log.endpoint}</span>
                  <span className={`text-${log.ok ? 'emerald' : 'rose'}-400`}>[{log.status}]</span>
                </div>
                <div className="flex gap-2 mb-1">
                  <span className="text-slate-500">{log.timestamp}</span>
                  <span className="text-slate-500">{log.latencyMs} ms</span>
                </div>
                <pre className="overflow-x-auto bg-slate-900/30 p-2 rounded mb-2">
                  {JSON.stringify(log.requestPayload, null, 2)}
                </pre>
                <pre className="overflow-x-auto bg-slate-900/30 p-2 rounded">
                  {log.responsePayload ? JSON.stringify(log.responsePayload, null, 2) : log.error || '—'}
                </pre>
                {!log.ok && (
                  <div className="mt-1 flex items-center text-rose-400">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {log.error}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
