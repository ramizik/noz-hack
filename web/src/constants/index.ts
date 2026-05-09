export const ENV_KEYS = {
  BRAND_NAME: "NEXT_PUBLIC_BRAND_NAME",
  BRAND_TAGLINE: "NEXT_PUBLIC_BRAND_TAGLINE",
  BRAND_DESCRIPTION: "NEXT_PUBLIC_BRAND_DESCRIPTION",
  API_BASE_URL: "NEXT_PUBLIC_API_BASE_URL",
} as const;

export const BRAND = {
  NAME: process.env[ENV_KEYS.BRAND_NAME] ?? "",
  TAGLINE: process.env[ENV_KEYS.BRAND_TAGLINE] ?? "",
  DESCRIPTION: process.env[ENV_KEYS.BRAND_DESCRIPTION] ?? "",
} as const;

export const ROUTES = {
  HOME: "/",
  INCIDENTS: "/incidents",
  AGENT: "/agent",
  RUNBOOKS: "/runbooks",
} as const;

export const API_ENDPOINTS = {
  INCIDENTS: "/api/incidents",
  AGENT_STATE: "/api/agent/state",
  AGENT_TIMELINE: "/api/agent/timeline",
  WEBHOOK_GUARDDUTY: "/api/webhooks/guardduty",
} as const;

export const MESSAGES = {
  DASHBOARD_PLACEHOLDER: "Waiting for the first alert. Replay a seed event to wake the agent.",
  AGENT_OFFLINE: "Agent is offline.",
  AGENT_ONLINE: "Agent is online.",
  AGENT_SLEEPING: "Agent is sleeping until the next cycle.",
  NO_INCIDENTS: "No active incidents.",
  LOADING: "Loading...",
  ERROR_GENERIC: "Something went wrong. Please retry.",
} as const;

export const COLORS = {
  SEVERITY_CRITICAL: "bg-red-600 text-white",
  SEVERITY_HIGH: "bg-orange-500 text-white",
  SEVERITY_MEDIUM: "bg-yellow-500 text-black",
  SEVERITY_LOW: "bg-blue-500 text-white",
  SEVERITY_INFO: "bg-neutral-500 text-white",
  STATUS_ACTIVE: "text-green-400",
  STATUS_IDLE: "text-neutral-400",
  STATUS_ERROR: "text-red-400",
} as const;

export const SEVERITY_LEVELS = {
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
  INFO: "info",
} as const;

export const ALERT_TYPES = {
  GUARDDUTY: "guardduty",
  SCHEDULED_SCAN: "scheduled_scan",
  AGENT_TRIGGER: "agent_trigger",
} as const;

export const POLLING_INTERVALS = {
  AGENT_STATE_MS: 5_000,
  TIMELINE_MS: 5_000,
  INCIDENTS_MS: 10_000,
} as const;

export const STORAGE_KEYS = {
  THEME: "team1:theme",
  LAST_VIEWED_INCIDENT: "team1:last-incident",
  USER_PREFERENCES: "team1:prefs",
} as const;
