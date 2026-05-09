"use client";

import type { AgentMemory } from "@/lib/types";
import { PAGE_LABELS, TEAM_LABELS } from "@/lib/constants";
import { splitAffectedSystems } from "@/lib/incidentView";
import { useElapsed } from "../_hooks/useElapsed";
import { Chip } from "./Pill";

type Props = {
  memory: AgentMemory;
};

function formatStartedAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function IncidentHero({ memory }: Props) {
  const startedAt = memory.createdAt ?? memory.lastCycleAt;
  const elapsed = useElapsed(startedAt);
  const affected = splitAffectedSystems(memory.alert?.affectedSystem);
  const category = memory.alert?.type
    ? memory.alert.type.replace(/_/g, " ")
    : TEAM_LABELS.CATEGORY_FALLBACK;

  return (
    <section className="px-6 pt-10 pb-6 text-center">
      <div className="flex items-center justify-center gap-3">
        <span className="text-3xl">⏱</span>
        <span className="font-mono text-5xl font-semibold tabular-nums text-slate-50">
          {elapsed}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {PAGE_LABELS.HERO_STARTED_PREFIX} {formatStartedAt(startedAt)}
      </p>

      <h1 className="mt-6 text-xl font-semibold tracking-tight text-slate-100 md:text-2xl">
        {memory.classification}
      </h1>

      <div className="mx-auto mt-6 max-w-5xl rounded-2xl border border-white/5 bg-white/[0.03] p-6 text-left">
        <dl className="grid grid-cols-2 gap-y-4 md:grid-cols-4">
          <MetaCell label={PAGE_LABELS.META_CATEGORY} value={category} capitalize />
          <MetaCell label={PAGE_LABELS.META_TEAM} value={TEAM_LABELS.TEAM_NAME} />
          <MetaCell
            label={PAGE_LABELS.META_REPORTED_BY}
            value={TEAM_LABELS.REPORTED_BY}
            mono
          />
          <div>
            <dt className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
              {PAGE_LABELS.META_AFFECTED}
            </dt>
            <dd className="mt-1.5 flex flex-wrap gap-1.5">
              {affected.length > 0 ? (
                affected.map((sys) => <Chip key={sys}>{sys}</Chip>)
              ) : (
                <span className="text-sm text-slate-500">—</span>
              )}
            </dd>
          </div>
        </dl>
        {memory.alert?.details && (
          <div className="mt-6">
            <dt className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
              {PAGE_LABELS.META_DESCRIPTION}
            </dt>
            <dd className="mt-1.5 text-sm leading-relaxed text-slate-200">
              {memory.alert.details}
            </dd>
          </div>
        )}
      </div>
    </section>
  );
}

function MetaCell({
  label,
  value,
  mono,
  capitalize,
}: {
  label: string;
  value: string;
  mono?: boolean;
  capitalize?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
        {label}
      </dt>
      <dd
        className={`mt-1.5 text-sm text-slate-100 ${mono ? "font-mono text-[13px]" : ""} ${capitalize ? "capitalize" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
