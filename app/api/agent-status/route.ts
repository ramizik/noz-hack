import { NextRequest, NextResponse } from "next/server";
import { listAllMemory, readMemory } from "@/lib/tensorlake";
import { summarizeAgent } from "@/lib/agentSummary";
import { isMockMode } from "@/lib/constants";
import { mockStore } from "@/lib/mockStore";
import { deriveNiaRetrievals, deriveTimeline, deriveAgentStatus, derivePhase } from "@/lib/deriveView";
import type { AgentStatusResponse } from "@/lib/types";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const incidentId = searchParams.get("incidentId");
  const mock = isMockMode();

  if (incidentId) {
    const memory = await readMemory();
    return NextResponse.json({ memory: memory ?? null });
  }

  const incidents = mock ? mockStore.list() : await listAllMemory();
  const latest = incidents.sort(
    (a, b) => new Date(b.lastCycleAt).getTime() - new Date(a.lastCycleAt).getTime()
  )[0] ?? null;

  const { agentStatus, nextCycleInSeconds } = deriveAgentStatus(latest);

  const response: AgentStatusResponse = {
    incidents,
    agent: summarizeAgent(incidents),
    niaRetrievals: latest ? deriveNiaRetrievals(latest) : [],
    timeline: latest ? deriveTimeline(latest) : [],
    agentStatus,
    nextCycleInSeconds,
    phase: derivePhase(latest),
  };
  return NextResponse.json(response);
}
