"use client";

import { useEffect, useRef } from "react";
import type { TensorlakeLogEntry } from "@/lib/types";
import { useTensorlakeLogs } from "../_hooks/useTensorlakeLogs";

type Props = {
  open: boolean;
  onClose: () => void;
};

const LEVEL_STYLES: Record<TensorlakeLogEntry["level"], string> = {
  trace: "bg-slate-100 text-slate-500 ring-slate-200",
  debug: "bg-sky-100 text-sky-700 ring-sky-200",
  info: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-100 text-amber-700 ring-amber-200",
  error: "bg-rose-100 text-rose-700 ring-rose-200",
  unknown: "bg-slate-100 text-slate-600 ring-slate-200",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function TensorlakeConsoleDrawer({ open, onClose }: Props) {
  const { logs, fetchedAt, consoleUrl, loading, error, refresh } = useTensorlakeLogs(open);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs.length]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30">
      <button
        type="button"
        aria-label="Close Tensorlake console"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <aside className="relative flex h-full w-full max-w-3xl flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <h2 className="text-sm font-bold text-slate-800">Tensorlake Console</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 ring-1 ring-inset ring-slate-200">
                Live logs
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              sentinel_agent_cycle application output from Tensorlake
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
            <a
              href={consoleUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-teal-200 bg-teal-50 px-3 py-1.5 text-[11px] font-semibold text-teal-700 transition hover:bg-teal-100"
            >
              Open Tensorlake
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-2 text-[11px] text-slate-500">
          <span className="tabular-nums">{logs.length} log lines</span>
          <span>
            {fetchedAt ? `Updated ${formatTime(fetchedAt)}` : "Waiting for Tensorlake logs"}
          </span>
        </div>

        {error && (
          <div className="mx-5 mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        )}

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto bg-slate-950 px-4 py-4 font-mono [scrollbar-color:rgba(148,163,184,0.6)_transparent] [scrollbar-width:thin]"
        >
          {logs.length === 0 && !error ? (
            <div className="flex h-full items-center justify-center text-center">
              <div>
                <p className="text-sm text-slate-300">No Tensorlake logs returned yet</p>
                <p className="mt-1 text-xs text-slate-500">
                  Start monitoring or inject an alert, then keep this console open.
                </p>
              </div>
            </div>
          ) : (
            <ul className="space-y-1">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="grid grid-cols-[5.5rem_4.5rem_1fr] gap-2 rounded-md px-2 py-1.5 text-xs leading-relaxed hover:bg-white/5"
                >
                  <span className="tabular-nums text-slate-500">{formatTime(log.timestamp)}</span>
                  <span>
                    <span
                      className={`inline-flex min-w-14 justify-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ring-1 ring-inset ${LEVEL_STYLES[log.level]}`}
                    >
                      {log.level}
                    </span>
                  </span>
                  <span className="min-w-0 text-slate-200">
                    <span className="break-words">{log.body}</span>
                    {(log.requestId || log.functionName) && (
                      <span className="ml-2 text-[10px] text-slate-500">
                        {log.functionName ? `[${log.functionName}]` : ""}
                        {log.requestId ? ` req:${log.requestId.slice(0, 8)}` : ""}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
