import type { AgentMemory } from "./types";

export const LIVE_INCIDENT_ID = "INC-2026-001";
export const PRERECORDED_INCIDENT_ID = "INC-2026-000";

export const PRERECORDED_INCIDENT_MEMORY: AgentMemory = {
  incidentId: PRERECORDED_INCIDENT_ID,
  sourceKind: "prerecorded",
  severity: "critical",
  classification: "confirmed_data_exfiltration",
  cycleCount: 3,
  createdAt: "2026-05-08T23:18:00Z",
  lastCycleAt: "2026-05-09T02:07:00Z",
  alert: {
    id: "alert-prerecorded-001",
    type: "unusual_outbound_traffic",
    affectedSystem: "analytics-db-02",
    details:
      "Repeated HTTPS egress from analytics-db-02 to 198.51.100.77 with compressed archive signatures and no approved export job.",
    timestamp: "2026-05-08T23:18:00Z",
  },
  evidence: [
    {
      id: "pre-ev-001",
      incidentId: PRERECORDED_INCIDENT_ID,
      source: "Nia",
      content:
        "DB exfiltration runbook selected because the source host is a database with unscheduled outbound transfer over TCP/443.",
      niaSourceRef:
        "data/runbooks/db_exfiltration_incident_playbook_enterprise.md#immediate-containment",
      timestamp: "2026-05-08T23:22:00Z",
    },
    {
      id: "pre-ev-002",
      incidentId: PRERECORDED_INCIDENT_ID,
      source: "Firewall",
      content:
        "6.4GB outbound transfer to 198.51.100.77 observed across 14 sessions before block rule applied.",
      timestamp: "2026-05-08T23:33:00Z",
    },
    {
      id: "pre-ev-003",
      incidentId: PRERECORDED_INCIDENT_ID,
      source: "EDR",
      content:
        "svc-analytics-export spawned tar and curl from /tmp/.cache outside the approved data pipeline window.",
      timestamp: "2026-05-09T00:11:00Z",
    },
    {
      id: "pre-ev-004",
      incidentId: PRERECORDED_INCIDENT_ID,
      source: "Nia",
      content:
        "Prior postmortem matched service-account staging behavior and recommended credential rotation plus subnet egress review.",
      niaSourceRef:
        "data/runbooks/prior_postmortem_2026_03_14_atlas_subnet_exfil_attempt.md#lessons-learned",
      timestamp: "2026-05-09T00:19:00Z",
    },
    {
      id: "pre-ev-005",
      incidentId: PRERECORDED_INCIDENT_ID,
      source: "IAM",
      content:
        "svc-analytics-export token was disabled. No successful auth events seen after containment.",
      timestamp: "2026-05-09T01:36:00Z",
    },
  ],
  tasks: [
    {
      id: "pre-task-001",
      incidentId: PRERECORDED_INCIDENT_ID,
      type: "contain",
      assignedTo: "Containment lead",
      status: "done",
      description:
        "Block analytics-db-02 outbound traffic except approved replication targets and preserve active DB state.",
    },
    {
      id: "pre-task-002",
      incidentId: PRERECORDED_INCIDENT_ID,
      type: "investigate",
      assignedTo: "Forensics",
      status: "in_progress",
      description:
        "Review tar/curl process tree, service-account token use, and proxy logs from 22:45-00:30 UTC.",
    },
    {
      id: "pre-task-003",
      incidentId: PRERECORDED_INCIDENT_ID,
      type: "communicate",
      assignedTo: "Incident commander",
      status: "done",
      description:
        "Notify data platform owner and prepare customer-impact assessment with confirmed transfer window.",
    },
  ],
  actions: [
    {
      id: "pre-action-001",
      incidentId: PRERECORDED_INCIDENT_ID,
      cycle: 1,
      proposedBy: "containment-agent",
      actionType: "block_destination",
      status: "completed",
      target: "198.51.100.77",
      description:
        "Blocked egress destination 198.51.100.77 at perimeter firewall and DB subnet ACL.",
      groundedSource:
        "data/runbooks/db_exfiltration_incident_playbook_enterprise.md#immediate-containment",
      timestamp: "2026-05-08T23:34:00Z",
    },
    {
      id: "pre-action-002",
      incidentId: PRERECORDED_INCIDENT_ID,
      cycle: 2,
      proposedBy: "investigation-agent",
      actionType: "request_logs",
      status: "completed",
      target: "proxy, firewall, iam, edr",
      description:
        "Collected proxy, firewall, IAM, and EDR logs for the full suspected staging and transfer window.",
      groundedSource:
        "data/runbooks/siem_firewall_edr_log_field_guide.md#egress-investigation-fields",
      timestamp: "2026-05-09T00:24:00Z",
    },
    {
      id: "pre-action-003",
      incidentId: PRERECORDED_INCIDENT_ID,
      cycle: 3,
      proposedBy: "escalation-agent",
      actionType: "escalate",
      status: "completed",
      target: "tier-2-on-call",
      description:
        "Escalated to Tier-2 with service-account compromise evidence and handoff package.",
      groundedSource:
        "data/runbooks/incident_command_roles_contacts_escalation.md#tier-2-escalation",
      timestamp: "2026-05-09T01:52:00Z",
    },
  ],
  progressHistory: [
    {
      id: "pre-progress-001",
      incidentId: PRERECORDED_INCIDENT_ID,
      cycle: 1,
      actor: "Sentinel agent",
      status: "observed",
      summary:
        "Loaded alert and found no prior memory for analytics-db-02 before initial classification.",
      timestamp: "2026-05-08T23:20:00Z",
    },
    {
      id: "pre-progress-002",
      incidentId: PRERECORDED_INCIDENT_ID,
      cycle: 1,
      actor: "Containment agent",
      status: "executed",
      summary:
        "Applied outbound destination block and preserved database process state per Nia runbook.",
      timestamp: "2026-05-08T23:34:00Z",
    },
    {
      id: "pre-progress-003",
      incidentId: PRERECORDED_INCIDENT_ID,
      cycle: 2,
      actor: "Investigation agent",
      status: "decided",
      summary:
        "Used Tensorlake memory from cycle 1 to focus on service-account staging and proxy logs.",
      timestamp: "2026-05-09T00:23:00Z",
    },
    {
      id: "pre-progress-004",
      incidentId: PRERECORDED_INCIDENT_ID,
      cycle: 3,
      actor: "Sentinel agent",
      status: "handoff",
      summary:
        "Generated shift handoff from persisted evidence, actions, unresolved risks, and Nia sources.",
      timestamp: "2026-05-09T02:07:00Z",
    },
  ],
  criticalLogs: [
    {
      id: "pre-log-001",
      incidentId: PRERECORDED_INCIDENT_ID,
      source: "firewall-egress",
      severity: "critical",
      message:
        "analytics-db-02 sent 6.4GB to 198.51.100.77 over TCP/443 before containment.",
      timestamp: "2026-05-08T23:33:00Z",
    },
    {
      id: "pre-log-002",
      incidentId: PRERECORDED_INCIDENT_ID,
      source: "edr-process",
      severity: "warning",
      message:
        "svc-analytics-export executed tar and curl from /tmp/.cache outside deployment window.",
      timestamp: "2026-05-09T00:11:00Z",
    },
    {
      id: "pre-log-003",
      incidentId: PRERECORDED_INCIDENT_ID,
      source: "iam",
      severity: "notice",
      message:
        "Service-account token disabled; no post-containment successful authentications.",
      timestamp: "2026-05-09T01:36:00Z",
    },
  ],
  handoffSummary:
    "Incoming shift should treat this as confirmed data exfiltration from analytics-db-02. Containment is in place: egress to 198.51.100.77 is blocked, svc-analytics-export is disabled, and proxy/firewall/EDR/IAM logs were collected. Critical evidence shows 6.4GB transferred before containment and suspicious tar/curl execution from /tmp/.cache. Continue forensic review of service-account token exposure, validate no additional destinations were used, and prepare data-owner impact assessment. Nia grounding came from the DB exfiltration runbook, prior Atlas subnet postmortem, log field guide, and Tier-2 escalation procedure.",
  shiftHandoff: {
    generatedAt: "2026-05-09T02:07:00Z",
    incomingShiftFocus: [
      "Validate whether 198.51.100.77 was the only exfiltration destination.",
      "Complete forensic review for svc-analytics-export token exposure.",
      "Prepare data-owner impact assessment from confirmed transfer window.",
    ],
    actionsTaken: [
      "Blocked outbound traffic to 198.51.100.77.",
      "Disabled svc-analytics-export token.",
      "Collected proxy, firewall, IAM, and EDR logs for the response window.",
    ],
    unresolvedRisks: [
      "Possible additional staging locations on analytics-db-02.",
      "Unknown whether copied archive contained regulated data.",
      "Credential exposure scope still under review.",
    ],
    criticalLogIds: ["pre-log-001", "pre-log-002", "pre-log-003"],
    niaSources: [
      "data/runbooks/db_exfiltration_incident_playbook_enterprise.md#immediate-containment",
      "data/runbooks/prior_postmortem_2026_03_14_atlas_subnet_exfil_attempt.md#lessons-learned",
      "data/runbooks/incident_command_roles_contacts_escalation.md#tier-2-escalation",
    ],
    memoryBasis:
      "Tensorlake incident memory cycles 1-3: persisted evidence, autonomous actions, critical logs, and shift progress history.",
  },
};
