"use client";

import { PAGE_LABELS } from "@/lib/constants";
import { useTriggerCycle } from "../_hooks/useTriggerCycle";
import { PanelCard } from "./PanelCard";

type Props = {
  onCycleComplete: () => void;
};

export function EmptyIncident({ onCycleComplete }: Props) {
  const trigger = useTriggerCycle(onCycleComplete);

  return (
    <div className="px-6 py-16">
      <PanelCard className="mx-auto max-w-xl text-center">
        <div className="px-8 py-12">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04]">
            <span className="text-2xl">⏱</span>
          </div>
          <p className="mt-4 text-base font-medium text-slate-100">
            {PAGE_LABELS.EMPTY_INCIDENT_TITLE}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {PAGE_LABELS.EMPTY_INCIDENT_HINT}
          </p>
          <button
            type="button"
            onClick={trigger.trigger}
            disabled={trigger.pending}
            className="mt-6 rounded-md bg-emerald-500/15 px-4 py-2 text-xs font-medium text-emerald-300 ring-1 ring-inset ring-emerald-500/30 transition hover:bg-emerald-500/25 disabled:opacity-60"
          >
            {trigger.pending
              ? `⏳ ${PAGE_LABELS.CONSOLE_STREAMING}`
              : `▶ ${PAGE_LABELS.CONSOLE_TRIGGER}`}
          </button>
        </div>
      </PanelCard>
    </div>
  );
}
