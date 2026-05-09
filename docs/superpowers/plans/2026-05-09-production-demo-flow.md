# Production Demo Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Single production target — agent runs real Tensorlake monitoring cycle ("all clear"), auto-injects bad alert after 15s, fires incident response, notifies user via toast.

**Architecture:** Agent reads `/memory/pending_alert.json` flag to choose mode (monitoring vs DFIR). Frontend orchestrates demo: fire monitoring cycle → watch for all_clear → 15s countdown → auto-inject alert → show incident toast. No mock mode anywhere.

**Tech Stack:** Python (Tensorlake agent), Next.js App Router, TypeScript, Tailwind, `tensorlake` npm + Python SDK

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `agents/python/sentinel_agent.py` | Two-mode cycle: monitoring vs incident |
| Modify | `scripts/setup_memory_sandbox.py` | Seed `normal_logs.json` into sandbox |
| Create | `app/api/inject-alert/route.ts` | Write alert flag to sandbox + fire agent |
| Modify | `app/api/agent-status/route.ts` | Read monitoring + incident memory, return unified state |
| Modify | `lib/tensorlake.ts` | Add `readMonitoringMemory`, `writeAlertFlag` |
| Modify | `lib/types.ts` | Add `MonitoringMemory`, extend `AgentStatusResponse` |
| Modify | `lib/constants.ts` | Remove `isMockMode`, add `INJECT_ALERT_ENDPOINT` |
| Delete | `lib/mockStore.ts` | No longer needed |
| Delete | `lib/mockMemory.ts` | No longer needed |
| Modify | `app/dashboard/_hooks/useAgentStatus.ts` | Consume `monitoringStatus`, `monitoringMessage` |
| Modify | `app/dashboard/_hooks/useTriggerCycle.ts` | Fix endpoint: `/api/trigger` not `/api/webhook` |
| Modify | `app/dashboard/_hooks/useLiveLogStream.ts` | Add `phase` param: monitoring streams NORMAL only, incident streams SUSPICIOUS+CRITICAL |
| Modify | `app/dashboard/_components/NetworkConsole.tsx` | Countdown, auto-inject, demo orchestration |
| Modify | `app/dashboard/_components/IncidentStatusPanel.tsx` | Show monitoring/all-clear state when no incident |
| Modify | `app/dashboard/_components/TopBar.tsx` | Show monitoring badge |
| Modify | `app/dashboard/page.tsx` | Pass monitoringStatus down, render toast |
| Modify | `CLAUDE.md` | Add production-only rule |

---

## Task 1: Add types for monitoring state

**Files:**
- Modify: `lib/types.ts`

- [ ] **Add `MonitoringMemory` interface and extend `AgentStatusResponse`**

Replace the `AgentStatusResponse` interface in `lib/types.ts` with:

```ts
export interface MonitoringMemory {
  status: "all_clear";
  message: string;
  lastCheckedAt: string;
  cycleCount: number;
}

export interface AgentStatusResponse {
  incidents: AgentMemory[];
  agent: AgentSummary;
  niaRetrievals: NiaRetrieval[];
  timeline: DerivedTimelineEvent[];
  agentStatus: "active" | "sleeping";
  nextCycleInSeconds: number;
  phase: IncidentPhaseStep;
  monitoringStatus: "all_clear" | "incident" | "idle";
  monitoringMessage: string | null;
  monitoringLastCheckedAt: string | null;
}
```

- [ ] **Commit**

```bash
git add lib/types.ts
git commit -m "feat: add MonitoringMemory type and monitoring fields to AgentStatusResponse"
```

---

## Task 2: Add Tensorlake helpers for monitoring memory

**Files:**
- Modify: `lib/tensorlake.ts`

- [ ] **Add `readMonitoringMemory` and `writeAlertFlag` to `lib/tensorlake.ts`**

Full updated file:

```ts
import { Sandbox } from "tensorlake";
import type { AgentMemory, MonitoringMemory } from "./types";

const MEMORY_DIR = "/memory";
const INCIDENT_ID = "INC-2026-001";

async function getMemorySandbox(): Promise<Sandbox> {
  const sandboxId = process.env.TENSORLAKE_MEMORY_SANDBOX_ID;
  if (!sandboxId) throw new Error("TENSORLAKE_MEMORY_SANDBOX_ID not set");
  return Sandbox.connect({ sandboxId });
}

export async function readMemory(_incidentId?: string): Promise<AgentMemory | null> {
  try {
    const sb = await getMemorySandbox();
    const bytes = await sb.readFile(`${MEMORY_DIR}/${INCIDENT_ID}.json`);
    return JSON.parse(new TextDecoder().decode(bytes)) as AgentMemory;
  } catch {
    return null;
  }
}

export async function listAllMemory(): Promise<AgentMemory[]> {
  const memory = await readMemory();
  return memory ? [memory] : [];
}

export async function readMonitoringMemory(): Promise<MonitoringMemory | null> {
  try {
    const sb = await getMemorySandbox();
    const bytes = await sb.readFile(`${MEMORY_DIR}/monitoring.json`);
    return JSON.parse(new TextDecoder().decode(bytes)) as MonitoringMemory;
  } catch {
    return null;
  }
}

export async function writeAlertFlag(alert: object): Promise<void> {
  const sb = await getMemorySandbox();
  await sb.writeFile(
    `${MEMORY_DIR}/pending_alert.json`,
    Buffer.from(JSON.stringify(alert))
  );
}
```

- [ ] **Commit**

```bash
git add lib/tensorlake.ts
git commit -m "feat: add readMonitoringMemory and writeAlertFlag to tensorlake helpers"
```

---

## Task 3: Create `POST /api/inject-alert` route

**Files:**
- Create: `app/api/inject-alert/route.ts`

- [ ] **Create the inject-alert route**

```ts
import { NextResponse } from "next/server";
import { writeAlertFlag } from "@/lib/tensorlake";
import { SEED_ALERTS } from "@/lib/seedAlerts";

const APP_NAME = "sentinel_agent_cycle";

export const maxDuration = 30;

export async function POST() {
  const apiKey = process.env.TENSORLAKE_API_KEY;
  const sandboxId = process.env.TENSORLAKE_MEMORY_SANDBOX_ID;
  if (!apiKey || !sandboxId) {
    return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
  }

  const alert = { ...SEED_ALERTS[0], timestamp: new Date().toISOString() };

  await writeAlertFlag(alert);

  const res = await fetch(`https://api.tensorlake.ai/applications/${APP_NAME}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: "null",
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text }, { status: res.status });
  }

  const data = await res.json().catch(() => ({}));
  return NextResponse.json({ status: "injected", requestId: data.request_id ?? null });
}
```

- [ ] **Verify endpoint exists** by running the dev server and calling:

```bash
curl -X POST http://localhost:3000/api/inject-alert
# Expected: {"status":"injected","requestId":"..."}
```

- [ ] **Commit**

```bash
git add app/api/inject-alert/route.ts
git commit -m "feat: add POST /api/inject-alert — writes alert flag to sandbox and fires agent"
```

---

## Task 4: Update `GET /api/agent-status` to include monitoring state

**Files:**
- Modify: `app/api/agent-status/route.ts`

- [ ] **Update the route to read both memory files**

Full updated file:

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { listAllMemory, readMonitoringMemory } from "@/lib/tensorlake";
import { summarizeAgent } from "@/lib/agentSummary";
import { deriveNiaRetrievals, deriveTimeline, deriveAgentStatus, derivePhase } from "@/lib/deriveView";
import type { AgentStatusResponse } from "@/lib/types";

export const maxDuration = 30;

export async function GET(_req: NextRequest) {
  const [incidents, monitoring] = await Promise.all([
    listAllMemory(),
    readMonitoringMemory(),
  ]);

  const latest = incidents.sort(
    (a, b) => new Date(b.lastCycleAt).getTime() - new Date(a.lastCycleAt).getTime()
  )[0] ?? null;

  const { agentStatus, nextCycleInSeconds } = deriveAgentStatus(latest);

  const monitoringStatus = latest
    ? "incident"
    : monitoring
    ? "all_clear"
    : "idle";

  const response: AgentStatusResponse = {
    incidents,
    agent: summarizeAgent(incidents),
    niaRetrievals: latest ? deriveNiaRetrievals(latest) : [],
    timeline: latest ? deriveTimeline(latest) : [],
    agentStatus,
    nextCycleInSeconds,
    phase: derivePhase(latest),
    monitoringStatus,
    monitoringMessage: monitoring?.message ?? null,
    monitoringLastCheckedAt: monitoring?.lastCheckedAt ?? null,
  };

  return NextResponse.json(response);
}
```

- [ ] **Commit**

```bash
git add app/api/agent-status/route.ts
git commit -m "feat: agent-status returns monitoringStatus, monitoringMessage, monitoringLastCheckedAt"
```

---

## Task 5: Remove mock mode

**Files:**
- Delete: `lib/mockStore.ts`
- Delete: `lib/mockMemory.ts`
- Modify: `lib/constants.ts`

- [ ] **Delete mock files**

```bash
git rm lib/mockStore.ts lib/mockMemory.ts
```

- [ ] **Update `lib/constants.ts`** — remove `isMockMode`, add `INJECT_ALERT_ENDPOINT`

Remove these lines from `lib/constants.ts`:
```ts
export const ENV_KEYS = {
  DEMO_MOCK_MODE: "DEMO_MOCK_MODE",
} as const;

export function isMockMode(): boolean {
  return process.env[ENV_KEYS.DEMO_MOCK_MODE] === "true";
}
```

Add this line near the other endpoint constants:
```ts
export const INJECT_ALERT_ENDPOINT = "/api/inject-alert";
```

- [ ] **Verify TypeScript compiles** (no imports of deleted files remain):

```bash
npx tsc --noEmit
```

Expected: no errors referencing `mockStore` or `mockMemory`.

- [ ] **Commit**

```bash
git add lib/constants.ts
git commit -m "chore: remove mock mode — delete mockStore, mockMemory, isMockMode"
```

---

## Task 6: Update `useAgentStatus` hook to expose monitoring fields

**Files:**
- Modify: `app/dashboard/_hooks/useAgentStatus.ts`

- [ ] **Add monitoring state fields to the hook**

Add these imports at the top:
```ts
import type {
  AgentMemory,
  AgentStatusResponse,
  AgentSummary,
  NiaRetrieval,
  DerivedTimelineEvent,
  IncidentPhaseStep,
} from "@/lib/types";
```

Update the `AgentStatus` interface to add:
```ts
interface AgentStatus {
  incidents: AgentMemory[];
  latest: AgentMemory | null;
  agent: AgentSummary;
  niaRetrievals: NiaRetrieval[];
  timeline: DerivedTimelineEvent[];
  agentStatus: "active" | "sleeping";
  nextCycleInSeconds: number;
  phase: IncidentPhaseStep;
  monitoringStatus: "all_clear" | "incident" | "idle";
  monitoringMessage: string | null;
  monitoringLastCheckedAt: string | null;
  loading: boolean;
  lastPoll: Date | null;
  refresh: () => Promise<void>;
}
```

Add state variables inside `useAgentStatus`:
```ts
const [monitoringStatus, setMonitoringStatus] = useState<"all_clear" | "incident" | "idle">("idle");
const [monitoringMessage, setMonitoringMessage] = useState<string | null>(null);
const [monitoringLastCheckedAt, setMonitoringLastCheckedAt] = useState<string | null>(null);
```

Inside the `fetchStatus` callback, add after the existing `setPhase` call:
```ts
setMonitoringStatus(data.monitoringStatus ?? "idle");
setMonitoringMessage(data.monitoringMessage ?? null);
setMonitoringLastCheckedAt(data.monitoringLastCheckedAt ?? null);
```

Update the return object to include:
```ts
return {
  incidents,
  latest,
  agent,
  niaRetrievals,
  timeline,
  agentStatus,
  nextCycleInSeconds,
  phase,
  monitoringStatus,
  monitoringMessage,
  monitoringLastCheckedAt,
  loading,
  lastPoll,
  refresh,
};
```

- [ ] **Commit**

```bash
git add app/dashboard/_hooks/useAgentStatus.ts
git commit -m "feat: useAgentStatus exposes monitoringStatus, monitoringMessage, monitoringLastCheckedAt"
```

---

## Task 7: Fix `useTriggerCycle` endpoint + add `useInjectAlert` hook

**Files:**
- Modify: `app/dashboard/_hooks/useTriggerCycle.ts`

- [ ] **Fix endpoint and add inject variant**

Full updated file:

```ts
"use client";

import { useCallback, useState } from "react";
import { INJECT_ALERT_ENDPOINT } from "@/lib/constants";

const TRIGGER_ENDPOINT = "/api/trigger";

export function useTriggerCycle(onComplete?: () => void) {
  const [pending, setPending] = useState(false);

  const trigger = useCallback(async () => {
    setPending(true);
    try {
      await fetch(TRIGGER_ENDPOINT, { method: "POST" });
      onComplete?.();
    } finally {
      setPending(false);
    }
  }, [onComplete]);

  return { pending, trigger };
}

export function useInjectAlert(onComplete?: () => void) {
  const [pending, setPending] = useState(false);

  const inject = useCallback(async () => {
    setPending(true);
    try {
      await fetch(INJECT_ALERT_ENDPOINT, { method: "POST" });
      onComplete?.();
    } finally {
      setPending(false);
    }
  }, [onComplete]);

  return { pending, inject };
}
```

- [ ] **Commit**

```bash
git add app/dashboard/_hooks/useTriggerCycle.ts
git commit -m "feat: fix trigger endpoint, add useInjectAlert hook"
```

---

## Task 8: Update `useLiveLogStream` to support demo phases

**Files:**
- Modify: `app/dashboard/_hooks/useLiveLogStream.ts`

- [ ] **Add `streamPhase` parameter**

Replace the function signature and effect:

```ts
export type StreamPhase = "idle" | "monitoring" | "incident";

export function useLiveLogStream(streamPhase: StreamPhase) {
  const [logs, setLogs] = useState<LiveLog[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const normalIdx = useRef(0);
  const suspIdx = useRef(0);
  const critIdx = useRef(0);
  const elapsed = useRef(0);

  useEffect(() => {
    if (streamPhase === "idle") return;

    // Reset on phase change
    elapsed.current = 0;
    normalIdx.current = 0;
    suspIdx.current = 0;
    critIdx.current = 0;

    function emit() {
      let tpl: Tpl;
      let delay: number;

      if (streamPhase === "monitoring") {
        // Continuously stream normal logs only
        tpl = NORMAL[normalIdx.current++ % NORMAL.length];
        delay = 600 + Math.random() * 600;
      } else {
        // Incident phase: suspicious → critical
        const t = elapsed.current;
        if (t < 6000) {
          const pickSusp = Math.random() < 0.6 && suspIdx.current < SUSPICIOUS.length;
          tpl = pickSusp ? SUSPICIOUS[suspIdx.current++] : NORMAL[normalIdx.current++ % NORMAL.length];
          delay = 400 + Math.random() * 500;
        } else if (critIdx.current < CRITICAL.length) {
          tpl = CRITICAL[critIdx.current++];
          delay = 600 + Math.random() * 500;
        } else {
          tpl = NORMAL[normalIdx.current++ % NORMAL.length];
          delay = 800 + Math.random() * 800;
        }
      }

      setLogs((prev) => [...prev, makeLog(tpl)]);
      elapsed.current += delay;
      timer.current = setTimeout(emit, delay);
    }

    emit();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [streamPhase]);

  const clear = () => setLogs([]);
  return { logs, clear };
}
```

- [ ] **Commit**

```bash
git add app/dashboard/_hooks/useLiveLogStream.ts
git commit -m "feat: useLiveLogStream supports monitoring/incident stream phases"
```

---

## Task 9: Rewrite `NetworkConsole` with countdown and auto-inject orchestration

**Files:**
- Modify: `app/dashboard/_components/NetworkConsole.tsx`

- [ ] **Replace NetworkConsole with demo orchestration logic**

The component receives `monitoringStatus` and orchestrates: idle → monitoring → countdown → incident.

Full updated file:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { CONSOLE_LEVEL_TONE } from "@/lib/constants";
import { buildConsoleLogs } from "@/lib/incidentView";
import type { AgentMemory } from "@/lib/types";
import { useTriggerCycle, useInjectAlert } from "../_hooks/useTriggerCycle";
import { useLiveLogStream, type LiveLog, type StreamPhase } from "../_hooks/useLiveLogStream";

const COUNTDOWN_SECONDS = 15;

type DemoPhase = "idle" | "monitoring" | "countdown" | "incident";

type Props = {
  memory: AgentMemory | null;
  monitoringStatus: "all_clear" | "incident" | "idle";
  onCycleComplete?: () => void;
  onIncidentDetected?: () => void;
};

function formatTs(iso: string): string {
  const d = new Date(iso);
  return (
    [d.getHours(), d.getMinutes(), d.getSeconds()]
      .map((n) => String(n).padStart(2, "0"))
      .join(":") +
    "." +
    String(d.getMilliseconds()).padStart(3, "0")
  );
}

export function NetworkConsole({ memory, monitoringStatus, onCycleComplete, onIncidentDetected }: Props) {
  const [demoPhase, setDemoPhase] = useState<DemoPhase>("idle");
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const injectedRef = useRef(false);

  const streamPhase: StreamPhase =
    demoPhase === "monitoring" ? "monitoring"
    : demoPhase === "countdown" || demoPhase === "incident" ? "incident"
    : "idle";

  const { logs: liveLogs, clear } = useLiveLogStream(streamPhase);
  const trigger = useTriggerCycle(onCycleComplete);
  const injector = useInjectAlert(onCycleComplete);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Watch for all_clear → start countdown
  useEffect(() => {
    if (monitoringStatus === "all_clear" && demoPhase === "monitoring") {
      setDemoPhase("countdown");
      setCountdown(COUNTDOWN_SECONDS);
    }
  }, [monitoringStatus, demoPhase]);

  // Incident arrived from memory → upgrade phase
  useEffect(() => {
    if (monitoringStatus === "incident" && demoPhase !== "incident") {
      setDemoPhase("incident");
      onIncidentDetected?.();
    }
  }, [monitoringStatus, demoPhase, onIncidentDetected]);

  // Countdown tick + auto-inject
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

  const agentLogs: LiveLog[] = buildConsoleLogs(memory).map((l) => ({
    id: l.id,
    ts: l.ts,
    level: l.level,
    source: l.source,
    message: l.message,
  }));

  const allLogs = [...liveLogs, ...agentLogs].sort(
    (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [allLogs.length]);

  function handleStartMonitoring() {
    injectedRef.current = false;
    setDemoPhase("monitoring");
    trigger.trigger();
  }

  const isLive = demoPhase !== "idle";

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/60 to-slate-950/80">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-black/40 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
          </span>
          <span className="ml-2 font-mono text-xs text-slate-400">
            network-console@sentinel:~
          </span>
          {isLive && (
            <span className="ml-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              LIVE
            </span>
          )}
          {demoPhase === "countdown" && (
            <span className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300 ring-1 ring-inset ring-amber-500/30">
              Alert inject in {countdown}s
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isLive && (
            <button
              type="button"
              onClick={clear}
              className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-300 transition hover:bg-white/[0.08]"
            >
              ✕ Clear
            </button>
          )}
          {demoPhase === "idle" && (
            <button
              type="button"
              onClick={handleStartMonitoring}
              disabled={trigger.pending}
              className="rounded-md bg-emerald-500/15 px-3 py-1.5 text-[11px] font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-500/30 transition hover:bg-emerald-500/25 disabled:opacity-60"
            >
              {trigger.pending ? "⏳ Starting…" : "▶ Start Monitoring"}
            </button>
          )}
        </div>
      </div>

      {/* Terminal */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto bg-[#04060a] px-5 py-4 font-mono text-[12.5px] leading-relaxed [scrollbar-color:rgba(52,211,153,0.2)_transparent] [scrollbar-width:thin]"
        >
          {allLogs.length === 0 ? (
            <div className="space-y-1.5 text-slate-600">
              <p>
                <span className="text-emerald-400">$</span> sentinel-cli watch --env prod
              </p>
              <p>// Agent idle — press &quot;Start Monitoring&quot; to begin</p>
              <p>
                <span className="inline-block h-[0.9em] w-2.5 animate-pulse bg-emerald-400/70 align-middle" />
              </p>
            </div>
          ) : (
            <ul className="space-y-px">
              {allLogs.map((log) => (
                <li
                  key={log.id}
                  className="flex gap-2 whitespace-pre-wrap rounded px-1 py-[2px] transition hover:bg-emerald-500/[0.04]"
                >
                  <span className="shrink-0 tabular-nums text-slate-600">
                    {formatTs(log.ts)}
                  </span>
                  <span
                    className={`w-16 shrink-0 ${CONSOLE_LEVEL_TONE[log.level]}`}
                    style={{ textShadow: "0 0 6px currentColor" }}
                  >
                    {log.level}
                  </span>
                  <span className="shrink-0 text-slate-500">[{log.source}]</span>
                  <span className="text-slate-200">{log.message}</span>
                </li>
              ))}
              <li className="flex gap-2 pt-1">
                <span className="text-emerald-400">$</span>
                <span className="inline-block h-[0.9em] w-2.5 animate-pulse bg-emerald-400/80 align-middle" />
              </li>
            </ul>
          )}
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, rgba(148,163,184,0.025) 0px, rgba(148,163,184,0.025) 1px, transparent 1px, transparent 3px)",
          }}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-black/60 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/70 to-transparent" />
      </div>

      {/* Footer */}
      <div className="flex shrink-0 items-center justify-between border-t border-white/5 bg-black/40 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
        <span>
          <span className={isLive ? "text-emerald-400" : "text-slate-600"}>●</span>{" "}
          sentinelops-memory · prod environment
        </span>
        <span className="tabular-nums">{allLogs.length} events</span>
      </div>
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add app/dashboard/_components/NetworkConsole.tsx
git commit -m "feat: NetworkConsole — monitoring phase, 15s countdown, auto-inject orchestration"
```

---

## Task 10: Update `IncidentStatusPanel` to show monitoring / all-clear state

**Files:**
- Modify: `app/dashboard/_components/IncidentStatusPanel.tsx`

- [ ] **Add monitoring state prop and idle state variants**

Add `monitoringStatus` and `monitoringMessage` to Props:
```ts
type Props = {
  memory: AgentMemory | null;
  phase: IncidentPhaseStep;
  monitoringStatus: "all_clear" | "incident" | "idle";
  monitoringMessage: string | null;
};
```

Replace the `if (!memory)` early return with:
```tsx
if (!memory) {
  if (monitoringStatus === "all_clear") {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-950/10 px-6 py-12 text-center">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-900/40">
          <span className="h-3 w-3 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
        </div>
        <p className="text-sm font-semibold text-emerald-300">All Clear</p>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          {monitoringMessage ?? "No anomalies detected. Agent monitoring."}
        </p>
        <p className="mt-3 text-[10px] text-slate-700 uppercase tracking-widest">
          Sentinel monitoring active
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] px-6 py-12 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-800">
        <span className="text-xl">⏱</span>
      </div>
      <p className="text-sm font-medium text-slate-300">Agent on watch</p>
      <p className="mt-1 text-xs text-slate-600">
        No active incident — press Start Monitoring
      </p>
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add app/dashboard/_components/IncidentStatusPanel.tsx
git commit -m "feat: IncidentStatusPanel shows all-clear state with monitoring message"
```

---

## Task 11: Update `TopBar` to show monitoring badge

**Files:**
- Modify: `app/dashboard/_components/TopBar.tsx`

- [ ] **Add `monitoringStatus` prop and badge**

Add `monitoringStatus` to Props:
```ts
type Props = {
  memory: AgentMemory | null;
  lastPoll: Date | null;
  agentStatus: "active" | "sleeping";
  nextCycleInSeconds: number;
  monitoringStatus: "all_clear" | "incident" | "idle";
};
```

Update the function signature:
```ts
export function TopBar({ memory, lastPoll, agentStatus, nextCycleInSeconds, monitoringStatus }: Props) {
```

In the center section (where incident ID is shown), add before the `{memory && ...}` block:
```tsx
{!memory && monitoringStatus === "all_clear" && (
  <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 ring-1 ring-inset ring-emerald-500/20">
    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
    <span className="text-xs text-emerald-300">Monitoring · All Clear</span>
  </div>
)}
```

- [ ] **Commit**

```bash
git add app/dashboard/_components/TopBar.tsx
git commit -m "feat: TopBar shows monitoring / all-clear badge"
```

---

## Task 12: Update dashboard page — wire monitoring props and incident toast

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Add toast state, wire all new props**

Full updated file:

```tsx
"use client";

import { useCallback, useState } from "react";
import { useAgentStatus } from "./_hooks/useAgentStatus";
import { TopBar } from "./_components/TopBar";
import { IncidentStatusPanel } from "./_components/IncidentStatusPanel";
import { NetworkConsole } from "./_components/NetworkConsole";
import { CenterPanel } from "./_components/CenterPanel";
import { NiaNavigator } from "./_components/NiaNavigator";
import { HandoffSummary } from "./_components/HandoffSummary";

export default function DashboardPage() {
  const {
    latest,
    loading,
    lastPoll,
    niaRetrievals,
    timeline,
    agentStatus,
    nextCycleInSeconds,
    phase,
    monitoringStatus,
    monitoringMessage,
    refresh,
  } = useAgentStatus();

  const [showIncidentToast, setShowIncidentToast] = useState(false);

  const handleIncidentDetected = useCallback(() => {
    setShowIncidentToast(true);
    setTimeout(() => setShowIncidentToast(false), 8000);
  }, []);

  return (
    <div
      className="flex h-screen flex-col overflow-hidden bg-[#0a0e17] text-slate-100"
      style={{ fontFamily: "ui-monospace, monospace" }}
    >
      {/* Incident toast */}
      {showIncidentToast && (
        <div className="fixed right-5 top-5 z-50 flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-950/90 px-5 py-4 shadow-2xl ring-1 ring-rose-500/20 backdrop-blur-sm animate-in slide-in-from-top-2">
          <span className="mt-0.5 h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-rose-400 shadow-[0_0_10px_rgba(248,113,113,0.9)]" />
          <div>
            <p className="text-sm font-bold text-rose-300">INCIDENT DETECTED</p>
            <p className="mt-0.5 text-xs text-slate-400">
              prod-db-01 · Unusual outbound traffic — agent responding
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowIncidentToast(false)}
            className="ml-4 text-slate-600 hover:text-slate-300 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top bar */}
      <TopBar
        memory={latest ?? null}
        lastPoll={lastPoll}
        agentStatus={agentStatus}
        nextCycleInSeconds={nextCycleInSeconds}
        monitoringStatus={monitoringStatus}
      />

      {/* Three-column body */}
      <div className="flex min-h-0 flex-1 gap-0 overflow-hidden">

        {/* LEFT — Incident status (22%) */}
        <div className="flex w-[22%] shrink-0 flex-col gap-3 border-r border-white/5 p-4 overflow-y-auto [scrollbar-width:none]">
          {loading && (
            <p className="animate-pulse text-center text-xs text-slate-600 py-4">
              Connecting…
            </p>
          )}
          <IncidentStatusPanel
            memory={latest ?? null}
            phase={phase}
            monitoringStatus={monitoringStatus}
            monitoringMessage={monitoringMessage}
          />
        </div>

        {/* CENTER — Network console + Timeline + Tasks (44%) */}
        <div className="flex min-h-0 w-[44%] flex-col gap-3 border-r border-white/5 p-4">
          <div className="min-h-0" style={{ flex: "0 0 54%" }}>
            <NetworkConsole
              memory={latest ?? null}
              monitoringStatus={monitoringStatus}
              onCycleComplete={refresh}
              onIncidentDetected={handleIncidentDetected}
            />
          </div>
          <div className="min-h-0 flex-1">
            <CenterPanel
              timeline={timeline}
              tasks={latest?.tasks ?? []}
            />
          </div>
        </div>

        {/* RIGHT — Nia Navigator (34%) */}
        <div className="flex min-h-0 w-[34%] flex-col p-4">
          <NiaNavigator retrievals={niaRetrievals} />
        </div>
      </div>

      {/* Bottom — Handoff summary */}
      {latest?.handoffSummary && (
        <div className="shrink-0 border-t border-amber-500/15 px-6 py-4 max-h-[35vh] overflow-y-auto [scrollbar-width:thin]">
          <HandoffSummary
            summary={latest.handoffSummary}
            cycleCount={latest.cycleCount}
            lastCycleAt={latest.lastCycleAt}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Check TypeScript** (no prop-type errors):

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: dashboard — incident toast, monitoring props wired to all components"
```

---

## Task 13: Update agent — two-mode cycle (monitoring + incident)

**Files:**
- Modify: `agents/python/sentinel_agent.py`

- [ ] **Replace `_cycle()` with two-mode logic**

Full updated `agents/python/sentinel_agent.py`:

```python
#!/usr/bin/env python3
"""SentinelOps — Tensorlake Application: always-on incident response agent."""

from __future__ import annotations

import asyncio
import json
import os
import sys
import time

from tensorlake.applications import Image, application, function

NIA_BASE = "https://apigcp.trynia.ai/v2"
INCIDENT_ID = "INC-2026-001"
MEMORY_DIR = "/memory"

SEED_ALERT = {
    "id": "alert-001",
    "type": "data_exfiltration",
    "affectedSystem": "prod-db-01",
    "details": (
        "Unusual outbound traffic detected at 3am. "
        "2GB transferred to unknown external IP 203.0.113.42."
    ),
    "timestamp": "2026-05-09T03:00:00Z",
}

sentinel_image = Image().run(
    "pip install --quiet httpx openai tensorlake"
)


@application()
@function(
    image=sentinel_image,
    timeout=600,
    secrets=[
        "NIA_API_KEY",
        "OPENAI_API_KEY",
        "TENSORLAKE_API_KEY",
        "TENSORLAKE_MEMORY_SANDBOX_ID",
    ],
)
def sentinel_agent_cycle() -> dict:
    """Entry point: one full agent cycle — monitoring or incident response."""
    return asyncio.run(_cycle())


async def _cycle() -> dict:
    from tensorlake.sandbox import AsyncSandbox

    sandbox_id = os.environ["TENSORLAKE_MEMORY_SANDBOX_ID"]
    sb = await AsyncSandbox.connect(sandbox_id)

    info = await sb.info()
    if str(info.status).lower() in ("suspended", "suspending"):
        print("[sentinel] Resuming sandbox...", flush=True)
        await sb.resume()

    await sb.run("mkdir", ["-p", MEMORY_DIR])

    # Check for pending alert flag
    alert_data = None
    try:
        raw = await sb.read_file(f"{MEMORY_DIR}/pending_alert.json")
        alert_data = json.loads(raw.value.decode("utf-8"))
        # Delete flag immediately so it doesn't re-trigger
        await sb.run("rm", ["-f", f"{MEMORY_DIR}/pending_alert.json"])
        print("[sentinel] Alert flag found — switching to incident mode", flush=True)
    except Exception:
        pass

    if alert_data:
        return await _incident_cycle(sb, alert_data)
    else:
        return await _monitoring_cycle(sb)


# ---------------------------------------------------------------------------
# Monitoring mode — scan logs, report all clear
# ---------------------------------------------------------------------------

async def _monitoring_cycle(sb) -> dict:
    from openai import OpenAI

    print("[sentinel] Monitoring mode — scanning logs", flush=True)

    # Read pre-seeded normal logs if available
    normal_logs = []
    try:
        raw = await sb.read_file(f"{MEMORY_DIR}/normal_logs.json")
        normal_logs = json.loads(raw.value.decode("utf-8"))
    except Exception:
        normal_logs = [
            {"source": "DNS", "message": "prod-api.corp.local queries nominal"},
            {"source": "FW", "message": "No anomalous outbound connections"},
            {"source": "IDS", "message": "No signatures matched in last 5 minutes"},
        ]

    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    resp = client.chat.completions.create(
        model="gpt-4o",
        temperature=0,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a security monitoring agent. "
                    "Scan the provided network logs and report status. "
                    "Keep response under 30 words."
                ),
            },
            {
                "role": "user",
                "content": f"Network logs (last 5 minutes): {json.dumps(normal_logs[:5])}\nReport status:",
            },
        ],
    )
    message = resp.choices[0].message.content.strip()

    state = {
        "status": "all_clear",
        "message": message,
        "lastCheckedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "cycleCount": 1,
    }

    await sb.write_file(
        f"{MEMORY_DIR}/monitoring.json",
        json.dumps(state, indent=2).encode("utf-8"),
    )

    print(f"[sentinel] Monitoring cycle done. Status: all_clear. Message: {message}", flush=True)
    return state


# ---------------------------------------------------------------------------
# Incident mode — full DFIR pipeline
# ---------------------------------------------------------------------------

async def _incident_cycle(sb, alert: dict) -> dict:
    from openai import OpenAI

    # Read prior incident memory
    prior: dict | None = None
    try:
        raw = await sb.read_file(f"{MEMORY_DIR}/{INCIDENT_ID}.json")
        prior = json.loads(raw.value.decode("utf-8"))
    except Exception:
        pass

    cycle_count = int((prior or {}).get("cycleCount", 0)) + 1
    print(f"[sentinel] Incident cycle {cycle_count} starting", flush=True)

    query = (
        f"{alert.get('type', 'security_incident')} {alert.get('affectedSystem', 'host')} "
        "incident response runbook data exfiltration"
    )
    nia_results = _nia_search(query)
    print(f"[sentinel] Nia returned {len(nia_results)} results", flush=True)

    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    classification = _classify(client, alert, nia_results, prior)
    ts = int(time.time() * 1000)
    tasks = _gen_tasks(client, INCIDENT_ID, alert, nia_results, cycle_count, ts)
    evidence = _gen_evidence(client, INCIDENT_ID, alert, nia_results, cycle_count, ts)

    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    state: dict = {
        "incidentId": INCIDENT_ID,
        "severity": classification["severity"],
        "classification": classification["classification"],
        "tasks": [*(prior or {}).get("tasks", []), *tasks],
        "evidence": [*(prior or {}).get("evidence", []), *evidence],
        "cycleCount": cycle_count,
        "lastCycleAt": now,
        "createdAt": (prior or {}).get("createdAt", now),
        "alert": alert,
    }
    if cycle_count >= 2:
        state["handoffSummary"] = _gen_handoff(client, state, nia_results)

    await sb.write_file(
        f"{MEMORY_DIR}/{INCIDENT_ID}.json",
        json.dumps(state, indent=2).encode("utf-8"),
    )

    print(
        f"[sentinel] Incident cycle {cycle_count} done. "
        f"Severity: {state['severity']}. Tasks: {len(state['tasks'])}.",
        flush=True,
    )
    return state


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _nia_search(query: str) -> list:
    import httpx

    api_key = os.environ.get("NIA_API_KEY", "")
    if not api_key:
        return []
    try:
        r = httpx.get(
            f"{NIA_BASE}/contexts/semantic-search",
            params={"q": query, "limit": 3},
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=15,
        )
        r.raise_for_status()
        data = r.json()
        return (data.get("results") or data or [])[:3]
    except Exception as exc:
        print(f"[nia] search failed: {exc}", file=sys.stderr, flush=True)
        return []


def _classify(client, alert: dict, nia: list, prior: dict | None) -> dict:
    prior_ctx = f"Prior severity: {prior['severity']}. Cycle {prior['cycleCount']}. " if prior else ""
    resp = client.chat.completions.create(
        model="gpt-4o",
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": "Senior security incident commander. Return JSON only."},
            {
                "role": "user",
                "content": (
                    f"{prior_ctx}Alert: {json.dumps(alert)}\n"
                    f"Nia runbook context: {json.dumps(nia[:2])}\n"
                    'Return: {"severity":"critical"|"high"|"medium"|"low",'
                    '"classification":"<incident type>"}'
                ),
            },
        ],
    )
    return json.loads(resp.choices[0].message.content)


def _gen_tasks(client, incident_id: str, alert: dict, nia: list, cycle: int, ts: int) -> list:
    resp = client.chat.completions.create(
        model="gpt-4o",
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": "Security responder. Return JSON only."},
            {
                "role": "user",
                "content": (
                    f"Alert: {json.dumps(alert)}, cycle {cycle}\n"
                    f"Nia containment procedures: {json.dumps(nia[:2])}\n"
                    'Return: {"tasks":[{"type":"contain"|"investigate"|"communicate"|"escalate",'
                    '"assignedTo":"<role>","description":"<specific action>"}]}'
                ),
            },
        ],
    )
    raw = json.loads(resp.choices[0].message.content).get("tasks", [])
    return [
        {
            "id": f"{incident_id}-task-{ts}-{i}",
            "incidentId": incident_id,
            "type": t["type"],
            "assignedTo": t["assignedTo"],
            "status": "pending",
            "description": t["description"],
        }
        for i, t in enumerate(raw[:3])
    ]


def _gen_evidence(client, incident_id: str, alert: dict, nia: list, cycle: int, ts: int) -> list:
    resp = client.chat.completions.create(
        model="gpt-4o",
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": "Security investigator. Return JSON only."},
            {
                "role": "user",
                "content": (
                    f"Alert: {json.dumps(alert)}, cycle {cycle}\n"
                    f"Nia investigation context: {json.dumps(nia[:2])}\n"
                    'Return: {"evidence":[{"source":"<source system>","content":"<specific finding>",'
                    '"niaSourceRef":"<exact Nia doc name or section>"}]}'
                ),
            },
        ],
    )
    raw = json.loads(resp.choices[0].message.content).get("evidence", [])
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    return [
        {
            "id": f"{incident_id}-ev-{ts}-{i}",
            "incidentId": incident_id,
            "source": e["source"],
            "content": e["content"],
            "niaSourceRef": e.get("niaSourceRef"),
            "timestamp": now,
        }
        for i, e in enumerate(raw[:2])
    ]


def _gen_handoff(client, memory: dict, nia: list) -> str:
    escalation = _nia_search("escalation procedure shift handoff security incident")
    resp = client.chat.completions.create(
        model="gpt-4o",
        temperature=0,
        messages=[
            {
                "role": "system",
                "content": "Security comms specialist writing shift handoff summaries.",
            },
            {
                "role": "user",
                "content": (
                    f"Incident state: {json.dumps({k: memory[k] for k in ('incidentId', 'severity', 'classification', 'cycleCount')})}\n"
                    f"Evidence collected: {json.dumps(memory.get('evidence', []))}\n"
                    f"Tasks created: {json.dumps(memory.get('tasks', []))}\n"
                    f"Nia escalation procedures: {json.dumps((escalation or nia)[:1])}\n"
                    "Write a shift handoff summary. Under 200 words. Plain text, no markdown."
                ),
            },
        ],
    )
    return resp.choices[0].message.content
```

- [ ] **Commit**

```bash
git add agents/python/sentinel_agent.py
git commit -m "feat: agent two-mode cycle — monitoring (all_clear) and incident (DFIR)"
```

---

## Task 14: Seed `normal_logs.json` into sandbox setup script

**Files:**
- Modify: `scripts/setup_memory_sandbox.py`

- [ ] **Add normal_logs.json seeding to setup script**

Full updated file:

```python
#!/usr/bin/env python3
"""One-time setup: create the named memory sandbox, seed normal_logs.json."""

import asyncio
import json
import sys
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / ".env")
except ImportError:
    pass

from tensorlake.sandbox import AsyncSandbox

SANDBOX_NAME = "sentinelops-memory"
MEMORY_DIR = "/memory"

NORMAL_LOGS = [
    {"source": "DNS", "message": "Query: prod-api.corp.local → 10.0.1.12 (3ms)"},
    {"source": "HTTPS", "message": "GET api.internal:8080/health → 200 OK (11ms)"},
    {"source": "LDAP", "message": "Auth: svc-monitor@corp.local → ACCEPTED"},
    {"source": "FW", "message": "Outbound traffic within policy — no anomalies"},
    {"source": "IDS", "message": "No signatures matched in monitoring window"},
    {"source": "KERBEROS", "message": "TGT issued: svc-backup@CORP.LOCAL TTL=8h"},
    {"source": "NTP", "message": "Sync: time.corp.local drift=+2ms"},
    {"source": "SIEM", "message": "All correlation rules nominal — 0 alerts"},
]


async def main() -> None:
    import os
    sandbox_id = os.environ.get("TENSORLAKE_MEMORY_SANDBOX_ID")

    if sandbox_id:
        print(f"Connecting to existing sandbox '{sandbox_id}'...")
        sb = await AsyncSandbox.connect(sandbox_id)
    else:
        print(f"Creating named sandbox '{SANDBOX_NAME}'...")
        sb = await AsyncSandbox.create(name=SANDBOX_NAME)
        sandbox_id = sb.sandbox_id
        print(f"\nAdd this to .env:")
        print(f"TENSORLAKE_MEMORY_SANDBOX_ID={sandbox_id}")

    print("Creating /memory directory...")
    await sb.run("mkdir", ["-p", MEMORY_DIR])

    print("Seeding normal_logs.json...")
    await sb.write_file(
        f"{MEMORY_DIR}/normal_logs.json",
        json.dumps(NORMAL_LOGS, indent=2).encode("utf-8"),
    )

    print(f"\n✓ Sandbox ready: {sandbox_id}")


if __name__ == "__main__":
    asyncio.run(main())
```

- [ ] **Run the setup script to seed normal_logs into the existing sandbox:**

```bash
python scripts/setup_memory_sandbox.py
```

Expected output ends with: `✓ Sandbox ready: <sandbox_id>`

- [ ] **Commit**

```bash
git add scripts/setup_memory_sandbox.py
git commit -m "chore: seed normal_logs.json into memory sandbox during setup"
```

---

## Task 15: Deploy agent to Tensorlake

- [ ] **Deploy updated agent:**

```bash
python scripts/deploy.py
```

Expected: ends with `✓ Deploy complete. Agent will fire every 2 minutes.`

- [ ] **Verify by manually triggering a monitoring cycle:**

```bash
curl -X POST https://<your-vercel-url>/api/trigger
# Expected: {"status":"triggered","requestId":"..."}
```

Wait ~30s, then:

```bash
curl https://<your-vercel-url>/api/agent-status | python -m json.tool
# Expected: monitoringStatus: "all_clear", monitoringMessage: "..."
```

---

## Task 16: Update CLAUDE.md — production-only rule

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Add production-only rule** under `## Non-Negotiables (Hackathon Mode)`:

```markdown
- Always target the deployed production version. Never introduce mock paths, dev-only branches, or environment flags that split production behavior. All features must work in the live Vercel deployment.
```

- [ ] **Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add production-only rule to CLAUDE.md non-negotiables"
```

---

## Task 17: Push and verify end-to-end on production

- [ ] **Push all commits:**

```bash
git push origin main
```

- [ ] **Wait for Vercel deploy** (check Vercel dashboard — should auto-deploy within 1 min)

- [ ] **End-to-end demo test on production:**

1. Open `https://<your-vercel-url>/dashboard`
2. Click **"Start Monitoring"** — should see NORMAL logs streaming, TopBar shows "Monitoring · All Clear" within ~30s
3. Left panel shows green "All Clear" badge
4. 15s countdown appears in console header
5. At 0: SUSPICIOUS → CRITICAL logs stream in, toast appears: "INCIDENT DETECTED — prod-db-01"
6. Left panel transitions to severity/incident view
7. Poll for ~30s — incident memory lands, timeline and Nia Navigator populate
8. Manually trigger second cycle: `POST /api/trigger` — verify escalation + handoff summary appears

- [ ] **Reset for second demo run** (clear sandbox incident memory):

```bash
curl -X POST https://<your-vercel-url>/api/trigger
# This fires monitoring mode (no flag) — clears stale state for re-demo
```

> **Note:** To fully reset between demos (clear incident memory), add a `/api/reset` endpoint later if needed. For now, manually delete `INC-2026-001.json` from the sandbox via `scripts/setup_memory_sandbox.py` or by running a one-off script.

---

## Self-Review Notes

- All spec requirements covered: monitoring cycle ✓, two-mode agent ✓, 15s countdown ✓, auto-inject ✓, toast ✓, remove mock ✓, CLAUDE.md ✓
- `MonitoringMemory` defined in Task 1, used correctly in Tasks 2, 4, 6
- `useInjectAlert` defined in Task 7, imported in Task 9 NetworkConsole
- `StreamPhase` defined in Task 8, imported in Task 9
- `monitoringStatus` flows: API → hook → page → NetworkConsole + IncidentStatusPanel + TopBar — all wired in Tasks 4, 6, 9, 10, 11, 12
- `INJECT_ALERT_ENDPOINT` added to constants in Task 5, imported in Task 7
