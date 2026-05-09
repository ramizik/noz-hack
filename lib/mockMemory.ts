import type { AgentMemory, Alert, Evidence, Task } from "./types";
import { SEED_ALERTS } from "./seedAlerts";

const NIA_REFS = {
  RUNBOOK: "runbooks/db-exfiltration.md#isolation",
  POSTMORTEM: "postmortems/2025-Q3-prod-db-incident.md",
  ESCALATION: "playbooks/escalation-procedures.md#tier-2",
  RANSOMWARE: "runbooks/ransomware-containment.md#finance-segment",
} as const;

const HANDOFF_SUMMARY =
  "Severity escalated to CRITICAL. 2GB exfiltration confirmed to 185.220.101.45. " +
  "Host prod-db-01 isolated, finance segment quarantined, tier-2 lead paged. " +
  "Next shift: review backup integrity, rotate DB credentials, prepare regulatory disclosure draft.";

function offsetIso(secondsAgo: number): string {
  return new Date(Date.now() - secondsAgo * 1000).toISOString();
}

function firstCycle(incidentId: string, alert: Alert, createdAt: string): AgentMemory {
  const tasks: Task[] = [
    {
      id: `${incidentId}-t-contain`,
      incidentId,
      type: "contain",
      assignedTo: "responder",
      status: "in_progress",
      description: `Isolate ${alert.affectedSystem} from public subnet`,
    },
    {
      id: `${incidentId}-t-investigate`,
      incidentId,
      type: "investigate",
      assignedTo: "investigator",
      status: "in_progress",
      description: "Pull egress logs for the last 30 minutes",
    },
    {
      id: `${incidentId}-t-comms`,
      incidentId,
      type: "communicate",
      assignedTo: "comms",
      status: "pending",
      description: "Notify on-call security lead via PagerDuty",
    },
  ];

  const evidence: Evidence[] = [
    {
      id: `${incidentId}-e-edr`,
      incidentId,
      source: "EDR",
      content: `Unusual process execution on ${alert.affectedSystem}.`,
      timestamp: offsetIso(50),
      niaSourceRef: NIA_REFS.RUNBOOK,
    },
    {
      id: `${incidentId}-e-smb`,
      incidentId,
      source: "SMB",
      content: "Rapid file rename activity detected in finance share.",
      timestamp: offsetIso(40),
    },
    {
      id: `${incidentId}-e-av`,
      incidentId,
      source: "AV",
      content: `Known ransomware signature matched on ${alert.affectedSystem}.`,
      timestamp: offsetIso(30),
      niaSourceRef: NIA_REFS.RANSOMWARE,
    },
    {
      id: `${incidentId}-e-nia`,
      incidentId,
      source: "Nia",
      content: "Retrieved runbook: DB exfiltration containment procedure + 2025-Q3 postmortem.",
      timestamp: offsetIso(20),
      niaSourceRef: NIA_REFS.POSTMORTEM,
    },
  ];

  return {
    incidentId,
    severity: "high",
    classification: "data_exfiltration",
    tasks,
    evidence,
    cycleCount: 1,
    lastCycleAt: new Date().toISOString(),
    createdAt,
    alert,
  };
}

function escalatedCycle(incidentId: string, prior: AgentMemory): AgentMemory {
  const cycleCount = prior.cycleCount + 1;
  const suffix = `c${cycleCount}`;

  const newEvidence: Evidence[] = [
    {
      id: `${incidentId}-e-egress-${suffix}`,
      incidentId,
      source: "EgressLog",
      content: "Confirmed 2GB transferred to 185.220.101.45 over 8 minutes.",
      timestamp: offsetIso(10),
      niaSourceRef: NIA_REFS.ESCALATION,
    },
    {
      id: `${incidentId}-e-ir-${suffix}`,
      incidentId,
      source: "IR",
      content: "Containment required: isolate finance server segment now.",
      timestamp: offsetIso(5),
    },
  ];

  const newTasks: Task[] = [
    {
      id: `${incidentId}-t-escalate-${suffix}`,
      incidentId,
      type: "escalate",
      assignedTo: "commander",
      status: "in_progress",
      description: "Escalate to tier-2 security lead per runbook",
    },
  ];

  // Mark the first containment task done; advance comms to in_progress.
  const advancedTasks: Task[] = prior.tasks.map((t) => {
    if (t.type === "contain" && t.status !== "done") return { ...t, status: "done" };
    if (t.type === "communicate" && t.status === "pending") return { ...t, status: "in_progress" };
    return t;
  });

  return {
    ...prior,
    severity: "critical",
    cycleCount,
    lastCycleAt: new Date().toISOString(),
    tasks: [...advancedTasks, ...newTasks],
    evidence: [...prior.evidence, ...newEvidence],
    handoffSummary: HANDOFF_SUMMARY,
  };
}

export function buildMockCycle(
  incidentId: string,
  prior: AgentMemory | null,
  alert: Alert = SEED_ALERTS[0]
): AgentMemory {
  if (!prior) {
    const createdAt = offsetIso(60);
    return firstCycle(incidentId, alert, createdAt);
  }
  return escalatedCycle(incidentId, prior);
}
