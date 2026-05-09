import type { NiaRetrieval } from "@/lib/types";

type Props = { retrievals: NiaRetrieval[] };

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString();
}

function Breadcrumb({ path }: { path: string }) {
  const parts = path.split("/");
  return (
    <p className="flex flex-wrap items-center gap-1 font-mono text-[10px] text-cyan-600">
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-slate-700">/</span>}
          <span className={i === parts.length - 1 ? "text-cyan-400" : "text-cyan-700"}>
            {part}
          </span>
        </span>
      ))}
    </p>
  );
}

export function NiaNavigator({ retrievals }: Props) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-cyan-500/10 bg-[#04060a]">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-cyan-500/10 bg-black/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          <span className="text-xs font-semibold text-cyan-300 tracking-wide">
            Knowledge Retrieved via Nia
          </span>
        </div>
        <span className="text-[10px] text-slate-600 tabular-nums">
          {retrievals.length} retrieval{retrievals.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Retrieval cards */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 [scrollbar-width:thin] [scrollbar-color:rgba(34,211,238,0.15)_transparent]">
        {retrievals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-slate-500">Waiting for agent to search Nia…</p>
            <p className="mt-1 text-xs text-slate-700">
              Nia retrieval appears here after first cycle
            </p>
          </div>
        ) : (
          retrievals.map((r) => (
            <div
              key={r.id}
              className={`rounded-xl border bg-white/[0.02] p-4 transition hover:bg-white/[0.04]
                ${r.cycle === 1 ? "border-cyan-500/15" : "border-violet-500/20"}`}
            >
              {/* Cycle badge */}
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ring-1 ring-inset
                    ${r.cycle === 1
                      ? "bg-cyan-500/10 text-cyan-300 ring-cyan-500/25"
                      : "bg-violet-500/10 text-violet-300 ring-violet-500/25"
                    }`}
                >
                  Cycle {r.cycle} · Nia retrieval
                </span>
                <span className="text-[10px] tabular-nums text-slate-600">
                  {formatTime(r.timestamp)}
                </span>
              </div>

              {/* Document title + section */}
              <p className="text-sm font-semibold text-slate-100">{r.documentTitle}</p>
              <p className="text-xs text-cyan-400/80">§ {r.section}</p>

              {/* Breadcrumb path */}
              <div className="my-2">
                <Breadcrumb path={r.sourcePath} />
              </div>

              {/* Query used */}
              <div className="mb-2 rounded-md border border-slate-800 bg-slate-900/60 px-2.5 py-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                  Query
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                  &ldquo;{r.queryUsed}&rdquo;
                </p>
              </div>

              {/* Excerpt */}
              <p className="text-[12px] leading-relaxed text-slate-300">{r.excerpt}</p>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-cyan-500/10 bg-black/40 px-4 py-2 text-[10px] uppercase tracking-widest text-cyan-700">
        Nia — targeted retrieval · no hallucination
      </div>
    </div>
  );
}
