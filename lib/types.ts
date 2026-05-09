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

export type SlackNotificationStatus = "pending" | "sent" | "failed";

export interface SlackNotification {
  id: string;
  incidentId: string;
  dedupeKey: string;
  channel?: string;
  text: string;
  status: SlackNotificationStatus;
  createdAt: string;
  sentAt?: string;
  slackTs?: string;
  permalink?: string;
  error?: string;
}

export interface AgentMemory {
  incidentId: string;
  severity: Severity;
  classification: string;
  tasks: Task[];
  evidence: Evidence[];
  notifications?: SlackNotification[];
  cycleCount: number;
  lastCycleAt: string;
  createdAt?: string;
  alert?: Alert;
  handoffSummary?: string;
}

export interface Alert {
  id: string;
  type: string;
  affectedSystem: string;
  details: string;
  timestamp: string;
}

export interface AgentSummary {
  sandboxName: string;
  sandboxId: string | null;
  lastCycleAt: string | null;
  totalCycles: number;
  totalEvidence: number;
  totalTasks: number;
  totalNiaHits: number;
  activeIncidents: number;
  resolvedIncidents: number;
}

export interface NiaRetrieval {
  id: string;
  cycle: number;
  documentTitle: string;
  section: string;
  queryUsed: string;
  excerpt: string;
  sourcePath: string;
  timestamp: string;
}

export interface DerivedTimelineEvent {
  id: string;
  eventType:
    | "alert_ingested"
    | "nia_search"
    | "classify"
    | "tasks_created"
    | "memory_write"
    | "memory_read"
    | "new_evidence"
    | "escalate"
    | "handoff";
  summary: string;
  niaInvolved: boolean;
  timestamp: string;
  cycle: number;
}

export type IncidentPhaseStep = "detected" | "triaged" | "contained" | "resolved";

export interface MonitoringMemory {
  status: "all_clear";
  message: string;
  lastCheckedAt: string;
  cycleCount: number;
}

export interface AgentStatusResponse {
  incidents: AgentMemory[];
  agent: AgentSummary;
  niaRetrievals: NiaRetrieval[];
  timeline: DerivedTimelineEvent[];
  agentStatus: "active" | "sleeping";
  nextCycleInSeconds: number;
  phase: IncidentPhaseStep;
  monitoringStatus: "all_clear" | "incident" | "idle";
  monitoringMessage: string | null;
  monitoringLastCheckedAt: string | null;
}
