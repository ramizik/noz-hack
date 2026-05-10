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
export type ActionStatus = "proposed" | "executing" | "completed";
export type SlackNotificationStatus = "pending" | "sent" | "failed";

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

export interface AgentAction {
  id: string;
  incidentId: string;
  cycle: number;
  proposedBy: string;
  actionType:
    | "isolate_host"
    | "isolate_endpoint"
    | "block_destination"
    | "disable_account"
    | "request_logs"
    | "notify_lead"
    | "escalate";
  status: ActionStatus;
  target: string;
  description: string;
  groundedSource: string;
  timestamp: string;
}

export type NetworkNodeKind =
  | "router"
  | "firewall"
  | "switch"
  | "wifi"
  | "server"
  | "database"
  | "workstation"
  | "internet"
  | "quarantine";

export type NetworkLinkStatus = "active" | "blocked" | "quarantined";

export interface NetworkNode {
  id: string;
  label: string;
  kind: NetworkNodeKind;
  ip?: string;
  subnet?: string;
  x: number;
  y: number;
}

export interface NetworkLink {
  id: string;
  source: string;
  target: string;
  label: string;
  status: NetworkLinkStatus;
  sourceRef?: string;
}

export interface NetworkChange {
  id: string;
  incidentId: string;
  cycle: number;
  operation: "disconnect" | "connect" | "block";
  target: string;
  reason: string;
  groundedSource: string;
  timestamp: string;
}

export interface NetworkState {
  updatedAt: string;
  groundedSource: string;
  nodes: NetworkNode[];
  links: NetworkLink[];
  changes: NetworkChange[];
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
  actions?: AgentAction[];
  progressHistory?: IncidentProgressEntry[];
  criticalLogs?: CriticalIncidentLog[];
  notifications?: SlackNotification[];
  networkState?: NetworkState;
  cycleCount: number;
  lastCycleAt: string;
  createdAt?: string;
  alert?: Alert;
  handoffSummary?: string;
  shiftHandoff?: ShiftHandoffContext;
  sourceKind?: "live" | "prerecorded";
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
    | "agent_wake"
    | "monitoring_check"
    | "alert_ingested"
    | "alert_injected"
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
  systems?: Array<"agent" | "tensorlake" | "nia">;
  timestamp: string;
  cycle: number;
}

export interface CriticalIncidentLog {
  id: string;
  incidentId: string;
  source: string;
  severity: "notice" | "warning" | "critical";
  message: string;
  timestamp: string;
}

export interface IncidentProgressEntry {
  id: string;
  incidentId: string;
  cycle: number;
  actor: string;
  status: "observed" | "decided" | "executed" | "blocked" | "handoff";
  summary: string;
  timestamp: string;
}

export interface ShiftHandoffContext {
  generatedAt: string;
  incomingShiftFocus: string[];
  actionsTaken: string[];
  unresolvedRisks: string[];
  criticalLogIds: string[];
  niaSources: string[];
  memoryBasis: string;
}

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
  error?: string | null;
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
  networkState: NetworkState;
}

export interface TensorlakeLogEntry {
  id: string;
  timestamp: string;
  level: "trace" | "debug" | "info" | "warning" | "error" | "unknown";
  levelNumber: number | null;
  body: string;
  application: string | null;
  namespace: string | null;
  requestId: string | null;
  functionName: string | null;
  functionRunId: string | null;
  attributes: Record<string, unknown> | null;
}

export interface TensorlakeLogsResponse {
  logs: TensorlakeLogEntry[];
  nextToken: string | null;
  fetchedAt: string;
  consoleUrl: string;
}
