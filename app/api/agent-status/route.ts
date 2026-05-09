import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { listAllMemory, readMonitoringMemory } from "@/lib/tensorlake";
import { summarizeAgent } from "@/lib/agentSummary";
import {
  deriveNiaRetrievals,
  deriveTimeline,
  deriveMonitoringTimeline,
  deriveAgentStatus,
  derivePhase,
} from "@/lib/deriveView";
import type { AgentStatusResponse } from "@/lib/types";

export const maxDuration = 30;

export async function GET(_req: NextRequest) {
  const [incidents, monitoring] = await Promise.all([
    listAllMemory(),
    readMonitoringMemory(),
  ]);

  const latest = incidents.sort(
    (a, b) => new Date(b.lastCycleAt).getTime() - new Date(a.lastCycleAt).getTime()
  )[0] ?? null;
  const activeLiveIncident = incidents.find(
    (incident) => incident.sourceKind !== "prerecorded" && !incident.handoffSummary
  );

  const { agentStatus, nextCycleInSeconds } = deriveAgentStatus(latest);

  const monitoringStatus = activeLiveIncident
    ? "incident"
    : monitoring
    ? "all_clear"
    : "idle";

  const response: AgentStatusResponse = {
    incidents,
    agent: summarizeAgent(incidents),
    niaRetrievals: latest ? deriveNiaRetrievals(latest) : [],
    timeline: latest ? deriveTimeline(latest) : deriveMonitoringTimeline(monitoring),
    agentStatus,
    nextCycleInSeconds,
    phase: derivePhase(latest),
    monitoringStatus,
    monitoringMessage: monitoring?.message ?? null,
    monitoringLastCheckedAt: monitoring?.lastCheckedAt ?? null,
  };

  return NextResponse.json(response);
}
