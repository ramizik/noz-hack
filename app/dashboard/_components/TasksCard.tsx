import type { Task } from "@/lib/types";
import { PAGE_LABELS, TASK_LABEL, TASK_PILL } from "@/lib/constants";
import { PanelCard, SectionHeader } from "./PanelCard";
import { Pill } from "./Pill";

type Props = {
  tasks: Task[];
};

export function TasksCard({ tasks }: Props) {
  return (
    <PanelCard>
      <SectionHeader
        title={PAGE_LABELS.TASKS_TITLE}
        meta={
          tasks.length > 0 && (
            <span className="ml-2 text-[11px] tabular-nums text-slate-500">
              {tasks.length}
            </span>
          )
        }
      />
      <div className="px-5 pb-5 pt-3">
        {tasks.length === 0 ? (
          <p className="text-sm text-slate-500">{PAGE_LABELS.TASKS_EMPTY}</p>
        ) : (
          <ul className="max-h-72 space-y-2.5 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.25)_transparent]">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5 transition hover:bg-white/[0.04]"
              >
                <div className="min-w-0">
                  <p className="text-sm leading-snug text-slate-100">
                    {task.description}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {task.assignedTo} · {task.type}
                  </p>
                </div>
                <Pill tone={TASK_PILL[task.status]}>{TASK_LABEL[task.status]}</Pill>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PanelCard>
  );
}
