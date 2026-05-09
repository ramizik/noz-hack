"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAgentStatus } from "./_hooks/useAgentStatus";
import { derivePhase, deriveTimeline } from "@/lib/deriveView";
import { TopBar } from "./_components/TopBar";
import { IncidentStatusPanel } from "./_components/IncidentStatusPanel";
import { ActivityFeed } from "./_components/ActivityFeed";
import { CenterPanel } from "./_components/CenterPanel";
import { HandoffSummary } from "./_components/HandoffSummary";
import { IncidentSwitcher } from "./_components/IncidentSwitcher";
import { TensorlakeConsoleDrawer } from "./_components/TensorlakeConsoleDrawer";

export function DashboardClient() {
  const {
    incidents,
    latest,
    loading,
    lastPoll,
    agentStatus,
    nextCycleInSeconds,
    phase,
    monitoringStatus,
    monitoringMessage,
    monitoringLastCheckedAt,
    refresh,
  } = useAgentStatus();

  const [showIncidentToast, setShowIncidentToast] = useState(false);
  const [resetPending, setResetPending] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [logsHidden, setLogsHidden] = useState(false);
  const [logsPaused, setLogsPaused] = useState(false);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  const selectedIncident = useMemo(() => {
    if (selectedIncidentId) {
      const match = incidents.find((incident) => incident.incidentId === selectedIncidentId);
      if (match) return match;
    }
    return latest ?? null;
  }, [incidents, latest, selectedIncidentId]);

  const selectedTimeline = useMemo(
    () => (selectedIncident ? deriveTimeline(selectedIncident) : []),
    [selectedIncident]
  );

  const selectedPhase = useMemo(
    () => (selectedIncident ? derivePhase(selectedIncident) : phase),
    [selectedIncident, phase]
  );

  useEffect(() => {
    if (!selectedIncidentId && latest) {
      setSelectedIncidentId(latest.incidentId);
      return;
    }

    if (
      selectedIncidentId &&
      incidents.length > 0 &&
      !incidents.some((incident) => incident.incidentId === selectedIncidentId)
    ) {
      setSelectedIncidentId(latest?.incidentId ?? incidents[0]?.incidentId ?? null);
    }
  }, [incidents, latest, selectedIncidentId]);
  const [tensorlakeConsoleOpen, setTensorlakeConsoleOpen] = useState(false);

  const handleIncidentDetected = useCallback(() => {
    setShowIncidentToast(true);
    setTimeout(() => setShowIncidentToast(false), 8000);
  }, []);

  const handleResetDemo = useCallback(async () => {
    setResetPending(true);
    try {
      await fetch("/api/reset-demo", { method: "POST" });
      setResetSignal((value) => value + 1);
      await refresh();
    } finally {
      setResetPending(false);
    }
  }, [refresh]);

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
        onResetDemo={handleResetDemo}
        onOpenTensorlakeConsole={() => setTensorlakeConsoleOpen(true)}
        resetPending={resetPending}
      />

      <div className="flex min-h-0 flex-1 gap-0 overflow-hidden">
        <div className="flex w-[22%] shrink-0 flex-col gap-3 border-r border-slate-200 p-4 overflow-y-auto [scrollbar-width:none]">
          {loading && (
            <p className="animate-pulse text-center text-xs text-slate-400 py-4">Connecting…</p>
          )}
          <IncidentSwitcher
            incidents={incidents}
            selectedIncidentId={selectedIncident?.incidentId ?? null}
            onSelect={setSelectedIncidentId}
          />
          <IncidentStatusPanel
            memory={selectedIncident}
            phase={selectedPhase}
            monitoringStatus={monitoringStatus}
            monitoringMessage={monitoringMessage}
            monitoringLastCheckedAt={monitoringLastCheckedAt}
          />
        </div>

        <div className="flex min-h-0 w-[44%] flex-col border-r border-slate-200 p-4">
          <ActivityFeed
            monitoringStatus={monitoringStatus}
            onCycleComplete={refresh}
            onIncidentDetected={handleIncidentDetected}
            resetSignal={resetSignal}
            hidden={logsHidden}
            streamPaused={logsPaused}
            onHide={() => setLogsHidden(true)}
            onShow={() => setLogsHidden(false)}
            onToggleStream={() => setLogsPaused((paused) => !paused)}
          />
        </div>

        <div className="flex min-h-0 w-[34%] flex-col p-4">
          <CenterPanel
            timeline={selectedTimeline}
            tasks={selectedIncident?.tasks ?? []}
            actions={selectedIncident?.actions ?? []}
            notifications={selectedIncident?.notifications ?? []}
          />
        </div>
      </div>

      {selectedIncident?.handoffSummary && (
        <div className="shrink-0 border-t border-amber-200 px-6 py-4 max-h-[35vh] overflow-y-auto [scrollbar-width:thin]">
          <HandoffSummary
            summary={selectedIncident.handoffSummary}
            cycleCount={selectedIncident.cycleCount}
            lastCycleAt={selectedIncident.lastCycleAt}
            handoff={selectedIncident.shiftHandoff}
            criticalLogs={selectedIncident.criticalLogs ?? []}
            progressHistory={selectedIncident.progressHistory ?? []}
          />
        </div>
      )}

      <TensorlakeConsoleDrawer
        open={tensorlakeConsoleOpen}
        onClose={() => setTensorlakeConsoleOpen(false)}
      />
    </div>
  );
}
