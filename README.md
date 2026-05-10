# SentinelOps

**Always-on AI security agent that never starts from zero.**

When an incident hits at 3am, most teams wake up to a raw alert with zero context. SentinelOps wakes up to a pre-worked incident — classified severity, generated response tasks, grounded runbook steps, and a handoff summary built from everything the agent learned in prior cycles.

---

## The Problem

Security incidents don't pause between analyst shifts. Existing tools produce alerts — they don't respond. On-call engineers start every incident from scratch: no prior context, no runbook grounding, no accumulated evidence. SentinelOps closes that gap.

## What It Does

SentinelOps is an always-on agent that runs on a cron schedule. Every cycle it:

1. **Reads prior memory** from a Tensorlake sandbox — severity assessments, evidence, tasks from all previous cycles
2. **Retrieves grounded runbook context** from Nia — searches indexed runbooks (db_exfiltration, lateral movement, ransomware) before every decision
3. **Classifies and escalates** via GPT-4o — severity, response tasks, evidence collection, handoff summary
4. **Writes everything back** to Tensorlake memory and sleeps until next cycle

**The demo moment:** trigger cycle 2 on stage. The agent reads what it learned in cycle 1. Severity escalates from HIGH to CRITICAL. Handoff summary appears. The agent remembered. It did not start from zero.

---

## Stack

| Layer | Role |
|---|---|
| **Tensorlake** | Durable sandbox — runs the Python agent, persists memory as JSON across restarts |
| **Nia (Nozomio)** | Knowledge retrieval — searches indexed runbooks before every classification cycle |
| **OpenAI GPT-4o** | Classification, task generation, evidence collection, handoff summary |
| **Next.js + Vercel** | Live dashboard — polls agent state every 5s, deployed on Vercel Cron |

---

## Architecture

```
Vercel Cron (every 5 min)
        ↓
/api/cron  or  /api/webhook (manual trigger)
        ↓
Tensorlake → runs agents/python/sentinel_agent.py inside sandbox
        ↓
  ┌────────────────────────────────────────┐
  │  Tensorlake Sandbox                    │
  │  1. read /memory/{incidentId}.json     │
  │  2. search Nia → runbook context       │
  │  3. GPT-4o → classify + tasks          │
  │  4. GPT-4o → evidence + handoff        │
  │  5. write /memory/{incidentId}.json    │
  └────────────────────────────────────────┘
        ↓
/api/agent-status → dashboard polls every 5s
```

---

## Repository

```
├── agents/python/sentinel_agent.py   ← Python agent (runs inside Tensorlake sandbox)
├── app/
│   ├── dashboard/                    ← live incident UI
│   └── api/
│       ├── cron/route.ts             ← Vercel Cron target (every 5 min)
│       ├── webhook/route.ts          ← manual trigger
│       ├── agent-status/route.ts     ← dashboard data source
│       └── inject-alert/route.ts     ← seed a demo alert
├── lib/
│   ├── tensorlake.ts                 ← sandbox connect, memory read/write
│   ├── nia.ts                        ← Nia REST client
│   └── llm.ts                        ← GPT-4o wrapper
├── data/runbooks/                    ← markdown runbooks indexed into Nia
└── scripts/index_runbooks.py         ← one-time: index runbooks before demo
```

---

## Setup

```bash
npm install
```

`.env.local` keys:

| Variable | Purpose |
|---|---|
| `OPENAI_API_KEY` | GPT-4o |
| `NIA_API_KEY` | Nia knowledge search |
| `TENSORLAKE_API_KEY` | Tensorlake sandbox access |
| `TENSORLAKE_MEMORY_SANDBOX_ID` | Pre-provisioned sandbox ID |

```bash
# Index runbooks into Nia (once before demo)
pip install httpx python-dotenv
python scripts/index_runbooks.py

# Start dev server
npm run dev
```

Open `http://localhost:3000/dashboard`.

```bash
# Trigger agent cycle manually
curl -X POST http://localhost:3000/api/webhook

# Trigger again — cycle 2 builds on cycle 1
curl -X POST http://localhost:3000/api/webhook
```

---

## Demo (3 minutes)

**Minute 1** — Dashboard shows alert: 2GB outbound from prod-db-01 at 03:14 UTC. Trigger cycle 1. Agent wakes, Nia retrieves `db_exfiltration` runbook.

**Minute 2** — Severity: HIGH. 3 tasks generated (isolate, pull logs, notify). Nia source panel shows which runbook section was used. Memory written. Agent sleeps.

**Minute 3** — Trigger cycle 2. Agent reads prior memory. Severity escalates to CRITICAL. Handoff summary generated. Memory state visible in dashboard footer. **"The agent remembered. It did not start from zero."**
