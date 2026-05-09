import type { AgentMemory } from "@/lib/types";
import {
  BRAND,
  SEVERITY_PILL,
  STATUS_LABEL,
  STATUS_PILL,
} from "@/lib/constants";
import { deriveStatus } from "@/lib/incidentView";
import { Pill } from "./Pill";

type Props = {
  memory: AgentMemory | null;
  lastPoll: Date | null;
};

export function TopBar({ memory, lastPoll }: Props) {
  const status = memory ? deriveStatus(memory) : null;

  return (
    <header className="flex items-center justify-between border-b border-white/5 px-6 py-4">
      <div className="flex items-baseline gap-3">
        <span className="text-sm font-semibold tracking-tight text-slate-100">
          {BRAND.NAME}
        </span>
        <span className="text-xs text-slate-500">{BRAND.TAGLINE}</span>
      </div>
      <div className="flex items-center gap-2.5">
        {lastPoll && (
          <span className="hidden text-[11px] tabular-nums text-slate-500 sm:inline">
            polled {lastPoll.toLocaleTimeString()}
          </span>
        )}
        {memory && (
          <>
            <Pill tone={SEVERITY_PILL[memory.severity]}>{memory.severity}</Pill>
            {status && (
              <Pill tone={STATUS_PILL[status]}>{STATUS_LABEL[status]}</Pill>
            )}
          </>
        )}
      </div>
    </header>
  );
}
