# Tensorlake Application Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace broken sandbox-as-executor pattern with a proper Tensorlake Application (@function + cron scheduler) that runs the security incident agent on a schedule, writes durable memory to a named Tensorlake Sandbox filesystem, and lets Next.js read that memory for the live dashboard.

**Architecture:** A Python `@function` decorated entry point (`sentinel_agent_cycle`) is deployed to Tensorlake Orchestration and fires every 2 minutes via cron. Each invocation reads prior state from a named Tensorlake Sandbox (the memory store), runs Nia retrieval + OpenAI classification, then writes updated state back to that sandbox. Next.js reads from the same sandbox — it never executes anything.

**Tech Stack:** Python `tensorlake` package (`@application`, `@function`, `Image`, `AsyncSandbox`), `httpx`, `openai`, `tl` CLI for deploy, TypeScript `Sandbox` (read-only) in Next.js.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `agents/python/sentinel_agent.py` | **Rewrite** | Tensorlake Application — the agent |
| `scripts/setup_memory_sandbox.py` | **New** | One-time: create named sandbox, print ID |
| `scripts/register_cron.py` | **New** | Register cron schedule via HTTP API |
| `scripts/deploy.py` | **New** | Set secrets + deploy app + register cron |
| `lib/tensorlake.ts` | **Rewrite** | Read-only sandbox memory access |
| `app/api/trigger/route.ts` | **New** | HTTP endpoint to manually fire agent |
| `app/api/agent-status/route.ts` | **Minor fix** | Add error handling |
| `app/dashboard/page.tsx` | **Add** | Trigger button for demo |
| `agents/incidentCommander.ts` | **Delete** | Logic moves to Python |
| `agents/investigator.ts` | **Delete** | Logic moves to Python |
| `agents/responder.ts` | **Delete** | Logic moves to Python |
| `agents/comms.ts` | **Delete** | Logic moves to Python |
| `app/api/cron/route.ts` | **Delete** | Replaced by Tensorlake cron |

---

## Task 1: Create the Memory Sandbox (Run Once)

**Files:**
- Create: `scripts/setup_memory_sandbox.py`

This script provisions the named Tensorlake Sandbox that stores agent memory across sessions. Run it once and add the printed ID to `.env`.

- [ ] **Step 1: Write the setup script**

```python
#!/usr/bin/env python3
"""One-time setup: create the named memory sandbox and print its ID for .env."""

import asyncio
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


async def main() -> None:
    print(f"Creating named sandbox '{SANDBOX_NAME}'...")
    sb = await AsyncSandbox.create(name=SANDBOX_NAME)
    sandbox_id = sb.sandbox_id

    print("Creating /memory directory...")
    result = await sb.run("mkdir", ["-p", MEMORY_DIR])
    if result.stdout:
        print(result.stdout)

    print(f"\n✓ Sandbox ready: {sandbox_id}")
    print(f"\nAdd this to .env:")
    print(f"TENSORLAKE_MEMORY_SANDBOX_ID={sandbox_id}")


if __name__ == "__main__":
    asyncio.run(main())
```

- [ ] **Step 2: Run it**

```powershell
python scripts/setup_memory_sandbox.py
```

Expected output:
```
Creating named sandbox 'sentinelops-memory'...
Creating /memory directory...

✓ Sandbox ready: sb_xxxxxxxxxxxxxxxx

Add this to .env:
TENSORLAKE_MEMORY_SANDBOX_ID=sb_xxxxxxxxxxxxxxxx
```

- [ ] **Step 3: Add the ID to .env**

Open `.env` and append:
```
TENSORLAKE_MEMORY_SANDBOX_ID=sb_xxxxxxxxxxxxxxxx
```

Replace `sb_xxxxxxxxxxxxxxxx` with the actual ID printed above.

---

## Task 2: Write the Tensorlake Application Agent

**Files:**
- Rewrite: `agents/python/sentinel_agent.py`

This is the core agent. `@application()` + `@function()` marks it as the Tensorlake Application entry point. It reads prior memory from the sandbox, calls Nia for runbook retrieval, calls OpenAI for classification, and writes updated state back.

- [ ] **Step 1: Rewrite `agents/python/sentinel_agent.py`**

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
    """Entry point: one full incident response cycle."""
    return asyncio.run(_cycle())


# ---------------------------------------------------------------------------
# Core cycle
# ---------------------------------------------------------------------------

async def _cycle() -> dict:
    from tensorlake.sandbox import AsyncSandbox
    from openai import OpenAI

    sandbox_id = os.environ["TENSORLAKE_MEMORY_SANDBOX_ID"]
    sb = await AsyncSandbox.connect(sandbox_id)

    # Resume if suspended
    info = await sb.info()
    if str(info.status).lower() in ("suspended", "suspending"):
        print("[sentinel] Resuming sandbox...", flush=True)
        await sb.resume()

    # Ensure /memory directory exists
    await sb.run("mkdir", ["-p", MEMORY_DIR])

    # Read prior memory
    prior: dict | None = None
    try:
        raw = await sb.read_file(f"{MEMORY_DIR}/{INCIDENT_ID}.json")
        prior = json.loads(raw.value.decode("utf-8"))
    except Exception:
        pass  # First cycle — no prior state

    cycle_count = int((prior or {}).get("cycleCount", 0)) + 1
    print(f"[sentinel] Cycle {cycle_count} starting", flush=True)

    # Nia retrieval
    query = (
        f"{SEED_ALERT['type']} {SEED_ALERT['affectedSystem']} "
        "incident response runbook data exfiltration"
    )
    nia_results = _nia_search(query)
    print(f"[sentinel] Nia returned {len(nia_results)} results", flush=True)

    # OpenAI classification + task/evidence generation
    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    classification = _classify(client, SEED_ALERT, nia_results, prior)
    ts = int(time.time() * 1000)
    tasks = _gen_tasks(client, INCIDENT_ID, SEED_ALERT, nia_results, cycle_count, ts)
    evidence = _gen_evidence(client, INCIDENT_ID, SEED_ALERT, nia_results, cycle_count, ts)

    # Build updated state
    state: dict = {
        "incidentId": INCIDENT_ID,
        "severity": classification["severity"],
        "classification": classification["classification"],
        "tasks": [*(prior or {}).get("tasks", []), *tasks],
        "evidence": [*(prior or {}).get("evidence", []), *evidence],
        "cycleCount": cycle_count,
        "lastCycleAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    if cycle_count >= 2:
        state["handoffSummary"] = _gen_handoff(client, state, nia_results)

    # Write memory back to sandbox
    await sb.write_file(
        f"{MEMORY_DIR}/{INCIDENT_ID}.json",
        json.dumps(state, indent=2).encode("utf-8"),
    )

    print(
        f"[sentinel] Cycle {cycle_count} done. "
        f"Severity: {state['severity']}. "
        f"Tasks: {len(state['tasks'])}. Evidence: {len(state['evidence'])}.",
        flush=True,
    )
    return state


# ---------------------------------------------------------------------------
# Helpers
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
            {
                "role": "system",
                "content": "Senior security incident commander. Return JSON only.",
            },
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


def _gen_tasks(
    client,
    incident_id: str,
    alert: dict,
    nia: list,
    cycle: int,
    ts: int,
) -> list:
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


def _gen_evidence(
    client,
    incident_id: str,
    alert: dict,
    nia: list,
    cycle: int,
    ts: int,
) -> list:
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

- [ ] **Step 2: Verify the file is valid Python (no import errors at parse time)**

```powershell
python -c "import ast; ast.parse(open('agents/python/sentinel_agent.py').read()); print('OK')"
```

Expected: `OK`

---

## Task 3: Deploy Application + Secrets + Cron

**Files:**
- Create: `scripts/register_cron.py`
- Create: `scripts/deploy.py`

- [ ] **Step 1: Write `scripts/register_cron.py`**

```python
#!/usr/bin/env python3
"""Register a cron schedule for the sentinel_agent_cycle application."""

import json
import os
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / ".env")
except ImportError:
    pass

import httpx

APP_NAME = "sentinel_agent_cycle"
CRON_EXPRESSION = "*/2 * * * *"  # every 2 minutes for demo


def main() -> None:
    api_key = os.environ["TENSORLAKE_API_KEY"]
    base = "https://api.tensorlake.ai/v1/namespaces/default/applications"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    # List existing schedules
    r = httpx.get(f"{base}/{APP_NAME}/cron-schedules", headers=headers, timeout=15)
    if r.is_success:
        existing = r.json()
        print(f"Existing schedules: {json.dumps(existing, indent=2)}")
    else:
        print(f"Could not list schedules: {r.status_code} {r.text}")

    # Register new schedule
    r = httpx.post(
        f"{base}/{APP_NAME}/cron-schedules",
        headers=headers,
        json={"cron_expression": CRON_EXPRESSION},
        timeout=15,
    )
    if r.is_success:
        print(f"✓ Cron registered: {r.json()}")
    else:
        print(f"✗ Cron registration failed: {r.status_code} {r.text}", file=__import__("sys").stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Write `scripts/deploy.py`**

```python
#!/usr/bin/env python3
"""Deploy sentinel_agent_cycle to Tensorlake: set secrets, deploy, register cron."""

import os
import subprocess
import sys
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / ".env")
except ImportError:
    pass

AGENT_FILE = Path(__file__).parent.parent / "agents" / "python" / "sentinel_agent.py"

SECRETS = [
    "NIA_API_KEY",
    "OPENAI_API_KEY",
    "TENSORLAKE_MEMORY_SANDBOX_ID",
]


def run(cmd: list[str]) -> None:
    print(f"$ {' '.join(cmd)}")
    result = subprocess.run(cmd, check=True)
    if result.returncode != 0:
        raise SystemExit(result.returncode)


def main() -> None:
    # 1. Validate required env vars
    missing = [k for k in ["TENSORLAKE_API_KEY", "TENSORLAKE_MEMORY_SANDBOX_ID"] if not os.environ.get(k)]
    if missing:
        print(f"Missing env vars: {', '.join(missing)}", file=sys.stderr)
        raise SystemExit(1)

    # 2. Set secrets in Tensorlake
    print("\n--- Setting secrets ---")
    for key in SECRETS:
        val = os.environ.get(key, "")
        if val:
            run(["tl", "secrets", "set", f"{key}={val}"])
        else:
            print(f"  ⚠ {key} not set in .env — skipping")

    # 3. Deploy the application
    print("\n--- Deploying application ---")
    run(["tl", "deploy", str(AGENT_FILE)])

    # 4. Register cron
    print("\n--- Registering cron schedule ---")
    run(["python", str(Path(__file__).parent / "register_cron.py")])

    print("\n✓ Deploy complete. Agent will fire every 2 minutes.")


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Run the deploy**

```powershell
python scripts/deploy.py
```

Expected output sequence:
```
--- Setting secrets ---
$ tl secrets set NIA_API_KEY=...
$ tl secrets set OPENAI_API_KEY=...
$ tl secrets set TENSORLAKE_MEMORY_SANDBOX_ID=...

--- Deploying application ---
$ tl deploy agents/python/sentinel_agent.py
...building image...
✓ Application deployed: sentinel_agent_cycle

--- Registering cron schedule ---
✓ Cron registered: {"schedule_id": "..."}

✓ Deploy complete. Agent will fire every 2 minutes.
```

- [ ] **Step 4: Manually trigger one cycle to verify**

```powershell
tl run sentinel_agent_cycle
```

Watch the logs. Expected to see:
```
[sentinel] Cycle 1 starting
[sentinel] Nia returned N results
[sentinel] Cycle 1 done. Severity: high. Tasks: 3. Evidence: 2.
```

---

## Task 4: Rebuild lib/tensorlake.ts (Read-Only)

**Files:**
- Rewrite: `lib/tensorlake.ts`

Next.js only reads from the memory sandbox. No execution, no Python agent calls.

- [ ] **Step 1: Rewrite `lib/tensorlake.ts`**

```typescript
import { Sandbox } from "tensorlake";
import type { AgentMemory } from "./types";

const MEMORY_DIR = "/memory";
const INCIDENT_ID = "INC-2026-001";

async function getMemorySandbox(): Promise<Sandbox> {
  const sandboxId = process.env.TENSORLAKE_MEMORY_SANDBOX_ID;
  if (!sandboxId) throw new Error("TENSORLAKE_MEMORY_SANDBOX_ID not set");
  return Sandbox.connect({ sandboxId });
}

export async function readMemory(): Promise<AgentMemory | null> {
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```powershell
npx tsc --noEmit
```

Expected: no errors (or only pre-existing unrelated errors).

---

## Task 5: Add /api/trigger Endpoint + Dashboard Button

**Files:**
- Create: `app/api/trigger/route.ts`
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Create `app/api/trigger/route.ts`**

```typescript
import { NextResponse } from "next/server";

const APP_NAME = "sentinel_agent_cycle";

export async function POST() {
  const apiKey = process.env.TENSORLAKE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "TENSORLAKE_API_KEY not set" }, { status: 500 });
  }

  const res = await fetch(
    `https://api.tensorlake.ai/applications/${APP_NAME}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: "null",
    }
  );

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text }, { status: res.status });
  }

  const data = await res.json().catch(() => ({}));
  return NextResponse.json({ status: "triggered", requestId: data.request_id ?? data.id ?? null });
}
```

- [ ] **Step 2: Add trigger state to `app/dashboard/page.tsx`**

Replace:
```typescript
  const [lastPoll, setLastPoll] = useState<Date | null>(null);
```
With:
```typescript
  const [lastPoll, setLastPoll] = useState<Date | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState<string | null>(null);
```

- [ ] **Step 3: Replace the header right-side div in `app/dashboard/page.tsx`**

Replace:
```tsx
        <div className="flex items-center gap-4 text-xs text-slate-500">
          {lastPoll && <span>polled {lastPoll.toLocaleTimeString()}</span>}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-green-400">LIVE</span>
          </div>
        </div>
```
With:
```tsx
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
```

- [ ] **Step 4: Verify dashboard compiles**

```powershell
npx tsc --noEmit
```

Expected: no new errors.

---

## Task 6: Fix /api/agent-status Route

**Files:**
- Modify: `app/api/agent-status/route.ts`

The route currently calls `readMemory(incidentId)` with a parameter. The new `readMemory()` takes none. Update it.

- [ ] **Step 1: Rewrite `app/api/agent-status/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { listAllMemory, readMemory } from "@/lib/tensorlake";

export async function GET() {
  try {
    const incidents = await listAllMemory();
    return NextResponse.json({ incidents });
  } catch (err) {
    console.error("[agent-status] error:", err);
    return NextResponse.json({ incidents: [] });
  }
}
```

---

## Task 7: Delete Dead Code

**Files to delete:**
- `agents/incidentCommander.ts`
- `agents/investigator.ts`
- `agents/responder.ts`
- `agents/comms.ts`
- `app/api/cron/route.ts`

- [ ] **Step 1: Delete the files**

```powershell
Remove-Item agents/incidentCommander.ts
Remove-Item agents/investigator.ts
Remove-Item agents/responder.ts
Remove-Item agents/comms.ts
Remove-Item app/api/cron/route.ts
Remove-Item agents/python/incident_agent.py
```

- [ ] **Step 2: Verify no dangling imports**

```powershell
npx tsc --noEmit
```

Expected: no errors referencing deleted files.

---

## Task 8: End-to-End Verification

- [ ] **Step 1: Start Next.js dev server**

```powershell
npm run dev
```

- [ ] **Step 2: Open dashboard**

Navigate to `http://localhost:3000/dashboard`. Expected: shows "No active incidents" (or existing data if agent already ran).

- [ ] **Step 3: First agent cycle — click "⚡ Trigger Agent"**

Expected:
- Button shows "Firing..."
- Returns `Triggered: <requestId>`
- After ~30-60 seconds, dashboard refreshes with Severity HIGH incident, 3 tasks, 2 evidence items with Nia source refs

- [ ] **Step 4: Second agent cycle — click "⚡ Trigger Agent" again**

Expected:
- Dashboard shows `Cycle 2`
- Severity may escalate
- `Shift Handoff` panel appears
- Evidence and tasks accumulate (not reset)

- [ ] **Step 5: Verify memory persists (the money shot)**

Stop Next.js (`Ctrl+C`). Restart it (`npm run dev`). Navigate to dashboard.
Expected: incident data is still there. Dashboard reads from Tensorlake Sandbox, not Next.js memory.

- [ ] **Step 6: Verify cron auto-fires**

Wait 2 minutes with dashboard open. Expected: `cycleCount` increments automatically without any button click.

- [ ] **Step 7: Commit**

```powershell
git add agents/python/sentinel_agent.py scripts/setup_memory_sandbox.py scripts/register_cron.py scripts/deploy.py lib/tensorlake.ts app/api/trigger/route.ts app/api/agent-status/route.ts app/dashboard/page.tsx
git commit -m "feat: rebuild Tensorlake as Application with cron-scheduled agent loop"
```
