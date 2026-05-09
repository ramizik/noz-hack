"use client";

import { useEffect, useRef } from "react";
import { CONSOLE_LEVEL_TONE } from "@/lib/constants";
import { buildConsoleLogs } from "@/lib/incidentView";
import type { AgentMemory } from "@/lib/types";
import { useTriggerCycle } from "../_hooks/useTriggerCycle";
import { useLiveLogStream, type LiveLog } from "../_hooks/useLiveLogStream";

type Props = {
  memory: AgentMemory | null;
  onCycleComplete?: () => void;
  onStreamStart?: () => void;
  streaming: boolean;
};

function formatTs(iso: string): string {
  const d = new Date(iso);
  return (
    [d.getHours(), d.getMinutes(), d.getSeconds()]
      .map((n) => String(n).padStart(2, "0"))
      .join(":") +
    "." +
    String(d.getMilliseconds()).padStart(3, "0")
  );
}

export function NetworkConsole({ memory, onCycleComplete, onStreamStart, streaming }: Props) {
  const { logs: liveLogs, clear } = useLiveLogStream(streaming);
  const trigger = useTriggerCycle(onCycleComplete);
  const scrollRef = useRef<HTMLDivElement>(null);

  const agentLogs: LiveLog[] = buildConsoleLogs(memory).map((l) => ({
    id: l.id,
    ts: l.ts,
    level: l.level,
    source: l.source,
    message: l.message,
  }));

  const allLogs = [...liveLogs, ...agentLogs].sort(
    (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [allLogs.length]);

  function handleStart() {
    onStreamStart?.();
    trigger.trigger();
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/60 to-slate-950/80">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-black/40 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
          </span>
          <span className="ml-2 font-mono text-xs text-slate-400">
            network-console@sentinel:~
          </span>
          {streaming && (
            <span className="ml-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              LIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {streaming && (
            <button
              type="button"
              onClick={clear}
              className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-300 transition hover:bg-white/[0.08]"
            >
              ✕ Clear
            </button>
          )}
          {!streaming && (
            <button
              type="button"
              onClick={handleStart}
              disabled={trigger.pending}
              className="rounded-md bg-emerald-500/15 px-3 py-1.5 text-[11px] font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-500/30 transition hover:bg-emerald-500/25 disabled:opacity-60"
            >
              {trigger.pending ? "⏳ Starting…" : "▶ Start Demo Stream"}
            </button>
          )}
        </div>
      </div>

      {/* Terminal */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto bg-[#04060a] px-5 py-4 font-mono text-[12.5px] leading-relaxed [scrollbar-color:rgba(52,211,153,0.2)_transparent] [scrollbar-width:thin]"
        >
          {allLogs.length === 0 ? (
            <div className="space-y-1.5 text-slate-600">
              <p>
                <span className="text-emerald-400">$</span> sentinel-cli watch --env prod
              </p>
              <p>
                // Monitoring idle — press &quot;Start Demo Stream&quot; to inject live traffic
              </p>
              <p>
                <span className="inline-block h-[0.9em] w-2.5 animate-pulse bg-emerald-400/70 align-middle" />
              </p>
            </div>
          ) : (
            <ul className="space-y-px">
              {allLogs.map((log) => (
                <li
                  key={log.id}
                  className="flex gap-2 whitespace-pre-wrap rounded px-1 py-[2px] transition hover:bg-emerald-500/[0.04]"
                >
                  <span className="shrink-0 tabular-nums text-slate-600">
                    {formatTs(log.ts)}
                  </span>
                  <span
                    className={`w-16 shrink-0 ${CONSOLE_LEVEL_TONE[log.level]}`}
                    style={{ textShadow: "0 0 6px currentColor" }}
                  >
                    {log.level}
                  </span>
                  <span className="shrink-0 text-slate-500">[{log.source}]</span>
                  <span className="text-slate-200">{log.message}</span>
                </li>
              ))}
              <li className="flex gap-2 pt-1">
                <span className="text-emerald-400">$</span>
                <span className="inline-block h-[0.9em] w-2.5 animate-pulse bg-emerald-400/80 align-middle" />
              </li>
            </ul>
          )}
        </div>

        {/* Scanlines */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, rgba(148,163,184,0.025) 0px, rgba(148,163,184,0.025) 1px, transparent 1px, transparent 3px)",
          }}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-black/60 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/70 to-transparent" />
      </div>

      {/* Footer */}
      <div className="flex shrink-0 items-center justify-between border-t border-white/5 bg-black/40 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
        <span>
          <span className={streaming ? "text-emerald-400" : "text-slate-600"}>●</span>{" "}
          sentinelops-memory · prod environment
        </span>
        <span className="tabular-nums">{allLogs.length} events</span>
      </div>
    </div>
  );
}
