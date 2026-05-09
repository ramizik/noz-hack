import type { AgentMemory, IncidentPhaseStep } from "@/lib/types";
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
};

export function IncidentStatusPanel({ memory, phase, monitoringStatus, monitoringMessage }: Props) {
  if (!memory) {
    if (monitoringStatus === "all_clear") {
      return (
        <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-12 text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
            <span className="h-3 w-3 animate-pulse rounded-full bg-emerald-500" />
          </div>
          <p className="text-sm font-semibold text-emerald-700">All Clear</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            {monitoringMessage ?? "No anomalies detected."}
          </p>
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
          <span className="text-xl">⏱</span>
        </div>
        <p className="text-sm font-medium text-slate-500">No active incident</p>
        <p className="mt-1 text-xs text-slate-400">Press Start Monitoring</p>
      </div>
    );
  }

  const sev = SEV_STYLES[memory.severity] ?? SEV_STYLES.low;
  const wasEscalated = memory.cycleCount >= 2 && memory.severity === "critical";

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto [scrollbar-width:none]">
      {/* Severity badge */}
      <div className={`rounded-2xl border px-5 py-5 text-center ${sev.bg} ${sev.ring} ring-1 ring-inset`}>
        <p className={`text-4xl font-black uppercase tracking-widest ${sev.text}`}>
          {memory.severity}
        </p>
        {wasEscalated && (
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-orange-500">
            ↑ escalated from HIGH
          </p>
        )}
        <p className="mt-2 text-xs text-slate-500">
          {memory.classification.replace(/_/g, " ")}
        </p>
      </div>

      {/* Incident metadata */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 space-y-3 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Incident Details
        </p>

        <Row label="ID">
          <span className="font-mono text-xs text-slate-700">{memory.incidentId}</span>
        </Row>

        {memory.alert?.affectedSystem && (
          <Row label="Affected">
            <span className="text-xs text-slate-700">{memory.alert.affectedSystem}</span>
          </Row>
        )}

        <Row label="First detected">
          <span className="font-mono text-xs text-slate-500">
            {formatTime(memory.createdAt ?? memory.lastCycleAt)}
          </span>
        </Row>

        <Row label="Cycles">
          <span className="text-xs font-bold text-slate-800">{memory.cycleCount}</span>
        </Row>

        <Row label="Type">
          <span className="text-xs text-slate-600">
            {memory.classification.replace(/_/g, " ")}
          </span>
        </Row>
      </div>

      {/* Phase tracker */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Response Phase
        </p>
        <PhaseTracker phase={phase} />
      </div>

      {/* Memory state */}
      <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3">
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
    <div className="flex items-start justify-between gap-2">
      <span className="shrink-0 text-[10px] font-medium uppercase tracking-widest text-slate-400">
        {label}
      </span>
      <div className="text-right">{children}</div>
    </div>
  );
}
