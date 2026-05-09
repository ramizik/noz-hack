import type {
  CriticalIncidentLog,
  IncidentProgressEntry,
  ShiftHandoffContext,
} from "@/lib/types";

type Props = {
  summary: string;
  cycleCount: number;
  lastCycleAt: string;
  handoff?: ShiftHandoffContext;
  criticalLogs?: CriticalIncidentLog[];
  progressHistory?: IncidentProgressEntry[];
};

export function HandoffSummary({
  summary,
  cycleCount,
  lastCycleAt,
  handoff,
  criticalLogs = [],
  progressHistory = [],
}: Props) {
  const time = new Date(lastCycleAt).toLocaleTimeString();

  const lines = summary
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <div className="animate-[fadeIn_0.6s_ease-in] rounded-2xl border border-amber-200 bg-amber-50 px-6 py-5">
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-amber-700">
            Shift Handoff Summary
          </p>
          <p className="mt-0.5 text-[11px] text-amber-600">
            Cycle {cycleCount} complete · {time}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-700 ring-1 ring-inset ring-amber-200">
          Auto-generated
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-2">
        {lines.map((line, i) => {
          const isBullet = line.startsWith("-") || line.startsWith("•");
          return (
            <p
              key={i}
              className={`text-sm leading-relaxed ${
                isBullet ? "pl-4 text-slate-600" : "font-medium text-slate-800"
              }`}
            >
              {isBullet ? line.replace(/^[-•]\s*/, "→ ") : line}
            </p>
          );
        })}
        </div>

        <div className="space-y-3">
          {handoff && (
            <div className="rounded-xl border border-amber-200 bg-white/70 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">
                Incoming Shift Focus
              </p>
              <ul className="mt-2 space-y-1.5">
                {handoff.incomingShiftFocus.slice(0, 3).map((item) => (
                  <li key={item} className="text-xs leading-relaxed text-slate-700">
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[10px] text-teal-700">
                Context source: {handoff.memoryBasis}
              </p>
            </div>
          )}

          {criticalLogs.length > 0 && (
            <div className="rounded-xl border border-rose-200 bg-white/70 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-rose-700">
                Critical Logs Added
              </p>
              <ul className="mt-2 space-y-1.5">
                {criticalLogs.slice(-3).map((log) => (
                  <li key={log.id} className="text-xs leading-relaxed text-slate-700">
                    <span className="font-mono text-[10px] text-slate-400">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>{" "}
                    [{log.source}] {log.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {progressHistory.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white/70 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Recent Progress History
              </p>
              <ul className="mt-2 space-y-1.5">
                {progressHistory.slice(-3).map((entry) => (
                  <li key={entry.id} className="text-xs leading-relaxed text-slate-700">
                    <span className="font-semibold">{entry.actor}</span> · cycle{" "}
                    {entry.cycle}: {entry.summary}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
