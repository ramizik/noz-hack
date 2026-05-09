import type { Severity, TaskStatus } from "./types";
import type { ConsoleLog, IncidentDerivedStatus, LanayaUpdate } from "./incidentView";

export const POLL_INTERVAL_MS = 5000;

export const BRAND = {
  NAME: "SentinelOps",
  TAGLINE: "Always-On Incident Commander",
  DESCRIPTION: "Always-On AI Cyber Incident Response Agent",
} as const;

export const PAGE_LABELS = {
  TOPBAR_BACK: "Incidents",
  HERO_STARTED_PREFIX: "Incident started",
  META_CATEGORY: "CATEGORY",
  META_TEAM: "TEAM",
  META_REPORTED_BY: "REPORTED BY",
  META_AFFECTED: "AFFECTED SYSTEMS",
  META_DESCRIPTION: "DESCRIPTION",
  CONSOLE_TITLE: "Network Console",
  CONSOLE_LIVE: "LIVE",
  CONSOLE_CLEAR: "Clear",
  CONSOLE_TRIGGER: "Start Demo Stream",
  CONSOLE_STREAMING: "Streaming…",
  CONSOLE_PLACEHOLDER:
    '// Scenario: agent idle — press "Start Demo Stream" to inject live logs',
  TASKS_TITLE: "Tasks",
  TASKS_EMPTY: "No tasks yet.",
  TIMELINE_TITLE: "Timeline",
  TIMELINE_EMPTY: "No updates yet.",
  LANAYA_TITLE: "Lanaya — Incident Updates",
  LANAYA_EMPTY: "Waiting for the next agent cycle…",
  LANAYA_INPUT_PLACEHOLDER: "Ask Lanaya about this incident…",
  LANAYA_SEND: "Send",
  LANAYA_THINKING: "…",
  EMPTY_INCIDENT_TITLE: "Agent is on watch",
  EMPTY_INCIDENT_HINT:
    'No active incident. Press "Start Demo Stream" to trigger the agent.',
} as const;

export const TEAM_LABELS = {
  CATEGORY_FALLBACK: "Incident",
  TEAM_NAME: "Sentinel IR",
  REPORTED_BY: "agent.commander",
} as const;

export const REPLAY_ENDPOINT = "/api/webhook";
export const AGENT_STATUS_ENDPOINT = "/api/agent-status";
export const INJECT_ALERT_ENDPOINT = "/api/inject-alert";
export const LANAYA_ENDPOINT = "/api/lanaya";

export const SEVERITY_PILL: Record<Severity, string> = {
  critical: "bg-red-500/15 text-red-400 ring-red-500/30",
  high: "bg-orange-500/15 text-orange-300 ring-orange-500/30",
  medium: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  low: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
};

export const STATUS_PILL: Record<IncidentDerivedStatus, string> = {
  open: "bg-red-500/15 text-red-300 ring-red-500/30",
  in_progress: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  escalated: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
  resolved: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
};

export const STATUS_LABEL: Record<IncidentDerivedStatus, string> = {
  open: "open",
  in_progress: "in progress",
  escalated: "escalated",
  resolved: "resolved",
};

export const TASK_PILL: Record<TaskStatus, string> = {
  done: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  in_progress: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  pending: "bg-slate-500/15 text-slate-300 ring-slate-500/30",
};

export const TASK_LABEL: Record<TaskStatus, string> = {
  done: "Done",
  in_progress: "In flight",
  pending: "Queued",
};

export const CONSOLE_LEVEL_TONE: Record<ConsoleLog["level"], string> = {
  INFO: "text-sky-400",
  WARN: "text-amber-300",
  ERROR: "text-rose-400",
  CRITICAL: "text-rose-400 font-semibold",
  AGENT: "text-violet-300",
};

export const LANAYA_LEVEL_TONE: Record<LanayaUpdate["level"], string> = {
  SYSTEM: "text-slate-300",
  INFO: "text-sky-300",
  WARN: "text-amber-300",
  ERROR: "text-rose-300",
  CRITICAL: "text-rose-300",
  AGENT: "text-violet-300",
};

export const LANAYA_BG: Record<LanayaUpdate["level"], string> = {
  SYSTEM: "",
  INFO: "",
  WARN: "",
  ERROR: "bg-rose-950/40 border-l-2 border-rose-500/60",
  CRITICAL: "bg-rose-950/60 border-l-2 border-rose-500",
  AGENT: "bg-violet-950/40 border-l-2 border-violet-500/60",
};
