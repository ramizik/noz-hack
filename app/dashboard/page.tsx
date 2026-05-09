"use client";

import { useEffect, useState } from "react";
import type { AgentMemory, Severity } from "@/lib/types";

const SEV_STYLES: Record<Severity, string> = {
  critical: "bg-red-600 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-yellow-500 text-black",
  low: "bg-green-600 text-white",
};

const TASK_DOT: Record<string, string> = {
  done: "bg-green-500",
  in_progress: "bg-yellow-400",
  pending: "bg-slate-600",
};

export default function DashboardPage() {
  const [incidents, setIncidents] = useState<AgentMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastPoll, setLastPoll] = useState<Date | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState<string | null>(null);

  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch("/api/agent-status");
        const data = await res.json();
        setIncidents(data.incidents ?? []);
        setLastPoll(new Date());
      } catch {
        // keep previous state on poll failure
      } finally {
        setLoading(false);
      }
    }

    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, []);

  const latest = [...incidents].sort(
    (a, b) => new Date(b.lastCycleAt).getTime() - new Date(a.lastCycleAt).getTime()
  )[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" style={{ fontFamily: "ui-monospace, monospace" }}>
      <header className="border-b border-slate-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-orange-400 font-bold text-lg">⬡</span>
          <span className="font-semibold tracking-tight">SentinelOps</span>
          <span className="text-slate-600 text-xs">Always-On Incident Commander</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          {lastPoll && <span>polled {lastPoll.toLocaleTimeString()}</span>}
          <button
            onClick={async () => {
              setTriggering(true);
              setTriggerMsg(null);
              try {
                const res = await fetch("/api/trigger", { method: "POST" });
                const data = await res.json();
                setTriggerMsg(res.ok ? `Triggered: ${data.requestId ?? "ok"}` : `Error: ${data.error}`);
              } catch {
                setTriggerMsg("Network error");
              } finally {
                setTriggering(false);
              }
            }}
            disabled={triggering}
            className="px-3 py-1 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30 disabled:opacity-50 transition-colors"
          >
            {triggering ? "Firing..." : "⚡ Trigger Agent"}
          </button>
          {triggerMsg && <span className="text-orange-400/70">{triggerMsg}</span>}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-green-400">LIVE</span>
          </div>
        </div>
      </header>

      <main className="px-6 py-6 max-w-5xl mx-auto space-y-5">
        {loading && (
          <p className="text-slate-500 text-sm animate-pulse">
            Connecting to Tensorlake memory sandbox...
          </p>
        )}

        {!loading && !latest && (
          <div className="border border-slate-800 rounded-lg p-8 text-center space-y-2">
            <p className="text-slate-400">No active incidents</p>
            <p className="text-slate-600 text-xs">
              POST /api/webhook to trigger agent cycle
            </p>
            <code className="text-slate-600 text-xs block mt-1">
              curl -X POST http://localhost:3000/api/webhook
            </code>
          </div>
        )}

        {latest && <IncidentPanel memory={latest} />}
      </main>
    </div>
  );
}

function IncidentPanel({ memory }: { memory: AgentMemory }) {
  const sevStyle = SEV_STYLES[memory.severity] ?? "bg-slate-600 text-white";

  const niaSources = memory.evidence
    .filter((e) => e.niaSourceRef)
    .reduce<Array<{ ref: string; source: string }>>((acc, e) => {
      if (!acc.find((x) => x.ref === e.niaSourceRef)) {
        acc.push({ ref: e.niaSourceRef!, source: e.source });
      }
      return acc;
    }, []);

  const sortedEvidence = [...memory.evidence].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="space-y-4">
      {/* Incident header */}
      <div className="border border-slate-800 rounded-lg p-4 flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${sevStyle}`}>
              {memory.severity.toUpperCase()}
            </span>
            <span className="text-slate-300 text-sm">{memory.classification}</span>
          </div>
          <p className="text-slate-500 text-xs">{memory.incidentId}</p>
        </div>
        <div className="text-right">
          <p className="text-slate-400 text-xs">
            Cycle <span className="text-white font-bold">{memory.cycleCount}</span>
          </p>
          <p className="text-slate-600 text-xs">
            {new Date(memory.lastCycleAt).toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Two-column: evidence + tasks */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border border-slate-800 rounded-lg p-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
            Evidence Timeline
          </h2>
          {sortedEvidence.length === 0 ? (
            <p className="text-slate-700 text-xs">No evidence yet</p>
          ) : (
            <ul className="space-y-3">
              {sortedEvidence.map((ev) => (
                <li key={ev.id} className="text-xs pl-3 border-l-2 border-slate-800">
                  <p className="text-slate-500">
                    {new Date(ev.timestamp).toLocaleTimeString()} · {ev.source}
                  </p>
                  <p className="text-slate-200 mt-0.5 leading-relaxed">{ev.content}</p>
                  {ev.niaSourceRef && (
                    <p className="text-orange-400/70 mt-0.5">↗ {ev.niaSourceRef}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border border-slate-800 rounded-lg p-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
            Active Tasks
          </h2>
          {memory.tasks.length === 0 ? (
            <p className="text-slate-700 text-xs">No tasks yet</p>
          ) : (
            <ul className="space-y-3">
              {memory.tasks.map((task) => (
                <li key={task.id} className="flex items-start gap-2 text-xs">
                  <span
                    className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${TASK_DOT[task.status] ?? "bg-slate-600"}`}
                  />
                  <div>
                    <p className="text-slate-200 leading-relaxed">{task.description}</p>
                    <p className="text-slate-600 mt-0.5">
                      {task.assignedTo} · {task.type} · {task.status}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Nia sources */}
      {niaSources.length > 0 && (
        <div className="border border-slate-800 rounded-lg p-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
            Nia Knowledge Sources
          </h2>
          <ul className="space-y-1.5">
            {niaSources.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span className="text-orange-400">→</span>
                <span className="text-slate-400">{s.source}</span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-500">{s.ref}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Handoff summary */}
      {memory.handoffSummary && (
        <div className="border border-amber-800/40 bg-amber-950/10 rounded-lg p-4">
          <h2 className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-2">
            Shift Handoff · Cycle {memory.cycleCount}
          </h2>
          <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
            {memory.handoffSummary}
          </p>
        </div>
      )}

      {/* Memory state indicator */}
      <div className="text-xs text-slate-700 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-teal-700" />
        Tensorlake sandbox: sentinelops-memory · {memory.evidence.length} evidence items · {memory.tasks.length} tasks persisted
      </div>
    </div>
  );
}
