export type Severity = "critical" | "high" | "medium" | "low";
export type IncidentPhase =
  | "detection"
  | "investigation"
  | "containment"
  | "eradication"
  | "recovery"
  | "handoff";
export type IncidentStatus = "open" | "in_progress" | "escalated" | "resolved";
export type TaskStatus = "pending" | "in_progress" | "done";
export type TaskType = "investigate" | "contain" | "communicate" | "escalate";

export interface Incident {
  id: string;
  severity: Severity;
  type: string;
  phase: IncidentPhase;
  status: IncidentStatus;
  createdAt: string;
  lastUpdatedAt: string;
}

export interface Task {
  id: string;
  incidentId: string;
  type: TaskType;
  assignedTo: string;
  status: TaskStatus;
  description: string;
}

export interface Evidence {
  id: string;
  incidentId: string;
  source: string;
  content: string;
  niaSourceRef?: string;
  timestamp: string;
}

export interface TimelineEvent {
  id: string;
  incidentId: string;
  eventType: string;
  summary: string;
  timestamp: string;
}

export interface AgentMemory {
  incidentId: string;
  severity: Severity;
  classification: string;
  tasks: Task[];
  evidence: Evidence[];
  cycleCount: number;
  lastCycleAt: string;
  handoffSummary?: string;
}

export interface Alert {
  id: string;
  type: string;
  affectedSystem: string;
  details: string;
  timestamp: string;
}
