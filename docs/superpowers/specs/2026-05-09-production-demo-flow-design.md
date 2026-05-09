# SentinelOps — Production Demo Flow Design
**Date:** 2026-05-09  
**Status:** Approved

## Goal

Single production target. No mock/dev split. Agent runs real Tensorlake cycles for both "all clear" monitoring and incident response. Demo triggers automatically — 15s after all-clear, bad logs inject and agent fires incident response.

---

## Demo Flow (end-to-end)

1. Judge opens `/dashboard` — sees idle state, "Agent: Monitoring"
2. Presenter clicks **"Start Monitoring"** button
3. Agent fires monitoring cycle (Tensorlake) → scans normal logs → LLM says "all systems nominal" → writes `/memory/monitoring.json`
4. NetworkConsole streams normal INFO logs
5. **15-second countdown** appears in console header
6. Auto: frontend calls `POST /api/inject-alert` → writes `/memory/pending_alert.json` to sandbox → fires agent cycle
7. NetworkConsole: CRITICAL/ERROR logs stream in
8. Agent reads flag → switches to DFIR pipeline → Nia retrieval → classify → tasks → write incident memory → delete flag
9. **Toast notification**: "INCIDENT DETECTED — prod-db-01 · Severity HIGH"
10. Dashboard transitions to full incident view
11. Second trigger (manual or auto) → cycle 2 → escalation → handoff summary

---

## Architecture

### Agent (`agents/python/sentinel_agent.py`)

Two modes, one application (`sentinel_agent_cycle`):

**Monitoring mode** (no flag):
- Check `/memory/pending_alert.json` → not found
- Read pre-seeded normal egress log file (`/memory/normal_logs.json`)
- LLM: "scan these logs, report status" → returns "all_clear" + brief message
- Write `/memory/monitoring.json`: `{ status, message, lastCheckedAt, cycleCount }`

**Incident mode** (flag found):
- Read flag → get alert payload
- Delete `/memory/pending_alert.json` immediately
- Run existing DFIR pipeline (Nia → classify → tasks → evidence → write INC-2026-001.json)
- Write `createdAt` on first incident cycle

### New API: `POST /api/inject-alert`
- Writes `/memory/pending_alert.json` with SEED_ALERT payload to Tensorlake sandbox
- Fires `POST https://api.tensorlake.ai/applications/sentinel_agent_cycle`
- Returns `{ status: "injected" }`
- Auth: `TENSORLAKE_API_KEY` + `TENSORLAKE_MEMORY_SANDBOX_ID`

### Updated: `GET /api/agent-status`
Returns unified state:
```ts
{
  incidents: AgentMemory[],
  agent: AgentSummary,
  monitoringStatus: "all_clear" | "incident" | "idle",
  monitoringMessage: string | null,
  monitoringLastCheckedAt: string | null,
  // existing fields:
  niaRetrievals, timeline, agentStatus, nextCycleInSeconds, phase
}
```
Reads both `/memory/monitoring.json` and `/memory/INC-2026-001.json` from sandbox.

### Frontend changes

**NetworkConsole:**
- Button: "Start Monitoring" (was "Start Demo Stream")
- On click: fires `POST /api/trigger`, sets `phase: "monitoring"`
- While monitoring: stream normal INFO logs (pre-scripted sequence, 1 per second)
- After monitoring cycle confirmed (next poll shows `monitoringStatus: "all_clear"`): start 15s countdown in console header
- At 0: call `POST /api/inject-alert` → set `phase: "incident"` → stream CRITICAL logs
- Show toast: "INCIDENT DETECTED — prod-db-01" (auto-dismiss 8s)

**Dashboard idle state:**
- No incident + no monitoring → "Agent: On Watch" (existing `EmptyIncident`)
- Monitoring active → "Agent: Monitoring · All Clear" with green pulse
- Incident active → existing incident view

**TopBar:**
- Show `monitoringStatus` badge when no active incident

### Types (`lib/types.ts`)
```ts
export interface MonitoringMemory {
  status: "all_clear";
  message: string;
  lastCheckedAt: string;
  cycleCount: number;
}

// Add to AgentStatusResponse:
monitoringStatus: "all_clear" | "incident" | "idle";
monitoringMessage: string | null;
monitoringLastCheckedAt: string | null;
```

### Remove mock mode
- Delete `lib/mockStore.ts`, `lib/mockMemory.ts`
- Remove `isMockMode()` from `lib/constants.ts` and all API routes
- Remove `DEMO_MOCK_MODE` env var references
- Remove mock branches from `GET /api/agent-status`

### CLAUDE.md update
- Add rule: always target deployed production version, never introduce dev/mock paths

---

## Data files in Tensorlake sandbox

| Path | Written by | Read by |
|---|---|---|
| `/memory/pending_alert.json` | `POST /api/inject-alert` | Agent (then deletes) |
| `/memory/monitoring.json` | Agent (monitoring mode) | `GET /api/agent-status` |
| `/memory/INC-2026-001.json` | Agent (incident mode) | `GET /api/agent-status` |
| `/memory/normal_logs.json` | `scripts/setup_memory_sandbox.py` (pre-seeded) | Agent (monitoring mode) |

---

## Build sequence

1. Update `sentinel_agent.py` — two-mode logic
2. Seed `normal_logs.json` into sandbox (add to `setup_memory_sandbox.py`)
3. Deploy agent (`python scripts/deploy.py`)
4. Add `POST /api/inject-alert` route
5. Update `GET /api/agent-status` — read monitoring memory
6. Update `lib/types.ts` — add monitoring types
7. Remove mock mode (`mockStore`, `mockMemory`, `isMockMode`)
8. Update `NetworkConsole` — countdown + auto-inject + toast
9. Update `IncidentStatusPanel` / `TopBar` — monitoring state display
10. Update `CLAUDE.md`
11. Push + verify on production

---

## Risks

- Tensorlake sandbox resume latency (~5s) — monitoring cycle may take 15–25s total; countdown starts after confirmed all-clear, not on button press
- If `inject-alert` fires before monitoring cycle writes, agent sees flag immediately and skips all-clear — mitigated by starting countdown only after `monitoringStatus: "all_clear"` confirmed via poll
- Normal logs file must be pre-seeded before demo; add to setup script and verify in pre-demo checklist
