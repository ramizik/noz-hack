"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAgentStatus } from "./_hooks/useAgentStatus";
import { derivePhase, deriveTimeline } from "@/lib/deriveView";
import { TopBar } from "./_components/TopBar";
import { IncidentStatusPanel } from "./_components/IncidentStatusPanel";
import { ActivityFeed } from "./_components/ActivityFeed";
import { CenterPanel } from "./_components/CenterPanel";
import { HandoffSummary } from "./_components/HandoffSummary";
import { IncidentSwitcher, type DashboardMode } from "./_components/IncidentSwitcher";
import { TensorlakeConsoleDrawer } from "./_components/TensorlakeConsoleDrawer";
import { NetworkingDiagram } from "./_components/NetworkingDiagram";
import { DEFAULT_NETWORK_STATE } from "@/lib/networkTopology";

export function DashboardClient() {
  const {
    incidents,
    loading,
    agentStatus,
    nextCycleInSeconds,
    phase,
    monitoringStatus,
    monitoringMessage,
    monitoringLastCheckedAt,
    networkState,
    refresh,
  } = useAgentStatus();

  const [showIncidentToast, setShowIncidentToast] = useState(false);
  const [resetPending, setResetPending] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [logsHidden, setLogsHidden] = useState(false);
  const [logsPaused, setLogsPaused] = useState(false);
  const [mode, setMode] = useState<DashboardMode>("live");
  const [tensorlakeConsoleOpen, setTensorlakeConsoleOpen] = useState(false);

  const liveIncident = useMemo(
    () => incidents.find((incident) => incident.sourceKind !== "prerecorded") ?? null,
    [incidents]
  );

  const reviewIncident = useMemo(
    () => incidents.find((incident) => incident.sourceKind === "prerecorded") ?? null,
    [incidents]
  );

  const selectedIncident = mode === "review" ? reviewIncident : liveIncident;
  const selectedNetworkState = selectedIncident?.networkState ?? networkState ?? DEFAULT_NETWORK_STATE;

  const selectedTimeline = useMemo(
    () => (selectedIncident ? deriveTimeline(selectedIncident) : []),
    [selectedIncident]
  );

  const selectedPhase = useMemo(
    () => (selectedIncident ? derivePhase(selectedIncident) : phase),
    [selectedIncident, phase]
  );

  useEffect(() => {
    if (mode === "review" && !reviewIncident) setMode("live");
  }, [mode, reviewIncident]);

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
        memory={mode === "review" ? reviewIncident : liveIncident}
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
            mode={mode}
            liveIncident={liveIncident}
            reviewIncident={reviewIncident}
            onModeChange={setMode}
          />
          <IncidentStatusPanel
            memory={selectedIncident}
            phase={selectedPhase}
            monitoringStatus={monitoringStatus}
            monitoringMessage={monitoringMessage}
            monitoringLastCheckedAt={monitoringLastCheckedAt}
          />
        </div>

        <div className="flex min-h-0 w-[44%] flex-col gap-4 border-r border-slate-200 p-4">
          <div className="min-h-[310px] shrink-0">
            <NetworkingDiagram network={selectedNetworkState} />
          </div>
          {mode === "live" ? (
            <div className="min-h-0 flex-1">
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
          ) : selectedIncident?.handoffSummary ? (
            <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
              <HandoffSummary
                summary={selectedIncident.handoffSummary}
                cycleCount={selectedIncident.cycleCount}
                lastCycleAt={selectedIncident.lastCycleAt}
                handoff={selectedIncident.shiftHandoff}
                criticalLogs={selectedIncident.criticalLogs ?? []}
                progressHistory={selectedIncident.progressHistory ?? []}
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-2xl border border-slate-200 bg-white text-center shadow-sm">
              <div>
                <p className="text-sm font-semibold text-slate-700">No past report loaded</p>
                <p className="mt-1 text-xs text-slate-400">Switch to Live Demo to start monitoring.</p>
              </div>
            </div>
          )}
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

      <TensorlakeConsoleDrawer
        open={tensorlakeConsoleOpen}
        onClose={() => setTensorlakeConsoleOpen(false)}
      />
    </div>
  );
}
