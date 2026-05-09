type Props = {
  summary: string;
  cycleCount: number;
  lastCycleAt: string;
};

export function HandoffSummary({ summary, cycleCount, lastCycleAt }: Props) {
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
    </div>
  );
}
