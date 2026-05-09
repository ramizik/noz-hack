import type { AgentMemory, IncidentPhaseStep } from "@/lib/types";
import { PhaseTracker } from "./PhaseTracker";

const SEV_STYLES: Record<string, { bg: string; text: string; ring: string; glow: string }> = {
  critical: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    ring: "ring-red-500/30",
    glow: "shadow-[0_0_40px_rgba(239,68,68,0.2)]",
  },
  high: {
    bg: "bg-orange-500/10",
    text: "text-orange-400",
    ring: "ring-orange-500/30",
    glow: "shadow-[0_0_40px_rgba(249,115,22,0.15)]",
  },
  medium: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    ring: "ring-amber-500/30",
    glow: "",
  },
  low: {
    bg: "bg-slate-700/30",
    text: "text-slate-400",
    ring: "ring-slate-600/30",
    glow: "",
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
};

export function IncidentStatusPanel({ memory, phase }: Props) {
  if (!memory) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] px-6 py-12 text-center">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-800">
          <span className="text-xl">⏱</span>
        </div>
        <p className="text-sm font-medium text-slate-300">Agent on watch</p>
        <p className="mt-1 text-xs text-slate-600">
          No active incident — press Start Demo Stream
        </p>
      </div>
    );
  }

  const sev = SEV_STYLES[memory.severity] ?? SEV_STYLES.low;
  const wasEscalated = memory.cycleCount >= 2 && memory.severity === "critical";

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto [scrollbar-width:none]">
      {/* Large severity badge */}
      <div
        className={`rounded-2xl border px-5 py-5 text-center ${sev.bg} ${sev.ring} ring-1 ring-inset ${sev.glow}`}
      >
        <p className={`text-4xl font-black uppercase tracking-widest ${sev.text}`}>
          {memory.severity}
        </p>
        {wasEscalated && (
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-orange-400/70">
            ↑ escalated from HIGH
          </p>
        )}
        <p className="mt-2 text-xs text-slate-400">
          {memory.classification.replace(/_/g, " ")}
        </p>
      </div>

      {/* Incident metadata */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-4 space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Incident Details
        </p>

        <Row label="ID">
          <span className="font-mono text-xs text-slate-300">{memory.incidentId}</span>
        </Row>

        {memory.alert?.affectedSystem && (
          <Row label="Affected">
            <span className="text-xs text-slate-300">{memory.alert.affectedSystem}</span>
          </Row>
        )}

        <Row label="First detected">
          <span className="font-mono text-xs text-slate-400">
            {formatTime(memory.createdAt ?? memory.lastCycleAt)}
          </span>
        </Row>

        <Row label="Cycles completed">
          <span className="text-xs font-bold text-slate-200">{memory.cycleCount}</span>
        </Row>

        <Row label="Classification">
          <span className="text-xs text-slate-300">
            {memory.classification.replace(/_/g, " ")}
          </span>
        </Row>
      </div>

      {/* Phase tracker */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-4">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Response Phase
        </p>
        <PhaseTracker phase={phase} />
      </div>

      {/* Memory indicator */}
      <div className="rounded-xl border border-teal-500/10 bg-teal-950/10 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-teal-500">
          Memory State
        </p>
        <p className="mt-1.5 text-xs text-slate-300">
          Cycle {memory.cycleCount} — last updated{" "}
          <span className="font-mono text-teal-400">
            {new Date(memory.lastCycleAt).toLocaleTimeString()}
          </span>
        </p>
        <p className="mt-1 text-[10px] text-slate-600">
          Tensorlake sandbox · persistent across restarts
        </p>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="shrink-0 text-[10px] font-medium uppercase tracking-widest text-slate-600">
        {label}
      </span>
      <div className="text-right">{children}</div>
    </div>
  );
}
