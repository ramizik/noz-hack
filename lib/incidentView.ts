import type { AgentMemory, Severity } from "./types";

export type IncidentDerivedStatus = "open" | "in_progress" | "escalated" | "resolved";

export interface ConsoleLog {
  id: string;
  ts: string;
  level: "INFO" | "WARN" | "ERROR" | "CRITICAL" | "AGENT";
  source: string;
  message: string;
}

export interface LanayaUpdate {
  id: string;
  ts: string;
  level: "SYSTEM" | "INFO" | "WARN" | "ERROR" | "CRITICAL" | "AGENT";
  body: string;
}

const SEVERITY_TO_LEVEL: Record<Severity, ConsoleLog["level"]> = {
  critical: "CRITICAL",
  high: "ERROR",
  medium: "WARN",
  low: "INFO",
};

export function deriveStatus(memory: AgentMemory): IncidentDerivedStatus {
  if (memory.handoffSummary) return "resolved";
  if (memory.cycleCount >= 2) return "escalated";
  if (memory.cycleCount >= 1) return "in_progress";
  return "open";
}

// Best-effort split of a single affected-system string into chip tokens.
// Backends can later return arrays; this keeps the UI honest until then.
export function splitAffectedSystems(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Convert evidence + agent cycle markers into a unified, color-coded log stream
// that mirrors a security console (image2 style).
export function buildConsoleLogs(memory: AgentMemory | null): ConsoleLog[] {
  if (!memory) return [];
  const baseLevel = SEVERITY_TO_LEVEL[memory.severity];
  const logs: ConsoleLog[] = [];

  if (memory.createdAt) {
    logs.push({
      id: `${memory.incidentId}-boot`,
      ts: memory.createdAt,
      level: "AGENT",
      source: "Sentinel",
      message: `Incident commander online · classifying ${memory.classification}`,
    });
  }

  for (const ev of memory.evidence) {
    logs.push({
      id: ev.id,
      ts: ev.timestamp,
      level: ev.niaSourceRef ? "INFO" : baseLevel,
      source: ev.source,
      message: ev.content,
    });
  }

  for (const log of memory.criticalLogs ?? []) {
    logs.push({
      id: log.id,
      ts: log.timestamp,
      level: log.severity === "critical" ? "CRITICAL" : log.severity === "warning" ? "WARN" : "INFO",
      source: log.source,
      message: log.message,
    });
  }

  return logs.sort(
    (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()
  );
}

export function buildLanayaUpdates(memory: AgentMemory | null): LanayaUpdate[] {
  if (!memory) return [];
  const baseLevel = SEVERITY_TO_LEVEL[memory.severity];
  const updates: LanayaUpdate[] = [];

  if (memory.createdAt) {
    updates.push({
      id: `${memory.incidentId}-system`,
      ts: memory.createdAt,
      level: "SYSTEM",
      body: "Lanaya monitoring activated. Watching logs and incident state.",
    });
  }

  for (const ev of memory.evidence) {
    updates.push({
      id: `lanaya-${ev.id}`,
      ts: ev.timestamp,
      level: ev.niaSourceRef ? "INFO" : baseLevel,
      body: `[${ev.source}] ${ev.content}`,
    });
  }

  for (const log of memory.criticalLogs ?? []) {
    updates.push({
      id: `lanaya-${log.id}`,
      ts: log.timestamp,
      level: log.severity === "critical" ? "CRITICAL" : log.severity === "warning" ? "WARN" : "INFO",
      body: `[${log.source}] ${log.message}`,
    });
  }

  if (memory.handoffSummary) {
    updates.push({
      id: `${memory.incidentId}-handoff`,
      ts: memory.lastCycleAt,
      level: "AGENT",
      body: memory.handoffSummary,
    });
  }

  return updates;
}
