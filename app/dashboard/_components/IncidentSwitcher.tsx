"use client";

import type { AgentMemory } from "@/lib/types";

function labelFor(memory: AgentMemory) {
  if (memory.sourceKind === "prerecorded") return "Prerecorded incident";
  return "Live incident";
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = {
  incidents: AgentMemory[];
  selectedIncidentId: string | null;
  onSelect: (incidentId: string) => void;
};

export function IncidentSwitcher({
  incidents,
  selectedIncidentId,
  onSelect,
}: Props) {
  if (incidents.length <= 1) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          View Incident
        </span>
        <span className="text-[10px] text-slate-400">{incidents.length}/2</span>
      </div>
      <div className="space-y-1.5">
        {incidents.map((incident) => {
          const selected = incident.incidentId === selectedIncidentId;
          return (
            <button
              key={incident.incidentId}
              type="button"
              onClick={() => onSelect(incident.incidentId)}
              className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                selected
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold">{labelFor(incident)}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                    selected ? "bg-white/15 text-white" : "bg-white text-slate-500"
                  }`}
                >
                  {incident.severity}
                </span>
              </div>
              <p
                className={`mt-1 truncate text-[11px] ${
                  selected ? "text-slate-200" : "text-slate-500"
                }`}
              >
                {incident.alert?.affectedSystem ?? incident.incidentId} · cycle{" "}
                {incident.cycleCount} · {formatTime(incident.lastCycleAt)}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
