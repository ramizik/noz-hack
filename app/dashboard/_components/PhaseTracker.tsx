import type { IncidentPhaseStep } from "@/lib/types";

const STEPS: { key: IncidentPhaseStep; label: string }[] = [
  { key: "detected", label: "Detected" },
  { key: "triaged", label: "Triaged" },
  { key: "contained", label: "Contained" },
  { key: "resolved", label: "Resolved" },
];

const ORDER: Record<IncidentPhaseStep, number> = {
  detected: 0,
  triaged: 1,
  contained: 2,
  resolved: 3,
};

type Props = { phase: IncidentPhaseStep };

export function PhaseTracker({ phase }: Props) {
  const current = ORDER[phase];

  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, i) => {
        const done = ORDER[step.key] < current;
        const active = step.key === phase;
        return (
          <div key={step.key} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ring-1 ring-inset transition-colors
                  ${done ? "bg-emerald-500/20 text-emerald-300 ring-emerald-500/40" : ""}
                  ${active ? "bg-orange-500/20 text-orange-300 ring-orange-500/40" : ""}
                  ${!done && !active ? "bg-slate-800 text-slate-600 ring-slate-700" : ""}
                `}
              >
                {done ? "✓" : i + 1}
              </div>
              <span
                className={`text-[9px] font-semibold uppercase tracking-widest
                  ${done ? "text-emerald-400" : ""}
                  ${active ? "text-orange-300" : ""}
                  ${!done && !active ? "text-slate-600" : ""}
                `}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`mx-1 mb-4 h-px flex-1 transition-colors ${done ? "bg-emerald-500/40" : "bg-slate-800"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
