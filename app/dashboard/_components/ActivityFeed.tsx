"use client";

import { useEffect, useRef, useState } from "react";
import { useTriggerCycle, useInjectAlert } from "../_hooks/useTriggerCycle";
import { useLiveLogStream, type LiveLog, type StreamPhase } from "../_hooks/useLiveLogStream";

const COUNTDOWN_SECONDS = 8;
const AUTO_COUNTDOWN_DELAY_MS = 10000; // start countdown 10s after monitoring begins regardless of agent

type DemoPhase = "idle" | "monitoring" | "countdown" | "incident";

type Props = {
  monitoringStatus: "all_clear" | "incident" | "idle";
  onCycleComplete?: () => void;
  onIncidentDetected?: () => void;
  resetSignal?: number;
  hidden?: boolean;
  streamPaused?: boolean;
  onHide?: () => void;
  onShow?: () => void;
  onToggleStream?: () => void;
};

type LogEntry = LiveLog & { kind: "log" };

const LEVEL_STYLES: Record<LiveLog["level"], { text: string; bg: string; label: string }> = {
  AGENT:    { text: "text-violet-700", bg: "bg-violet-100",  label: "Agent"    },
  INFO:     { text: "text-slate-500",  bg: "bg-slate-100",   label: "Info"     },
  WARN:     { text: "text-amber-700",  bg: "bg-amber-100",   label: "Warn"     },
  ERROR:    { text: "text-rose-600",   bg: "bg-rose-100",    label: "Error"    },
  CRITICAL: { text: "text-rose-700",   bg: "bg-rose-100",    label: "Critical" },
};

function formatTs(iso: string): string {
  const d = new Date(iso);
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

export function ActivityFeed({
  monitoringStatus,
  onCycleComplete,
  onIncidentDetected,
  resetSignal = 0,
  hidden = false,
  streamPaused = false,
  onHide,
  onShow,
  onToggleStream,
}: Props) {
  const [demoPhase, setDemoPhase] = useState<DemoPhase>("idle");
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const injectedRef = useRef(false);

  const streamPhase: StreamPhase =
    demoPhase === "monitoring" ? "monitoring"
    : demoPhase === "countdown" || demoPhase === "incident" ? "incident"
    : "idle";

  const { logs: liveLogs, clear } = useLiveLogStream(streamPhase, streamPaused);
  const trigger = useTriggerCycle(onCycleComplete);
  const injector = useInjectAlert(onCycleComplete);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    injectedRef.current = false;
    setDemoPhase("idle");
    setCountdown(COUNTDOWN_SECONDS);
    clear();
  }, [resetSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  // Transition to countdown when agent confirms all_clear OR after fixed delay
  useEffect(() => {
    if (monitoringStatus === "all_clear" && demoPhase === "monitoring") {
      setDemoPhase("countdown");
      setCountdown(COUNTDOWN_SECONDS);
    }
  }, [monitoringStatus, demoPhase]);

  useEffect(() => {
    if (demoPhase !== "monitoring") return;
    const id = setTimeout(() => {
      setDemoPhase((cur) => {
        if (cur === "monitoring") {
          setCountdown(COUNTDOWN_SECONDS);
          return "countdown";
        }
        return cur;
      });
    }, AUTO_COUNTDOWN_DELAY_MS);
    return () => clearTimeout(id);
  }, [demoPhase]);

  useEffect(() => {
    if (monitoringStatus === "incident" && demoPhase !== "incident") {
      setDemoPhase("incident");
      onIncidentDetected?.();
    }
  }, [monitoringStatus, demoPhase, onIncidentDetected]);

  useEffect(() => {
    if (demoPhase !== "countdown") return;
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(countdownRef.current!);
          if (!injectedRef.current) {
            injectedRef.current = true;
            injector.inject();
            setDemoPhase("incident");
          }
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [demoPhase]); // eslint-disable-line react-hooks/exhaustive-deps

  const liveEntries: LogEntry[] = liveLogs.map((l) => ({ ...l, kind: "log" as const }));

  const feed = liveEntries.sort(
    (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [feed.length]);

  function handleStartMonitoring() {
    injectedRef.current = false;
    setDemoPhase("monitoring");
    trigger.trigger();
  }

  const isLive = demoPhase !== "idle";

  if (hidden) {
    return (
      <div className="flex h-full flex-col justify-between rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                streamPaused ? "bg-amber-400" : isLive ? "animate-pulse bg-emerald-500" : "bg-slate-300"
              }`}
            />
            <span className="text-sm font-semibold text-slate-600">Network Activity Hidden</span>
          </div>
          <div className="flex items-center gap-2">
            {isLive && (
              <button
                type="button"
                onClick={onToggleStream}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-slate-100"
              >
                {streamPaused ? "Resume Logs" : "Stop Logs"}
              </button>
            )}
            <button
              type="button"
              onClick={onShow}
              className="rounded-md bg-slate-800 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-slate-700"
            >
              Show Logs
            </button>
          </div>
        </div>
        <div className="text-[11px] text-slate-400">
          <span className="tabular-nums">{feed.length} events</span>
          {streamPaused && <span className="ml-2 text-amber-600">generation stopped</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full transition-colors ${
              isLive ? "animate-pulse bg-emerald-500" : "bg-slate-300"
            }`}
          />
          <span className="text-sm font-semibold text-slate-700">Network Activity</span>
          {isLive && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-600 ring-1 ring-inset ring-emerald-200">
              Live
            </span>
          )}
          {demoPhase === "countdown" && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600 ring-1 ring-inset ring-amber-200">
              Alert inject in {countdown}s
            </span>
          )}
          {(trigger.error || injector.error) && (
            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600 ring-1 ring-inset ring-rose-200">
              Agent trigger failed
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isLive && (
            <button
              type="button"
              onClick={onToggleStream}
              className={`rounded-md border px-2.5 py-1 text-[11px] transition ${
                streamPaused
                  ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              {streamPaused ? "Resume Logs" : "Stop Logs"}
            </button>
          )}
          {isLive && (
            <button
              type="button"
              onClick={clear}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-500 transition hover:bg-slate-50"
            >
              Clear
            </button>
          )}
          {demoPhase === "idle" && (
            <button
              type="button"
              onClick={handleStartMonitoring}
              disabled={trigger.pending}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {trigger.pending ? "Starting…" : "▶ Start Monitoring"}
            </button>
          )}
          <button
            type="button"
            onClick={onHide}
            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-500 transition hover:bg-slate-50"
          >
            Hide
          </button>
        </div>
      </div>

      {/* Feed */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-3 [scrollbar-color:rgba(148,163,184,0.4)_transparent] [scrollbar-width:thin]"
      >
        {feed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-slate-400">No network activity yet</p>
            <p className="mt-1 text-xs text-slate-300">Press Start Monitoring to begin</p>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {feed.map((entry) => {
              const style = LEVEL_STYLES[entry.level];
              const isAgent = entry.level === "AGENT";
              const isCritical = entry.level === "CRITICAL";

              return (
                <li
                  key={entry.id}
                  className={`flex items-start gap-2.5 rounded-md px-2 py-1.5 transition hover:bg-slate-50
                    ${isAgent ? "bg-violet-50/60" : ""}
                    ${isCritical ? "bg-rose-50/60" : ""}
                  `}
                >
                  <span className="shrink-0 pt-0.5 font-mono text-[10px] tabular-nums text-slate-400">
                    {formatTs(entry.ts)}
                  </span>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${style.text} ${style.bg}`}
                  >
                    {style.label}
                  </span>
                  <span className="shrink-0 text-[11px] text-slate-400">[{entry.source}]</span>
                  <span
                    className={`text-[12px] leading-relaxed ${
                      isAgent
                        ? "font-medium text-violet-800"
                        : isCritical
                          ? "font-medium text-rose-700"
                          : "text-slate-700"
                    }`}
                  >
                    {entry.message}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {(trigger.error || injector.error) && (
          <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {trigger.error || injector.error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex shrink-0 items-center justify-end border-t border-slate-200 bg-slate-50 px-4 py-2 text-[10px] text-slate-400">
        <span className="tabular-nums">{feed.length} events captured</span>
      </div>
    </div>
  );
}
