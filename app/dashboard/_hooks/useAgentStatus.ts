"use client";

import { useCallback, useEffect, useState } from "react";
import type { AgentMemory, AgentStatusResponse, AgentSummary } from "@/lib/types";
import { AGENT_STATUS_ENDPOINT, POLL_INTERVAL_MS } from "@/lib/constants";

const EMPTY_SUMMARY: AgentSummary = {
  sandboxName: "",
  sandboxId: null,
  lastCycleAt: null,
  totalCycles: 0,
  totalEvidence: 0,
  totalTasks: 0,
  totalNiaHits: 0,
  activeIncidents: 0,
  resolvedIncidents: 0,
};

interface AgentStatus {
  incidents: AgentMemory[];
  latest: AgentMemory | null;
  agent: AgentSummary;
  loading: boolean;
  lastPoll: Date | null;
  refresh: () => Promise<void>;
}

export function useAgentStatus(): AgentStatus {
  const [incidents, setIncidents] = useState<AgentMemory[]>([]);
  const [agent, setAgent] = useState<AgentSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [lastPoll, setLastPoll] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(AGENT_STATUS_ENDPOINT, { cache: "no-store" });
      const data = (await res.json()) as AgentStatusResponse;
      setIncidents(data.incidents ?? []);
      if (data.agent) setAgent(data.agent);
      setLastPoll(new Date());
    } catch {
      // keep prior state on transient failure
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const latest =
    [...incidents].sort(
      (a, b) =>
        new Date(b.lastCycleAt).getTime() - new Date(a.lastCycleAt).getTime()
    )[0] ?? null;

  return { incidents, latest, agent, loading, lastPoll, refresh };
}
