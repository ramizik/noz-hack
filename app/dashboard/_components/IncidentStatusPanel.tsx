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
        <div className="flex h-full flex-col justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-6 text-center shadow-sm">
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl shadow-sm ring-1 ring-emerald-100">
              😊
            </div>
            <div className="mb-3 flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              System OK
            </div>
            <p className="text-lg font-bold text-slate-800">No recovery in progress</p>
            <p className="mt-2 max-w-[14rem] text-xs leading-relaxed text-slate-600">
              {monitoringMessage ?? "Tensorlake monitoring reports no suspicious patterns."}
            </p>
            <p className="mt-4 text-[11px] font-medium text-emerald-700">
              Last clean check {monitoringElapsed} ago
            </p>
          </div>
          <PlaceholderButtons tone="ok" />
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white px-5 py-6 text-center shadow-sm">
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sky-50 text-3xl ring-1 ring-sky-100">
            🛡️
          </div>
          <div className="mb-3 flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            Standing by
          </div>
          <p className="text-lg font-bold text-slate-800">No active incident</p>
          <p className="mt-2 max-w-[14rem] text-xs leading-relaxed text-slate-500">
            SentinelOps is ready for the next Tensorlake monitoring cycle.
          </p>
        </div>
        <PlaceholderButtons tone="idle" />
      </div>
    );
  }

  const sev = SEV_STYLES[memory.severity] ?? SEV_STYLES.low;
  const wasEscalated = memory.cycleCount >= 2 && memory.severity === "critical";

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto [scrollbar-width:none]">
      <div className="relative overflow-hidden rounded-2xl border border-rose-200 bg-rose-50 px-5 py-5 shadow-sm ring-1 ring-rose-100">
        <div className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl shadow-sm">
          🚨
        </div>
        <div className="mb-4 flex items-center gap-2">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-rose-700">
            Incident recovery active
          </span>
        </div>
        <p className="max-w-[12rem] text-lg font-black text-slate-900">
          Suspicious patterns detected
        </p>
        <p className="mt-2 text-xs leading-relaxed text-slate-600">
          Tensorlake started the response loop for {memory.alert?.affectedSystem ?? "affected host"}.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Metric label="Duration" value={incidentElapsed} />
          <Metric label="Cycle" value={String(memory.cycleCount)} />
        </div>
        <PlaceholderButtons tone="incident" />
      </div>

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

function PlaceholderButtons({ tone }: { tone: "ok" | "idle" | "incident" }) {
  const styles =
    tone === "incident"
      ? "border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
      : tone === "ok"
      ? "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white";

  return (
    <div className="mt-5 grid grid-cols-2 gap-2">
      {["Acknowledge", "Assign", "Escalate", "Notes"].map((label) => (
        <button
          key={label}
          type="button"
          className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${styles}`}
          title={`${label} action placeholder`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-rose-100 bg-white px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-mono text-sm font-bold text-slate-900">{value}</p>
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
