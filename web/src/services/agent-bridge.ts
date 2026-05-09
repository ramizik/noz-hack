import type { AgentState, AgentTimelineEvent, Incident } from "@shared/types";

export async function fetchIncidents(): Promise<Incident[]> {
  // TODO: read from Tensorlake durable memory (incident:* keys)
  return [];
}

export async function fetchAgentState(): Promise<AgentState> {
  // TODO: read from Tensorlake (agent:health, agent:last_cycle)
  return {
    online: false,
    lastCycleAt: 0,
    cycleCount: 0,
    activeIncidentIds: [],
    health: "ok",
  };
}

export async function fetchTimeline(_incidentId?: string): Promise<AgentTimelineEvent[]> {
  // TODO: read from Tensorlake timeline log
  return [];
}

export async function triggerAgentOnAlert(_finding: unknown): Promise<{ accepted: true; incidentId: string | null }> {
  // TODO: forward to Tensorlake webhook trigger so the agent wakes up
  return { accepted: true, incidentId: null };
}
