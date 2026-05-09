"use client";

import { useCallback, useState } from "react";
import { useAgentStatus } from "./_hooks/useAgentStatus";
import { TopBar } from "./_components/TopBar";
import { IncidentStatusPanel } from "./_components/IncidentStatusPanel";
import { NetworkConsole } from "./_components/NetworkConsole";
import { CenterPanel } from "./_components/CenterPanel";
import { NiaNavigator } from "./_components/NiaNavigator";
import { HandoffSummary } from "./_components/HandoffSummary";

export default function DashboardPage() {
  const {
    latest,
    loading,
    lastPoll,
    niaRetrievals,
    timeline,
    agentStatus,
    nextCycleInSeconds,
    phase,
    monitoringStatus,
    monitoringMessage,
    refresh,
  } = useAgentStatus();

  const [showIncidentToast, setShowIncidentToast] = useState(false);

  const handleIncidentDetected = useCallback(() => {
    setShowIncidentToast(true);
    setTimeout(() => setShowIncidentToast(false), 8000);
  }, []);

  return (
    <div
      className="flex h-screen flex-col overflow-hidden bg-[#0a0e17] text-slate-100"
      style={{ fontFamily: "ui-monospace, monospace" }}
    >
      {showIncidentToast && (
        <div className="fixed right-5 top-5 z-50 flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-950/90 px-5 py-4 shadow-2xl ring-1 ring-rose-500/20 backdrop-blur-sm">
          <span className="mt-0.5 h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-rose-400 shadow-[0_0_10px_rgba(248,113,113,0.9)]" />
          <div>
            <p className="text-sm font-bold text-rose-300">INCIDENT DETECTED</p>
            <p className="mt-0.5 text-xs text-slate-400">
              prod-db-01 · Unusual outbound traffic — agent responding
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowIncidentToast(false)}
            className="ml-4 text-slate-600 hover:text-slate-300 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      <TopBar
        memory={latest ?? null}
        lastPoll={lastPoll}
        agentStatus={agentStatus}
        nextCycleInSeconds={nextCycleInSeconds}
        monitoringStatus={monitoringStatus}
      />

      <div className="flex min-h-0 flex-1 gap-0 overflow-hidden">
        <div className="flex w-[22%] shrink-0 flex-col gap-3 border-r border-white/5 p-4 overflow-y-auto [scrollbar-width:none]">
          {loading && (
            <p className="animate-pulse text-center text-xs text-slate-600 py-4">
              Connecting…
            </p>
          )}
          <IncidentStatusPanel
            memory={latest ?? null}
            phase={phase}
            monitoringStatus={monitoringStatus}
            monitoringMessage={monitoringMessage}
          />
        </div>

        <div className="flex min-h-0 w-[44%] flex-col gap-3 border-r border-white/5 p-4">
          <div className="min-h-0" style={{ flex: "0 0 54%" }}>
            <NetworkConsole
              memory={latest ?? null}
              monitoringStatus={monitoringStatus}
              onCycleComplete={refresh}
              onIncidentDetected={handleIncidentDetected}
            />
          </div>
          <div className="min-h-0 flex-1">
            <CenterPanel
              timeline={timeline}
              tasks={latest?.tasks ?? []}
            />
          </div>
        </div>

        <div className="flex min-h-0 w-[34%] flex-col p-4">
          <NiaNavigator retrievals={niaRetrievals} />
        </div>
      </div>

      {latest?.handoffSummary && (
        <div className="shrink-0 border-t border-amber-500/15 px-6 py-4 max-h-[35vh] overflow-y-auto [scrollbar-width:thin]">
          <HandoffSummary
            summary={latest.handoffSummary}
            cycleCount={latest.cycleCount}
            lastCycleAt={latest.lastCycleAt}
          />
        </div>
      )}
    </div>
  );
}
