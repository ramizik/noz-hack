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
  const { latest, lastPoll, refresh } = useAgentStatus();

  return (
    <div className="min-h-screen">
      <TopBar memory={latest} lastPoll={lastPoll} />

      {!latest ? (
        <EmptyIncident onCycleComplete={refresh} />
      ) : (
        <>
          <IncidentHero memory={latest} />

          <div className="mx-auto grid max-w-7xl gap-5 px-6 pb-12 lg:grid-cols-[1.4fr_1fr]">
            <NetworkConsole memory={latest} onCycleComplete={refresh} />
            <div className="space-y-5">
              <TasksCard tasks={latest.tasks} />
              <TimelineCard evidence={latest.evidence} />
              <LanayaPanel memory={latest} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
