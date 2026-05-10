"use client";

import { useEffect, useState } from "react";
import type { AgentMemory } from "@/lib/types";
import { BRAND, SEVERITY_PILL } from "@/lib/constants";
import { Pill } from "./Pill";

type Props = {
  memory: AgentMemory | null;
  agentStatus: "active" | "sleeping";
  nextCycleInSeconds: number;
  monitoringStatus: "all_clear" | "incident" | "idle";
  onResetDemo: () => void;
  onOpenTensorlakeConsole: () => void;
  onOpenAbout: () => void;
  resetPending: boolean;
};

export function TopBar({
  memory,
  agentStatus,
  nextCycleInSeconds,
  monitoringStatus,
  onResetDemo,
  onOpenTensorlakeConsole,
  onOpenAbout,
  resetPending,
}: Props) {
  const [countdown, setCountdown] = useState(nextCycleInSeconds);

  useEffect(() => { setCountdown(nextCycleInSeconds); }, [nextCycleInSeconds]);

  useEffect(() => {
    if (agentStatus !== "sleeping") return;
    const id = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [agentStatus, nextCycleInSeconds]);

  return (
    <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
      {/* Wordmark */}
      <div className="flex items-center gap-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-orange-500" aria-hidden>
          <path
            d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"
            fill="currentColor" fillOpacity="0.15"
            stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
          />
        </svg>
        <span className="font-semibold tracking-tight text-slate-800">{BRAND.NAME}</span>
        <button
          type="button"
          onClick={onOpenAbout}
          className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        >
          About
        </button>
      </div>

      {/* Monitoring status pill (only when no incident) */}
      {!memory && monitoringStatus === "all_clear" && (
        <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 ring-1 ring-inset ring-emerald-200">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-xs text-emerald-700">Monitoring · All Clear</span>
        </div>
      )}

      {/* Incident metadata */}
      {memory && (
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-slate-400">{memory.incidentId}</span>
          <span className="text-slate-300">·</span>
          <span className="text-xs text-slate-600">
            {memory.classification.replace(/_/g, " ")}
            {memory.alert?.affectedSystem ? ` — ${memory.alert.affectedSystem}` : ""}
          </span>
          <Pill tone={SEVERITY_PILL[memory.severity]}>{memory.severity}</Pill>
        </div>
      )}

      {/* Agent status */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onOpenTensorlakeConsole}
          className="rounded-md border border-teal-200 bg-teal-50 px-3 py-1.5 text-[11px] font-semibold text-teal-700 transition hover:bg-teal-100"
        >
          Tensorlake Console
        </button>
        <button
          type="button"
          onClick={onResetDemo}
          disabled={resetPending}
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-50 disabled:opacity-60"
        >
          {resetPending ? "Resetting..." : "Reset Demo"}
        </button>
        {agentStatus === "active" ? (
          <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 ring-1 ring-inset ring-emerald-200">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold text-emerald-700">Running</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 ring-1 ring-inset ring-slate-200">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            <span className="text-xs text-slate-500">
              Sleeping
              {countdown > 0 && (
                <span className="ml-1.5 font-mono text-slate-400">· {countdown}s</span>
              )}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
