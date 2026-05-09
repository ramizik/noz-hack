import type {
  AgentMemory,
  DerivedTimelineEvent,
  IncidentPhaseStep,
  MonitoringMemory,
  NiaRetrieval,
} from "./types";

// Maps niaSourceRef path fragments to realistic retrieval metadata
const NIA_META: Record<
  string,
  { title: string; section: string; query: string; excerpt: string }
> = {
  "db-exfiltration": {
    title: "DB Exfiltration Runbook",
    section: "Immediate Containment Steps",
    query: "unusual outbound traffic database prod",
    excerpt:
      "If anomalous egress volume is detected from a database host, block outbound traffic on all non-whitelisted IPs immediately. Preserve pcap and connection logs before isolation. Do not restart the DB service — this may destroy in-memory evidence.",
  },
  "ransomware-containment": {
    title: "Ransomware Containment Playbook",
    section: "Finance Segment Isolation",
    query: "ransomware signature finance file server isolation",
    excerpt:
      "Quarantine the finance segment immediately upon signature match. Disable SMB shares on affected file servers. Alert the finance team lead before isolating shared drives to prevent data loss from active sessions.",
  },
  "escalation-procedures": {
    title: "Escalation Procedures",
    section: "Tier-2 Escalation",
    query: "data exfiltration severity escalation on-call procedure",
    excerpt:
      "Escalate to Tier-2 when: confirmed exfiltration exceeds 500 MB, external C2 IP is confirmed, or critical host isolation is required. Page the on-call lead via PagerDuty. SLA: 15-minute acknowledgement window.",
  },
  "prod-db-incident": {
    title: "2025-Q3 Prod DB Postmortem",
    section: "Root Cause & Lessons Learned",
    query: "prod-db-01 prior incident postmortem history",
    excerpt:
      "Root cause: compromised service account svc-dbbackup used to stage data with pg_dump before exfiltration over HTTPS. Remediation: rotate all service account credentials, enforce network segmentation on DB subnet, alert on pg_dump outside scheduled windows.",
  },
};

function parsePath(ref: string): {
  title: string;
  section: string;
  query: string;
  excerpt: string;
  sourcePath: string;
} {
  const [pathPart, anchor] = ref.split("#");
  const segments = pathPart.split("/");
  const filename = segments[segments.length - 1].replace(/\.md$/, "");

  const key = Object.keys(NIA_META).find((k) => filename.includes(k) || ref.includes(k));
  const meta = key ? NIA_META[key] : null;

  const sectionFromAnchor = anchor
    ? anchor.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : segments[0].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    title: meta?.title ?? filename.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    section: meta?.section ?? sectionFromAnchor,
    query: meta?.query ?? `${filename.replace(/-/g, " ")} incident response`,
    excerpt: meta?.excerpt ?? "Relevant runbook section retrieved for incident classification and containment guidance.",
    sourcePath: pathPart,
  };
}

export function deriveNiaRetrievals(memory: AgentMemory): NiaRetrieval[] {
  const seen = new Set<string>();
  const retrievals: NiaRetrieval[] = [];

  for (const ev of memory.evidence) {
    if (!ev.niaSourceRef || seen.has(ev.niaSourceRef)) continue;
    seen.add(ev.niaSourceRef);
    const parsed = parsePath(ev.niaSourceRef);
    // Rough cycle attribution: evidence in later half of list → cycle 2
    const idx = memory.evidence.indexOf(ev);
    const cycle = memory.cycleCount >= 2 && idx >= Math.floor(memory.evidence.length / 2) ? 2 : 1;
    retrievals.push({
      id: `nia-${ev.id}`,
      cycle,
      timestamp: ev.timestamp,
      documentTitle: parsed.title,
      section: parsed.section,
      queryUsed: parsed.query,
      excerpt: parsed.excerpt,
      sourcePath: parsed.sourcePath,
    });
  }

  return retrievals.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export function deriveTimeline(memory: AgentMemory): DerivedTimelineEvent[] {
  const events: DerivedTimelineEvent[] = [];
  const base = memory.createdAt ?? memory.lastCycleAt;
  const niaEvidence = memory.evidence.filter((e) => e.niaSourceRef);

  // Cycle 1 events
  events.push({
    id: `${memory.incidentId}-wake1`,
    eventType: "agent_wake",
    summary: "Tensorlake invoked Sentinel agent cycle 1",
    niaInvolved: false,
    systems: ["tensorlake", "agent"],
    timestamp: base,
    cycle: 1,
  });

  events.push({
    id: `${memory.incidentId}-mem-read1`,
    eventType: "memory_read",
    summary: "Tensorlake memory checked for prior incident context",
    niaInvolved: false,
    systems: ["tensorlake"],
    timestamp: base,
    cycle: 1,
  });

  events.push({
    id: `${memory.incidentId}-alert`,
    eventType: "alert_ingested",
    summary: `Alert ingested — ${memory.alert?.details ?? "unusual activity detected on " + (memory.alert?.affectedSystem ?? "prod host")}`,
    niaInvolved: false,
    systems: ["agent", "tensorlake"],
    timestamp: memory.alert?.timestamp ?? base,
    cycle: 1,
  });

  for (const ev of niaEvidence) {
    const parsed = parsePath(ev.niaSourceRef!);
    events.push({
      id: `${memory.incidentId}-nia-${ev.id}`,
      eventType: "nia_search",
      summary: `Nia retrieved ${parsed.title} · ${parsed.section}`,
      niaInvolved: true,
      systems: ["nia", "agent"],
      timestamp: ev.timestamp,
      cycle: memory.cycleCount >= 2 && memory.evidence.indexOf(ev) >= Math.floor(memory.evidence.length / 2) ? 2 : 1,
    });
  }

  events.push({
    id: `${memory.incidentId}-classify`,
    eventType: "classify",
    summary: `Incident classified — ${memory.classification.replace(/_/g, " ")} · Severity ${memory.severity.toUpperCase()}`,
    niaInvolved: niaEvidence.length > 0,
    systems: niaEvidence.length > 0 ? ["agent", "nia"] : ["agent"],
    timestamp: memory.evidence[0]?.timestamp ?? base,
    cycle: 1,
  });

  if (memory.tasks.length > 0) {
    events.push({
      id: `${memory.incidentId}-tasks`,
      eventType: "tasks_created",
      summary: `${memory.tasks.length} response tasks generated`,
      niaInvolved: false,
      systems: ["agent"],
      timestamp: memory.evidence[memory.evidence.length - 1]?.timestamp ?? base,
      cycle: 1,
    });
  }

  events.push({
    id: `${memory.incidentId}-mem1`,
    eventType: "memory_write",
    summary: "Tensorlake memory written — cycle 1 incident state persisted",
    niaInvolved: false,
    systems: ["tensorlake"],
    timestamp: memory.lastCycleAt,
    cycle: 1,
  });

  // Cycle 2 events
  if (memory.cycleCount >= 2) {
    events.push({
      id: `${memory.incidentId}-wake2`,
      eventType: "agent_wake",
      summary: "Tensorlake invoked Sentinel agent cycle 2",
      niaInvolved: false,
      systems: ["tensorlake", "agent"],
      timestamp: memory.lastCycleAt,
      cycle: 2,
    });

    events.push({
      id: `${memory.incidentId}-mem-read`,
      eventType: "memory_read",
      summary: "Tensorlake memory read — prior context loaded before acting",
      niaInvolved: false,
      systems: ["tensorlake"],
      timestamp: memory.lastCycleAt,
      cycle: 2,
    });

    const laterEvidence = memory.evidence.slice(Math.floor(memory.evidence.length / 2));
    for (const ev of laterEvidence) {
      if (!ev.niaSourceRef) {
        events.push({
          id: `ev-${ev.id}`,
          eventType: "new_evidence",
          summary: `New evidence — [${ev.source}] ${ev.content}`,
          niaInvolved: false,
          systems: ["agent"],
          timestamp: ev.timestamp,
          cycle: 2,
        });
      }
    }

    if (memory.severity === "critical") {
      events.push({
        id: `${memory.incidentId}-escalate`,
        eventType: "escalate",
        summary: "Severity escalated to CRITICAL — exfiltration volume confirmed",
        niaInvolved: false,
        systems: ["agent"],
        timestamp: memory.lastCycleAt,
        cycle: 2,
      });
    }

    if (memory.handoffSummary) {
      events.push({
        id: `${memory.incidentId}-handoff`,
        eventType: "handoff",
        summary: "Shift handoff summary generated from Tensorlake memory and Nia context",
        niaInvolved: true,
        systems: ["agent", "tensorlake", "nia"],
        timestamp: memory.lastCycleAt,
        cycle: 2,
      });
    }
  }

  return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export function deriveMonitoringTimeline(
  monitoring: MonitoringMemory | null
): DerivedTimelineEvent[] {
  if (!monitoring) return [];

  return [
    {
      id: `monitoring-wake-${monitoring.lastCheckedAt}`,
      eventType: "agent_wake",
      summary: "Tensorlake invoked Sentinel monitoring cycle",
      niaInvolved: false,
      systems: ["tensorlake", "agent"],
      timestamp: monitoring.lastCheckedAt,
      cycle: monitoring.cycleCount,
    },
    {
      id: `monitoring-check-${monitoring.lastCheckedAt}`,
      eventType: "monitoring_check",
      summary: `Monitoring check completed — ${monitoring.message}`,
      niaInvolved: false,
      systems: ["agent"],
      timestamp: monitoring.lastCheckedAt,
      cycle: monitoring.cycleCount,
    },
    {
      id: `monitoring-write-${monitoring.lastCheckedAt}`,
      eventType: "memory_write",
      summary: "Tensorlake memory written — all-clear monitoring state persisted",
      niaInvolved: false,
      systems: ["tensorlake"],
      timestamp: monitoring.lastCheckedAt,
      cycle: monitoring.cycleCount,
    },
  ];
}

const CRON_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
const ACTIVE_WINDOW_MS = 90 * 1000;     // consider active for 90s after last cycle

export function deriveAgentStatus(memory: AgentMemory | null): {
  agentStatus: "active" | "sleeping";
  nextCycleInSeconds: number;
} {
  if (!memory) return { agentStatus: "sleeping", nextCycleInSeconds: 0 };
  const elapsed = Date.now() - new Date(memory.lastCycleAt).getTime();
  const agentStatus = elapsed < ACTIVE_WINDOW_MS ? "active" : "sleeping";
  const nextCycleInSeconds = Math.max(0, Math.round((CRON_INTERVAL_MS - (elapsed % CRON_INTERVAL_MS)) / 1000));
  return { agentStatus, nextCycleInSeconds };
}

export function derivePhase(memory: AgentMemory | null): IncidentPhaseStep {
  if (!memory) return "detected";
  if (memory.handoffSummary) return "resolved";
  if (memory.cycleCount >= 2) return "contained";
  if (memory.cycleCount >= 1) return "triaged";
  return "detected";
}
