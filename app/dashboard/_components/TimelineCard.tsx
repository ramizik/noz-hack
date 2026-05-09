import type { Evidence } from "@/lib/types";
import { PAGE_LABELS } from "@/lib/constants";
import { PanelCard, SectionHeader } from "./PanelCard";

type Props = {
  evidence: Evidence[];
};

export function TimelineCard({ evidence }: Props) {
  const sorted = [...evidence].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <PanelCard>
      <SectionHeader
        title={PAGE_LABELS.TIMELINE_TITLE}
        meta={
          sorted.length > 0 && (
            <span className="ml-2 text-[11px] tabular-nums text-slate-500">
              {sorted.length}
            </span>
          )
        }
      />
      <div className="px-5 pb-5 pt-3">
        {sorted.length === 0 ? (
          <p className="text-sm text-slate-500">{PAGE_LABELS.TIMELINE_EMPTY}</p>
        ) : (
          <ol className="max-h-80 space-y-3 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.25)_transparent]">
            {sorted.map((ev) => (
              <li key={ev.id} className="border-l-2 border-white/10 pl-3">
                <p className="text-[11px] tabular-nums text-slate-500">
                  {new Date(ev.timestamp).toLocaleTimeString()}
                  <span className="mx-1.5 text-slate-700">·</span>
                  <span className="text-slate-400">{ev.source}</span>
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-200">
                  {ev.content}
                </p>
                {ev.niaSourceRef && (
                  <p className="mt-1 font-mono text-[11px] text-violet-300">
                    ↗ {ev.niaSourceRef}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </PanelCard>
  );
}
