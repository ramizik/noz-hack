"use client";

import type { AgentMemory, IncidentPhaseStep } from "@/lib/types";
import { useElapsed } from "../_hooks/useElapsed";
import { PhaseTracker } from "./PhaseTracker";

const SEV_STYLES: Record<string, { bg: string; text: string; ring: string }> = {
  critical: {
    bg: "bg-red-50",
    text: "text-red-700",
    ring: "ring-red-200",
  },
  high: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    ring: "ring-orange-200",
  },
  medium: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    ring: "ring-amber-200",
  },
  low: {
    bg: "bg-slate-100",
    text: "text-slate-600",
    ring: "ring-slate-200",
  },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

type Props = {
  memory: AgentMemory | null;
  phase: IncidentPhaseStep;
  monitoringStatus: "all_clear" | "incident" | "idle";
  monitoringMessage: string | null;
  monitoringLastCheckedAt: string | null;
};

export function IncidentStatusPanel({
  memory,
  phase,
  monitoringStatus,
  monitoringMessage,
  monitoringLastCheckedAt,
}: Props) {
  const incidentElapsed = useElapsed(memory?.createdAt ?? memory?.lastCycleAt);
  const monitoringElapsed = useElapsed(monitoringLastCheckedAt ?? undefined);

  if (!memory) {
    if (monitoringStatus === "all_clear") {
      return (
        <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-6 text-center shadow-sm">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl shadow-sm ring-1 ring-emerald-100">
            🛡️
          </div>
          <div className="mb-3 flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            All Clear
          </div>
          <p className="text-sm font-bold text-slate-800">No incidents detected</p>
          <p className="mt-2 max-w-[13rem] text-xs leading-relaxed text-slate-600">
            {monitoringMessage ?? "Tensorlake monitoring active — no suspicious patterns."}
          </p>
          <p className="mt-4 text-[11px] font-medium text-emerald-700">
            Last check {monitoringElapsed} ago
          </p>
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-6 text-center shadow-sm">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-2xl ring-1 ring-slate-200">
          🛡️
        </div>
        <div className="mb-3 flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
          <span className="h-2 w-2 rounded-full bg-slate-400" />
          Standing By
        </div>
        <p className="text-sm font-bold text-slate-800">No active incident</p>
        <p className="mt-2 max-w-[13rem] text-xs leading-relaxed text-slate-500">
          Start monitoring to begin the Tensorlake agent cycle.
        </p>
      </div>
    );
  }

  const sev = SEV_STYLES[memory.severity] ?? SEV_STYLES.low;
  const wasEscalated = memory.cycleCount >= 2 && memory.severity === "critical";
  const isReview = memory.sourceKind === "prerecorded";

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto [scrollbar-width:none]">
      {/* Combined status + severity + details card */}
      <div className={`overflow-hidden rounded-2xl border shadow-sm ${isReview ? "border-slate-200 bg-white" : "border-rose-200 bg-white"}`}>
        {/* Status bar */}
        <div className={`flex items-center justify-between px-4 py-2.5 ${isReview ? "bg-slate-50" : "bg-rose-50"}`}>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${isReview ? "bg-slate-400" : "animate-pulse bg-rose-500"}`} />
            <span className={`text-[10px] font-bold uppercase tracking-widest ${isReview ? "text-slate-500" : "text-rose-700"}`}>
              {isReview ? "Past Incident Review" : "Incident Recovery Active"}
            </span>
          </div>
          <span className="text-base">{isReview ? "📁" : "🚨"}</span>
        </div>

        {/* Severity + ID row */}
        <div className={`flex items-center justify-between border-t px-4 py-3 ${sev.bg} ${isReview ? "border-slate-100" : "border-rose-100"}`}>
          <div>
            <p className={`text-lg font-black uppercase tracking-widest leading-none ${sev.text}`}>
              {memory.severity}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">{memory.classification.replace(/_/g, " ")}</p>
          </div>
          <div className="text-right">
            <span className="font-mono text-xs font-semibold text-slate-700">{memory.incidentId}</span>
            {wasEscalated && (
              <span className="ml-2 rounded-full bg-orange-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-orange-600 ring-1 ring-orange-200">
                ↑ esc
              </span>
            )}
          </div>
        </div>

        {/* Metadata rows */}
        <div className="divide-y divide-slate-100 border-t border-slate-100 px-4">
          {memory.alert?.affectedSystem && (
            <Row label="Affected">
              <span className="text-xs font-medium text-slate-700">{memory.alert.affectedSystem}</span>
            </Row>
          )}
          <Row label="Detected">
            <span className="font-mono text-[11px] text-slate-500">
              {formatTime(memory.createdAt ?? memory.lastCycleAt)}
            </span>
          </Row>
          <Row label="Cycles">
            <span className="text-xs font-bold text-slate-800">{memory.cycleCount}</span>
          </Row>
          <Row label="Duration">
            <span className="font-mono text-xs text-slate-600">{incidentElapsed}</span>
          </Row>
        </div>
      </div>

      {/* Phase tracker */}
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Response Phase
        </p>
        <PhaseTracker phase={phase} />
      </div>

      {/* Memory state */}
      <div className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-teal-600">
          Tensorlake Memory
        </p>
        <p className="mt-1.5 text-xs text-slate-700">
          Cycle {memory.cycleCount} · last write{" "}
          <span className="font-mono text-teal-700">
            {new Date(memory.lastCycleAt).toLocaleTimeString()}
          </span>
        </p>
      </div>
    </div>
  );
}


function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 py-2">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </span>
      <div className="text-right">{children}</div>
    </div>
  );
}
