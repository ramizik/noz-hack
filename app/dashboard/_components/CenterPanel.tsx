import type { AgentAction, DerivedTimelineEvent, SlackNotification } from "@/lib/types";
import type { LiveLog } from "./ActivityFeed";
import { ACTION_LABEL, ACTION_PILL } from "@/lib/constants";
import { Pill } from "./Pill";

interface LiveAction {
  id: string;
  description: string;
  proposedBy: string;
  status: "executing" | "completed";
  groundedSource: string;
  ts: string;
}

function deriveLiveActions(logs: LiveLog[]): LiveAction[] {
  return logs
    .filter((l) => l.level === "AGENT")
    .map((log) => {
      let proposedBy = "sentinel-agent";
      let status: "executing" | "completed" = "executing";
      let groundedSource = "Nia-guided playbook";

      if (log.message.toLowerCase().includes("isolation") || log.message.toLowerCase().includes("egress clamp")) {
        proposedBy = "containment-agent";
        groundedSource = "DB Exfiltration Runbook · Immediate Containment";
      } else if (log.message.toLowerCase().includes("slack")) {
        proposedBy = "comms-agent";
        groundedSource = "Escalation Procedures · Tier-2 Notification";
        status = "completed";
      } else if (log.message.toLowerCase().includes("investigation") || log.message.toLowerCase().includes("m365") || log.message.toLowerCase().includes("nia")) {
        proposedBy = "investigation-agent";
        groundedSource = "Nia RAG · M365 message trace playbook";
      }

      return { id: log.id, description: log.message, proposedBy, status, groundedSource, ts: log.ts };
    });
}

const EVENT_ICON: Record<DerivedTimelineEvent["eventType"], string> = {
  agent_wake: "⚡",
  monitoring_check: "✓",
  alert_ingested: "🚨",
  alert_injected: "↳",
  nia_search: "🔍",
  classify: "🧠",
  tasks_created: "📋",
  memory_write: "💾",
  memory_read: "🔄",
  new_evidence: "📄",
  escalate: "⬆",
  handoff: "📤",
};

const SYSTEM_BADGE: Record<
  NonNullable<DerivedTimelineEvent["systems"]>[number],
  string
> = {
  agent: "bg-violet-100 text-violet-700 ring-violet-200",
  tensorlake: "bg-orange-100 text-orange-700 ring-orange-200",
  nia: "bg-teal-100 text-teal-700 ring-teal-200",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

type MergedItem =
  | { kind: "event"; data: DerivedTimelineEvent }
  | { kind: "agent"; data: LiveLog };

type Props = {
  timeline: DerivedTimelineEvent[];
  actions: AgentAction[];
  notifications: SlackNotification[];
  agentLogs?: LiveLog[];
};

export function CenterPanel({ timeline, actions, notifications, agentLogs = [] }: Props) {
  const merged: MergedItem[] = [
    ...timeline.map((e) => ({ kind: "event" as const, data: e })),
    ...agentLogs.map((l) => ({ kind: "agent" as const, data: l })),
  ].sort((a, b) => {
    const ta = a.kind === "event" ? a.data.timestamp : a.data.ts;
    const tb = b.kind === "event" ? b.data.timestamp : b.data.ts;
    return new Date(ta).getTime() - new Date(tb).getTime();
  }).reverse();

  const latestNotifications = [...notifications].reverse().slice(0, 4);
  const liveActions = actions.length === 0 && latestNotifications.length === 0
    ? deriveLiveActions(agentLogs)
    : [];
  const actionItemCount = actions.length + latestNotifications.length + liveActions.length;

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      {/* Timeline */}
      <div className="flex min-h-[220px] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
          <span className="text-xs font-semibold text-slate-700">Agent Timeline</span>
          <span className="text-[10px] tabular-nums text-slate-400">{merged.length} events</span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.3)_transparent]">
          {merged.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">
              Waiting for first agent cycle…
            </p>
          ) : (
            <ul className="space-y-2">
              {merged.map((item) => {
                if (item.kind === "agent") {
                  const log = item.data;
                  return (
                    <li key={log.id} className="flex items-start gap-3 rounded-md bg-violet-50/60 px-2 py-1">
                      <span className="mt-0.5 shrink-0 text-base leading-none">🤖</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-[10px] tabular-nums text-slate-400">
                            {formatTime(log.ts)}
                          </span>
                          <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-violet-600 ring-1 ring-inset ring-violet-200">
                            agent
                          </span>
                          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500 ring-1 ring-inset ring-slate-200">
                            {log.source}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs font-medium leading-relaxed text-violet-800">
                          {log.message}
                        </p>
                      </div>
                    </li>
                  );
                }

                const ev = item.data;
                return (
                  <li key={ev.id} className="flex items-start gap-3">
                    <span className="mt-0.5 shrink-0 text-base leading-none">
                      {EVENT_ICON[ev.eventType]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[10px] tabular-nums text-slate-400">
                          {formatTime(ev.timestamp)}
                        </span>
                        {ev.cycle === 2 && (
                          <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-violet-600 ring-1 ring-inset ring-violet-200">
                            cycle 2
                          </span>
                        )}
                        {ev.niaInvolved && (
                          <span className="rounded-full bg-teal-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-teal-600 ring-1 ring-inset ring-teal-200">
                            via Nia
                          </span>
                        )}
                        {(ev.systems ?? []).map((system) => (
                          <span
                            key={system}
                            className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest ring-1 ring-inset ${SYSTEM_BADGE[system]}`}
                          >
                            {system}
                          </span>
                        ))}
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-700">
                        {ev.summary}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Autonomous Actions */}
      <div className="shrink-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
          <span className="text-xs font-semibold text-slate-700">Autonomous Actions</span>
          {actionItemCount > 0 && (
            <span className="text-[10px] tabular-nums text-slate-400">{actionItemCount}</span>
          )}
        </div>
        <div className="max-h-48 overflow-y-auto px-4 py-3 [scrollbar-width:thin]">
          {actionItemCount === 0 ? (
            <p className="py-3 text-center text-xs text-slate-400">No actions yet</p>
          ) : (
            <ul className="space-y-2">
              {liveActions.map((action) => (
                <li key={action.id} className="rounded-lg border border-violet-100 bg-violet-50/60 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium leading-snug text-slate-800">{action.description}</p>
                      <p className="mt-0.5 text-[10px] text-slate-400">{action.proposedBy} · live demo</p>
                    </div>
                    <Pill tone={action.status === "completed" ? "bg-emerald-100 text-emerald-700 ring-emerald-200" : "bg-sky-100 text-sky-700 ring-sky-200"}>
                      {action.status === "completed" ? "Done" : "Executing"}
                    </Pill>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1 rounded-md bg-teal-50 px-2 py-1 ring-1 ring-inset ring-teal-100">
                    <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-teal-600">Nia</span>
                    <span className="min-w-0 truncate text-[10px] text-teal-700">{action.groundedSource}</span>
                  </div>
                </li>
              ))}
              {actions.map((action) => (
                <li
                  key={action.id}
                  className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium leading-snug text-slate-800">
                        {action.description}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {action.proposedBy} · cycle {action.cycle}
                      </p>
                    </div>
                    <Pill tone={ACTION_PILL[action.status]}>{ACTION_LABEL[action.status]}</Pill>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1 rounded-md bg-teal-50 px-2 py-1 ring-1 ring-inset ring-teal-100">
                    <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-teal-600">Nia</span>
                    <span className="min-w-0 truncate text-[10px] text-teal-700">{action.groundedSource}</span>
                  </div>
                </li>
              ))}
              {latestNotifications.map((notification) => (
                <li
                  key={notification.id}
                  className="rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 py-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs leading-snug text-slate-700">
                        Slack: {notification.text}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        comms-agent · {notification.channel || "configured channel"}
                      </p>
                    </div>
                    <Pill
                      tone={
                        notification.status === "sent"
                          ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
                          : notification.status === "pending"
                          ? "bg-amber-100 text-amber-700 ring-amber-200"
                          : "bg-rose-100 text-rose-700 ring-rose-200"
                      }
                    >
                      {notification.status}
                    </Pill>
                  </div>
                  {notification.permalink && (
                    <a
                      className="mt-1 inline-block text-[10px] text-emerald-700 hover:text-emerald-600"
                      href={notification.permalink}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open in Slack ↗
                    </a>
                  )}
                  {notification.error && (
                    <p className="mt-1 text-[10px] text-rose-600">{notification.error}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
