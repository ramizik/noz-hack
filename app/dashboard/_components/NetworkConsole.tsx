"use client";

import { useEffect, useRef, useState } from "react";
import { CONSOLE_LEVEL_TONE, PAGE_LABELS } from "@/lib/constants";
import { buildConsoleLogs } from "@/lib/incidentView";
import type { AgentMemory } from "@/lib/types";
import { useTriggerCycle } from "../_hooks/useTriggerCycle";

type Props = {
  memory: AgentMemory | null;
  onCycleComplete?: () => void;
};

function formatTs(iso: string): string {
  const d = new Date(iso);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  const ss = d.getSeconds().toString().padStart(2, "0");
  const ms = d.getMilliseconds().toString().padStart(3, "0");
  return `${hh}:${mm}:${ss}.${ms}`;
}

export function NetworkConsole({ memory, onCycleComplete }: Props) {
  const logs = buildConsoleLogs(memory);
  const [cleared, setCleared] = useState(false);
  const visible = cleared ? [] : logs;
  const trigger = useTriggerCycle(() => {
    setCleared(false);
    onCycleComplete?.();
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [visible.length]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/60 to-slate-950/80 shadow-[0_30px_80px_-30px_rgba(16,185,129,0.25)]">
      {/* macOS-style traffic-light header bar */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-black/40 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
          </span>
          <span className="ml-2 font-mono text-xs text-slate-400">
            {PAGE_LABELS.CONSOLE_TITLE.toLowerCase()}@sentinel:~
          </span>
          {visible.length > 0 && (
            <span className="ml-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              {PAGE_LABELS.CONSOLE_LIVE}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCleared(true)}
            className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-300 transition hover:bg-white/[0.08]"
          >
            ✕ {PAGE_LABELS.CONSOLE_CLEAR}
          </button>
          <button
            type="button"
            onClick={trigger.trigger}
            disabled={trigger.pending}
            className="rounded-md bg-emerald-500/15 px-3 py-1 text-[11px] font-medium text-emerald-300 ring-1 ring-inset ring-emerald-500/30 transition hover:bg-emerald-500/25 disabled:opacity-60"
          >
            {trigger.pending
              ? `⏳ ${PAGE_LABELS.CONSOLE_STREAMING}`
              : `▶ ${PAGE_LABELS.CONSOLE_TRIGGER}`}
          </button>
        </div>
      </div>

      {/* Terminal viewport with scanlines + vignette */}
      <div>
        <div className="relative">
          <div
            ref={scrollRef}
            className="h-[560px] overflow-y-auto bg-[#04060a] px-5 py-4 font-mono text-[13px] leading-relaxed text-emerald-100/90 [scrollbar-width:thin] [scrollbar-color:rgba(52,211,153,0.25)_transparent]"
          >
            {visible.length === 0 ? (
              <div className="space-y-1.5">
                <p className="text-slate-500">
                  <span className="text-emerald-400">$</span> sentinel-cli watch --incident incident-demo-001
                </p>
                <p className="text-slate-600">{PAGE_LABELS.CONSOLE_PLACEHOLDER}</p>
                <p className="text-slate-600">
                  <span className="inline-block w-2.5 animate-pulse bg-emerald-400/70 align-middle" style={{ height: "0.95em" }} />
                </p>
              </div>
            ) : (
              <ul className="space-y-1">
                {visible.map((log) => (
                  <li
                    key={log.id}
                    className="group flex gap-2 whitespace-pre-wrap rounded px-1 py-0.5 transition hover:bg-emerald-500/[0.04]"
                  >
                    <span className="shrink-0 text-slate-500 tabular-nums">
                      {formatTs(log.ts)}
                    </span>
                    <span
                      className={`shrink-0 ${CONSOLE_LEVEL_TONE[log.level]}`}
                      style={{ textShadow: "0 0 8px currentColor" }}
                    >
                      {log.level.padEnd(8, " ")}
                    </span>
                    <span className="shrink-0 text-slate-400">[{log.source}]</span>
                    <span className="text-slate-100">{log.message}</span>
                  </li>
                ))}
                <li className="flex gap-2 pt-1">
                  <span className="text-emerald-400">$</span>
                  <span
                    className="inline-block w-2.5 animate-pulse bg-emerald-400/80"
                    style={{ height: "0.95em" }}
                  />
                </li>
              </ul>
            )}
          </div>

          {/* Overlays pinned to the terminal viewport (not the scroll content) */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to bottom, rgba(148,163,184,0.04) 0px, rgba(148,163,184,0.04) 1px, transparent 1px, transparent 3px)",
            }}
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-black/70 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/80 to-transparent" />
        </div>

        {/* Footer status bar */}
        <div className="flex items-center justify-between border-t border-white/5 bg-black/40 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
          <span>
            <span className="text-emerald-400">●</span> connected · sentinelops-memory
          </span>
          <span className="tabular-nums">{visible.length} lines</span>
        </div>
      </div>
    </div>
  );
}
