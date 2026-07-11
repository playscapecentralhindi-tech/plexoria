"use client";

import React, { useEffect, useState } from "react";

export default function DebugLog() {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setLogs((prev) => [...prev, `JS Error: ${event.message} at ${event.filename}:${event.lineno}`]);
    };
    
    const handleRejection = (event: PromiseRejectionEvent) => {
      setLogs((prev) => [...prev, `Promise Rejection: ${event.reason?.message || event.reason}`]);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    
    // Hijack console.error to capture failed requests and other errors
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const msg = args.map(a => {
        if (a instanceof Error) return a.message + "\n" + a.stack;
        if (typeof a === 'object') {
          try { return JSON.stringify(a); } catch { return String(a); }
        }
        return String(a);
      }).join(' ');
      
      setLogs((prev) => [...prev, `Console Error: ${msg}`]);
      originalConsoleError.apply(console, args);
    };

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
      console.error = originalConsoleError;
    };
  }, []);

  // Only render in production (or always for this debugging session)
  if (logs.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 max-h-60 overflow-y-auto bg-black/95 text-red-500 font-mono text-[10px] p-4 border-t border-red-500/20 z-[9999] select-text">
      <div className="flex justify-between items-center mb-2 border-b border-white/10 pb-1">
        <strong className="text-white text-xs">Plexoria Diagnostic Console ({logs.length} errors)</strong>
        <button onClick={() => setLogs([])} className="px-2 py-0.5 bg-white/10 hover:bg-white/20 text-white rounded text-[9px] font-bold">Clear</button>
      </div>
      <ul className="space-y-1">
        {logs.map((log, i) => (
          <li key={i} className="border-b border-white/5 pb-1 last:border-0 leading-normal">{log}</li>
        ))}
      </ul>
    </div>
  );
}
