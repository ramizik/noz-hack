import type { AgentMemory, AgentSummary } from "./types";

const FALLBACK_SANDBOX_NAME = "sentinelops-memory";

// Pure aggregator. Lives in lib/ so the API route stays thin and the same
// summary shape can be derived elsewhere (e.g. CLI / tests) without a request.
export function summarizeAgent(memories: AgentMemory[]): AgentSummary {
  const totals = memories.reduce(
    (acc, m) => {
      acc.totalCycles += m.cycleCount;
      acc.totalEvidence += m.evidence.length;
      acc.totalTasks += m.tasks.length;
      acc.totalNiaHits += m.evidence.filter((e) => e.niaSourceRef).length;
      if (m.handoffSummary) acc.resolvedIncidents += 1;
      else acc.activeIncidents += 1;

      const cycleTs = new Date(m.lastCycleAt).getTime();
      if (!acc.lastCycleAt || cycleTs > new Date(acc.lastCycleAt).getTime()) {
        acc.lastCycleAt = m.lastCycleAt;
      }
      return acc;
    },
    {
      totalCycles: 0,
      totalEvidence: 0,
      totalTasks: 0,
      totalNiaHits: 0,
      activeIncidents: 0,
      resolvedIncidents: 0,
      lastCycleAt: null as string | null,
    }
  );

  return {
    sandboxName: process.env.TENSORLAKE_SANDBOX_NAME ?? FALLBACK_SANDBOX_NAME,
    sandboxId: process.env.TENSORLAKE_SANDBOX_ID ?? null,
    ...totals,
  };
}
