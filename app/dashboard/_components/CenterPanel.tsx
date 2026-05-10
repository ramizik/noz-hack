import type { AgentAction, DerivedTimelineEvent, SlackNotification, Task } from "@/lib/types";
import { ACTION_LABEL, ACTION_PILL, TASK_LABEL, TASK_PILL } from "@/lib/constants";
import { Pill } from "./Pill";

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

type Props = {
  timeline: DerivedTimelineEvent[];
  tasks: Task[];
  actions: AgentAction[];
  notifications: SlackNotification[];
};

export function CenterPanel({ timeline, tasks, actions, notifications }: Props) {
  const reversed = [...timeline].reverse();
  const latestNotifications = [...notifications].reverse().slice(0, 4);
  const actionItemCount = actions.length + latestNotifications.length;

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      {/* Timeline */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
          <span className="text-xs font-semibold text-slate-700">Agent Timeline</span>
          <span className="text-[10px] tabular-nums text-slate-400">{timeline.length} events</span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.3)_transparent]">
          {reversed.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">
              Timeline populates after first agent cycle
            </p>
          ) : (
            <ul className="space-y-2">
              {reversed.map((ev) => (
                <li key={ev.id} className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 text-base leading-none">
                    {EVENT_ICON[ev.eventType]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
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
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="shrink-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
          <span className="text-xs font-semibold text-slate-700">Autonomous Actions</span>
          {actionItemCount > 0 && (
            <span className="text-[10px] tabular-nums text-slate-400">{actionItemCount}</span>
          )}
        </div>
        <div className="max-h-64 overflow-y-auto px-4 py-3 [scrollbar-width:thin]">
          {actionItemCount === 0 ? (
            <p className="py-3 text-center text-xs text-slate-400">No actions yet</p>
          ) : (
            <ul className="space-y-2">
              {actions.map((action) => (
                <li
                  key={action.id}
                  className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs leading-snug text-slate-700">
                        {action.description}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {action.proposedBy} · cycle {action.cycle} · {action.target}
                      </p>
                    </div>
                    <Pill tone={ACTION_PILL[action.status]}>{ACTION_LABEL[action.status]}</Pill>
                  </div>
                  <p className="mt-1 truncate text-[10px] text-teal-600">
                    Grounded by Nia: {action.groundedSource}
                  </p>
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
                        Sent Slack communication: {notification.text}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        comms-agent · Slack · {notification.channel || "configured channel"}
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
                      Open in Slack
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

      {/* Tasks */}
      <div className="shrink-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
          <span className="text-xs font-semibold text-slate-700">Tasks</span>
          {tasks.length > 0 && (
            <span className="text-[10px] tabular-nums text-slate-400">{tasks.length}</span>
          )}
        </div>
        <div className="px-4 py-3">
          {tasks.length === 0 ? (
            <p className="py-3 text-center text-xs text-slate-400">No tasks yet</p>
          ) : (
            <ul className="space-y-2">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-xs leading-snug text-slate-700">{task.description}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {task.assignedTo} · {task.type}
                    </p>
                  </div>
                  <Pill tone={TASK_PILL[task.status]}>{TASK_LABEL[task.status]}</Pill>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
