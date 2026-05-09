"use client";

import { useCallback, useState } from "react";
import { useAgentStatus } from "./_hooks/useAgentStatus";
import { TopBar } from "./_components/TopBar";
import { IncidentStatusPanel } from "./_components/IncidentStatusPanel";
import { ActivityFeed } from "./_components/ActivityFeed";
import { CenterPanel } from "./_components/CenterPanel";
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
    refresh,
  } = useAgentStatus();

  const [showIncidentToast, setShowIncidentToast] = useState(false);

  const handleIncidentDetected = useCallback(() => {
    setShowIncidentToast(true);
    setTimeout(() => setShowIncidentToast(false), 8000);
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50 text-slate-800">
      {showIncidentToast && (
        <div className="fixed right-5 top-5 z-50 flex items-start gap-3 rounded-xl border border-rose-200 bg-white px-5 py-4 shadow-lg ring-1 ring-rose-100">
          <span className="mt-0.5 h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-rose-500" />
          <div>
            <p className="text-sm font-bold text-rose-700">Incident Detected</p>
            <p className="mt-0.5 text-xs text-slate-500">
              prod-db-01 · Unusual outbound traffic — agent responding
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowIncidentToast(false)}
            className="ml-4 text-slate-400 hover:text-slate-600 text-xs"
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
        {/* LEFT — Incident status (22%) */}
        <div className="flex w-[22%] shrink-0 flex-col gap-3 border-r border-slate-200 p-4 overflow-y-auto [scrollbar-width:none]">
          {loading && (
            <p className="animate-pulse text-center text-xs text-slate-400 py-4">Connecting…</p>
          )}
          <IncidentStatusPanel
            memory={latest ?? null}
            phase={phase}
            monitoringStatus={monitoringStatus}
            monitoringMessage={null}
          />
        </div>

        {/* CENTER — Activity feed (44%) */}
        <div className="flex min-h-0 w-[44%] flex-col border-r border-slate-200 p-4">
          <ActivityFeed
            memory={latest ?? null}
            niaRetrievals={niaRetrievals}
            monitoringStatus={monitoringStatus}
            onCycleComplete={refresh}
            onIncidentDetected={handleIncidentDetected}
          />
        </div>

        {/* RIGHT — Timeline + Tasks (34%) */}
        <div className="flex min-h-0 w-[34%] flex-col p-4">
          <CenterPanel timeline={timeline} tasks={latest?.tasks ?? []} />
        </div>
      </div>

      {latest?.handoffSummary && (
        <div className="shrink-0 border-t border-amber-200 px-6 py-4 max-h-[35vh] overflow-y-auto [scrollbar-width:thin]">
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
