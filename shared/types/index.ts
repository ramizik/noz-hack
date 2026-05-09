export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type AlertType = "guardduty" | "scheduled_scan" | "agent_trigger";

export type IncidentStatus = "open" | "investigating" | "mitigating" | "resolved" | "escalated";

export interface Incident {
  id: string;
  type: AlertType;
  severity: Severity;
  status: IncidentStatus;
  title: string;
  source: string;
  createdAt: number;
  updatedAt: number;
  evidenceIds: string[];
  runbookId?: string;
}

export interface AgentTimelineEvent {
  id: string;
  incidentId?: string;
  at: number;
  kind: "plan" | "act" | "reflect" | "recover" | "memory_write" | "knowledge_query";
  summary: string;
  payload?: unknown;
}

export interface AgentState {
  online: boolean;
  lastCycleAt: number;
  cycleCount: number;
  activeIncidentIds: string[];
  health: "ok" | "degraded" | "error";
}

export interface RunbookRef {
  id: string;
  title: string;
  source: "nia";
}
