"use client";

import { useState } from "react";
import { useAgentStatus } from "./_hooks/useAgentStatus";
import { NetworkConsole } from "./_components/NetworkConsole";
import { LanayaPanel } from "./_components/LanayaPanel";
import { TasksCard } from "./_components/TasksCard";
import { SEVERITY_PILL, STATUS_PILL, STATUS_LABEL } from "@/lib/constants";
import { deriveStatus } from "@/lib/incidentView";

export default function DashboardPage() {
  const { latest, loading, lastPoll, refresh } = useAgentStatus();
  const [streaming, setStreaming] = useState(false);

  const status = latest ? deriveStatus(latest) : null;

  return (
    <div
      className="flex h-screen flex-col overflow-hidden bg-[#070a0f] text-slate-100"
      style={{ fontFamily: "ui-monospace, monospace" }}
    >
      {/* ── Top bar ─────────────────────────────────────────── */}
      <header className="flex shrink-0 items-center justify-between border-b border-white/5 bg-black/30 px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-orange-400">⬡</span>
          <span className="font-semibold tracking-tight">SentinelOps</span>
          <span className="text-slate-600 text-xs">Always-On Incident Commander</span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {loading && (
            <span className="animate-pulse text-slate-500">connecting…</span>
          )}

          {latest && status && (
            <>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${SEVERITY_PILL[latest.severity]}`}>
                {latest.severity.toUpperCase()}
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${STATUS_PILL[status]}`}>
                {STATUS_LABEL[status]}
              </span>
              <span className="text-slate-500">
                {latest.classification.replace(/_/g, " ")}
              </span>
              <span className="text-slate-700">·</span>
              <span className="text-slate-500">cycle {latest.cycleCount}</span>
            </>
          )}

          {lastPoll && (
            <span className="text-slate-700 tabular-nums">
              {lastPoll.toLocaleTimeString()}
            </span>
          )}

          <span className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${streaming ? "animate-pulse bg-emerald-400" : "bg-slate-700"}`} />
            <span className={streaming ? "text-emerald-400" : "text-slate-600"}>
              {streaming ? "LIVE" : "IDLE"}
            </span>
          </span>
        </div>
      </header>

      {/* ── Main two-column layout ───────────────────────────── */}
      <div className="flex min-h-0 flex-1 gap-0">
        {/* Left — Network Console (60%) */}
        <div className="flex min-h-0 w-[60%] flex-col border-r border-white/5 p-4">
          <NetworkConsole
            memory={latest ?? null}
            onCycleComplete={refresh}
            onStreamStart={() => setStreaming(true)}
            streaming={streaming}
          />
        </div>

        {/* Right — Agent command panel (40%) */}
        <div className="flex min-h-0 w-[40%] flex-col gap-3 overflow-y-auto p-4 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.15)_transparent]">
          {/* Incident summary card — only when active */}
          {latest && (
            <div className="shrink-0 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Active Incident
              </p>
              <p className="text-sm font-medium text-slate-100">
                {latest.classification.replace(/_/g, " ")}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                {latest.incidentId}
              </p>
              {latest.alert?.affectedSystem && (
                <p className="mt-1.5 text-xs text-slate-400">
                  <span className="text-slate-600">affected:</span>{" "}
                  {latest.alert.affectedSystem}
                </p>
              )}
              {latest.alert?.details && (
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  {latest.alert.details}
                </p>
              )}
              {latest.handoffSummary && (
                <div className="mt-3 rounded-lg border border-amber-800/40 bg-amber-950/20 px-3 py-2">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-amber-400">
                    Shift Handoff · Cycle {latest.cycleCount}
                  </p>
                  <p className="text-xs leading-relaxed text-slate-300">
                    {latest.handoffSummary}
                  </p>
                </div>
              )}
            </div>
          )}

          {!latest && !loading && (
            <div className="shrink-0 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-6 text-center">
              <p className="text-sm text-slate-400">Agent on watch</p>
              <p className="mt-1 text-xs text-slate-600">
                Press &quot;Start Demo Stream&quot; to trigger the incident
              </p>
            </div>
          )}

          {/* Lanaya — notifications + chat */}
          <div className="min-h-0 flex-1" style={{ minHeight: "400px" }}>
            <LanayaPanel memory={latest ?? null} />
          </div>

          {/* Tasks — only when there are any */}
          {latest && latest.tasks.length > 0 && (
            <div className="shrink-0">
              <TasksCard tasks={latest.tasks} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
