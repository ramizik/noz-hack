"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  AgentMemory,
  AgentStatusResponse,
  AgentSummary,
  NiaRetrieval,
  DerivedTimelineEvent,
  IncidentPhaseStep,
  NetworkState,
} from "@/lib/types";
import { AGENT_STATUS_ENDPOINT, POLL_INTERVAL_MS } from "@/lib/constants";
import { DEFAULT_NETWORK_STATE } from "@/lib/networkTopology";

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
  niaRetrievals: NiaRetrieval[];
  timeline: DerivedTimelineEvent[];
  agentStatus: "active" | "sleeping";
  nextCycleInSeconds: number;
  phase: IncidentPhaseStep;
  monitoringStatus: "all_clear" | "incident" | "idle";
  monitoringMessage: string | null;
  monitoringLastCheckedAt: string | null;
  networkState: NetworkState;
  loading: boolean;
  lastPoll: Date | null;
  refresh: () => Promise<void>;
}

export function useAgentStatus(): AgentStatus {
  const [incidents, setIncidents] = useState<AgentMemory[]>([]);
  const [agent, setAgent] = useState<AgentSummary>(EMPTY_SUMMARY);
  const [niaRetrievals, setNiaRetrievals] = useState<NiaRetrieval[]>([]);
  const [timeline, setTimeline] = useState<DerivedTimelineEvent[]>([]);
  const [agentStatus, setAgentStatus] = useState<"active" | "sleeping">("sleeping");
  const [nextCycleInSeconds, setNextCycleInSeconds] = useState(0);
  const [phase, setPhase] = useState<IncidentPhaseStep>("detected");
  const [monitoringStatus, setMonitoringStatus] = useState<"all_clear" | "incident" | "idle">("idle");
  const [monitoringMessage, setMonitoringMessage] = useState<string | null>(null);
  const [monitoringLastCheckedAt, setMonitoringLastCheckedAt] = useState<string | null>(null);
  const [networkState, setNetworkState] = useState<NetworkState>(DEFAULT_NETWORK_STATE);
  const [loading, setLoading] = useState(true);
  const [lastPoll, setLastPoll] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(AGENT_STATUS_ENDPOINT, { cache: "no-store" });
      const data = (await res.json()) as AgentStatusResponse;
      setIncidents(data.incidents ?? []);
      if (data.agent) setAgent(data.agent);
      setNiaRetrievals(data.niaRetrievals ?? []);
      setTimeline(data.timeline ?? []);
      setAgentStatus(data.agentStatus ?? "sleeping");
      setNextCycleInSeconds(data.nextCycleInSeconds ?? 0);
      setPhase(data.phase ?? "detected");
      setMonitoringStatus(data.monitoringStatus ?? "idle");
      setMonitoringMessage(data.monitoringMessage ?? null);
      setMonitoringLastCheckedAt(data.monitoringLastCheckedAt ?? null);
      setNetworkState(data.networkState ?? DEFAULT_NETWORK_STATE);
      setLastPoll(new Date());
    } catch {
      // keep prior state
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

  return {
    incidents,
    latest,
    agent,
    niaRetrievals,
    timeline,
    agentStatus,
    nextCycleInSeconds,
    phase,
    monitoringStatus,
    monitoringMessage,
    monitoringLastCheckedAt,
    networkState,
    loading,
    lastPoll,
    refresh,
  };
}
