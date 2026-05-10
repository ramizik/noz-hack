"use client";

import type { AgentMemory } from "@/lib/types";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type DashboardMode = "live" | "review";

type Props = {
  mode: DashboardMode;
  liveIncident: AgentMemory | null;
  reviewIncident: AgentMemory | null;
  onModeChange: (mode: DashboardMode) => void;
};

export function IncidentSwitcher({
  mode,
  liveIncident,
  reviewIncident,
  onModeChange,
}: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-3 px-1">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Incident View
        </span>
      </div>
      <div className="space-y-1.5">
        <ModeButton
          selected={mode === "live"}
          title="Live Demo"
          badge={liveIncident ? liveIncident.severity : "ready"}
          subtitle={
            liveIncident
              ? `${liveIncident.alert?.affectedSystem ?? liveIncident.incidentId} · cycle ${liveIncident.cycleCount}`
              : "Monitor current network and trigger the agent"
          }
          onClick={() => onModeChange("live")}
        />
        <ModeButton
          selected={mode === "review"}
          title="Past Incident Review"
          badge={reviewIncident ? reviewIncident.severity : "stored"}
          subtitle={
            reviewIncident
              ? `${reviewIncident.alert?.affectedSystem ?? reviewIncident.incidentId} · ${formatTime(reviewIncident.lastCycleAt)}`
              : "No historical incident loaded"
          }
          onClick={() => onModeChange("review")}
        />
      </div>
    </div>
  );
}

function ModeButton({
  selected,
  title,
  badge,
  subtitle,
  onClick,
}: {
  selected: boolean;
  title: string;
  badge: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-3 py-3 text-left transition ${
        selected
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold">{title}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
            selected ? "bg-white/15 text-white" : "bg-white text-slate-500"
          }`}
        >
          {badge}
        </span>
      </div>
      <p className={`mt-1 text-[11px] ${selected ? "text-slate-200" : "text-slate-500"}`}>
        {subtitle}
      </p>
    </button>
  );
}
