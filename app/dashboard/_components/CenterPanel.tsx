import type { DerivedTimelineEvent, Task } from "@/lib/types";
import { TASK_LABEL, TASK_PILL } from "@/lib/constants";
import { Pill } from "./Pill";

const EVENT_ICON: Record<DerivedTimelineEvent["eventType"], string> = {
  alert_ingested: "🚨",
  nia_search: "🔍",
  classify: "🧠",
  tasks_created: "📋",
  memory_write: "💾",
  memory_read: "🔄",
  new_evidence: "📄",
  escalate: "⬆",
  handoff: "📤",
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
};

export function CenterPanel({ timeline, tasks }: Props) {
  const reversed = [...timeline].reverse();

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      {/* Timeline — top half */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/5 bg-[#04060a]">
        <div className="flex shrink-0 items-center justify-between border-b border-white/5 bg-black/40 px-4 py-3">
          <span className="text-xs font-semibold text-slate-300">Timeline</span>
          <span className="text-[10px] tabular-nums text-slate-600">{timeline.length} events</span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.15)_transparent]">
          {reversed.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-600">
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
                      <span className="font-mono text-[10px] tabular-nums text-slate-600">
                        {formatTime(ev.timestamp)}
                      </span>
                      {ev.cycle === 2 && (
                        <span className="rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-violet-400 ring-1 ring-inset ring-violet-500/20">
                          cycle 2
                        </span>
                      )}
                      {ev.niaInvolved && (
                        <span className="rounded-full bg-cyan-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-cyan-400 ring-1 ring-inset ring-cyan-500/20">
                          via Nia
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-300">
                      {ev.summary}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Tasks — bottom */}
      <div className="shrink-0 rounded-2xl border border-white/5 bg-white/[0.02]">
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
          <span className="text-xs font-semibold text-slate-300">Tasks</span>
          {tasks.length > 0 && (
            <span className="text-[10px] tabular-nums text-slate-600">{tasks.length}</span>
          )}
        </div>
        <div className="px-4 py-3">
          {tasks.length === 0 ? (
            <p className="py-3 text-center text-xs text-slate-600">No tasks yet</p>
          ) : (
            <ul className="space-y-2">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-xs leading-snug text-slate-200">{task.description}</p>
                    <p className="mt-0.5 text-[10px] text-slate-600">
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
