"use client";

import { useState } from "react";
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
    refresh,
  } = useAgentStatus();

  const [streaming, setStreaming] = useState(false);

  return (
    <div
      className="flex h-screen flex-col overflow-hidden bg-[#0a0e17] text-slate-100"
      style={{ fontFamily: "ui-monospace, monospace" }}
    >
      {/* ── Top bar ─────────────────────────────────────────── */}
      <TopBar
        memory={latest ?? null}
        lastPoll={lastPoll}
        agentStatus={agentStatus}
        nextCycleInSeconds={nextCycleInSeconds}
      />

      {/* ── Three-column body ───────────────────────────────── */}
      <div className="flex min-h-0 flex-1 gap-0 overflow-hidden">

        {/* LEFT — Incident status (22%) */}
        <div className="flex w-[22%] shrink-0 flex-col gap-3 border-r border-white/5 p-4 overflow-y-auto [scrollbar-width:none]">
          {loading && (
            <p className="animate-pulse text-center text-xs text-slate-600 py-4">
              Connecting…
            </p>
          )}
          <IncidentStatusPanel memory={latest ?? null} phase={phase} />
        </div>

        {/* CENTER — Network console (top) + Timeline + Tasks (bottom) (44%) */}
        <div className="flex min-h-0 w-[44%] flex-col gap-3 border-r border-white/5 p-4">
          {/* Network console — takes ~55% of center column height */}
          <div className="min-h-0" style={{ flex: "0 0 54%" }}>
            <NetworkConsole
              memory={latest ?? null}
              onCycleComplete={refresh}
              onStreamStart={() => setStreaming(true)}
              streaming={streaming}
            />
          </div>

          {/* Timeline + Tasks — remaining 45% */}
          <div className="min-h-0 flex-1">
            <CenterPanel
              timeline={timeline}
              tasks={latest?.tasks ?? []}
            />
          </div>
        </div>

        {/* RIGHT — Nia Navigator (34%) */}
        <div className="flex min-h-0 w-[34%] flex-col p-4">
          <NiaNavigator retrievals={niaRetrievals} />
        </div>
      </div>

      {/* ── Bottom — Handoff summary (appears after cycle 2) ── */}
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
