"use client";

import { useEffect, useState } from "react";
import type { AgentMemory } from "@/lib/types";
import { BRAND, SEVERITY_PILL } from "@/lib/constants";
import { Pill } from "./Pill";

type Props = {
  memory: AgentMemory | null;
  lastPoll: Date | null;
  agentStatus: "active" | "sleeping";
  nextCycleInSeconds: number;
  monitoringStatus: "all_clear" | "incident" | "idle";
};

export function TopBar({ memory, lastPoll, agentStatus, nextCycleInSeconds, monitoringStatus }: Props) {
  const [countdown, setCountdown] = useState(nextCycleInSeconds);

  useEffect(() => { setCountdown(nextCycleInSeconds); }, [nextCycleInSeconds]);

  useEffect(() => {
    if (agentStatus !== "sleeping") return;
    const id = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [agentStatus, nextCycleInSeconds]);

  return (
    <header className="flex shrink-0 items-center justify-between border-b border-white/5 bg-black/30 px-6 py-3">
      {/* Wordmark */}
      <div className="flex items-center gap-3">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-orange-400" aria-hidden>
          <path
            d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"
            fill="currentColor" fillOpacity="0.2"
            stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
          />
        </svg>
        <span className="font-semibold tracking-tight text-slate-100">{BRAND.NAME}</span>
        <span className="hidden text-xs text-slate-600 sm:inline">{BRAND.TAGLINE}</span>
      </div>

      {/* Monitoring status pill */}
      {!memory && monitoringStatus === "all_clear" && (
        <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 ring-1 ring-inset ring-emerald-500/20">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          <span className="text-xs text-emerald-300">Monitoring · All Clear</span>
        </div>
      )}

      {/* Incident ID + type */}
      {memory && (
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-slate-500">{memory.incidentId}</span>
          <span className="text-slate-700">·</span>
          <span className="text-xs text-slate-300">
            {memory.classification.replace(/_/g, " ")}
            {memory.alert?.affectedSystem ? ` — ${memory.alert.affectedSystem}` : ""}
          </span>
          <Pill tone={SEVERITY_PILL[memory.severity]}>{memory.severity}</Pill>
        </div>
      )}

      {/* Agent status pill */}
      <div className="flex items-center gap-4">
        {lastPoll && (
          <span className="hidden tabular-nums text-[11px] text-slate-700 sm:inline">
            {lastPoll.toLocaleTimeString()}
          </span>
        )}
        {agentStatus === "active" ? (
          <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 ring-1 ring-inset ring-emerald-500/25">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
            <span className="text-xs font-semibold text-emerald-300">Agent Running</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-full bg-slate-800/60 px-3 py-1.5 ring-1 ring-inset ring-slate-700/40">
            <span className="h-2 w-2 rounded-full bg-slate-600" />
            <span className="text-xs text-slate-400">
              Agent Sleeping
              {countdown > 0 && (
                <span className="ml-1.5 font-mono text-slate-500">— next in {countdown}s</span>
              )}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
