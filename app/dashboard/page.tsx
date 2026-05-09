"use client";

import { useAgentStatus } from "./_hooks/useAgentStatus";
import { TopBar } from "./_components/TopBar";
import { IncidentHero } from "./_components/IncidentHero";
import { NetworkConsole } from "./_components/NetworkConsole";
import { TasksCard } from "./_components/TasksCard";
import { TimelineCard } from "./_components/TimelineCard";
import { LanayaPanel } from "./_components/LanayaPanel";
import { EmptyIncident } from "./_components/EmptyIncident";

export default function DashboardPage() {
  const { latest, loading, lastPoll, refresh } = useAgentStatus();

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-100">
      <TopBar memory={latest ?? null} lastPoll={lastPoll} />
      <main className="mx-auto max-w-6xl">
        {loading && (
          <p className="px-6 py-8 text-sm text-slate-500 animate-pulse">
            Connecting to Tensorlake memory sandbox…
          </p>
        )}
        {!loading && !latest && (
          <EmptyIncident onCycleComplete={refresh} />
        )}
        {latest && (
          <>
            <IncidentHero memory={latest} />
            <div className="grid grid-cols-1 gap-4 px-6 pb-8 md:grid-cols-2">
              <NetworkConsole memory={latest} onCycleComplete={refresh} />
              <LanayaPanel memory={latest} />
              <TasksCard tasks={latest.tasks} />
              <TimelineCard evidence={latest.evidence} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
