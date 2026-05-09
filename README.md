# SentinelOps

**Always-On AI Cyber Incident Response Agent** — hackathon MVP for the Always-On Agents track.
Primary sponsors: **Tensorlake** + **Nia (Nozomio)**.

---

## The Idea (read this first)

An AI agent that monitors for security incidents, never sleeps, and **never starts from zero**.

Every time it wakes up, it:
1. Reads what it already knows from Tensorlake durable memory
2. Retrieves relevant runbooks and prior postmortems from Nia
3. Classifies the incident with OpenAI, generates tasks, collects evidence
4. Writes everything back to Tensorlake memory and goes back to sleep

The demo money shot: **run it twice on stage**. The second cycle visibly builds on the first — higher severity, handoff summary, accumulated evidence. The agent remembered. It did not start from zero.

---

## Why each piece is non-negotiable

| Layer | What it does | What breaks without it |
|---|---|---|
| **Tensorlake** | Runs Python agent inside sandbox. Stores memory as JSON files on sandbox filesystem. Survives restarts. | Agent loses all context between cycles. Demo fails. |
| **Nia** | Provides grounded runbook context per cycle. Agent searches before every classification. | Agent hallucinates runbook steps. No traceable source. Demo fails. |
| **OpenAI gpt-4o** | Classifies severity, generates tasks, writes evidence, generates handoff summary. | No AI reasoning. Everything becomes hardcoded. |
| **Next.js / Vercel** | Live dashboard. Reads Tensorlake memory and displays incident state in real time. | No visual for judges. |

**Vercel Cron** calls `/api/cron` every 5 minutes → triggers agent cycle → Tensorlake sandbox runs Python → memory written → dashboard updates.

---

## Architecture

```
Vercel Cron (every 5 min)
        ↓
Next.js /api/cron  or  /api/webhook (manual trigger)
        ↓
lib/tensorlake.ts → connects to named Tensorlake sandbox
        ↓
uploads + runs agents/python/incident_agent.py inside sandbox
        ↓
  ┌─────────────────────────────────────┐
  │  Tensorlake Sandbox                 │
  │  1. read /memory/{incidentId}.json  │
  │  2. search Nia → runbook context    │
  │  3. OpenAI → classify + tasks       │
  │  4. OpenAI → evidence + handoff     │
  │  5. write /memory/{incidentId}.json │
  └─────────────────────────────────────┘
        ↓
returns AgentMemory JSON to Next.js
        ↓
Next.js /api/agent-status → dashboard polls every 5s
```

---

## Repository structure

```
├── agents/
│   ├── python/
│   │   └── incident_agent.py     ← Python agent (runs inside Tensorlake sandbox)
│   ├── incidentCommander.ts      ← TypeScript wrapper (delegates to Python path)
│   ├── investigator.ts
│   ├── responder.ts
│   └── comms.ts
├── app/
│   ├── dashboard/page.tsx        ← live incident UI (polls every 5s)
│   └── api/
│       ├── webhook/route.ts      ← POST: manual agent trigger
│       ├── agent-status/route.ts ← GET: read Tensorlake memory for UI
│       └── cron/route.ts         ← GET: Vercel Cron target (every 5 min)
├── lib/
│   ├── tensorlake.ts             ← sandbox connect, read/write memory, run Python
│   ├── nia.ts                    ← Nia REST client (search + index)
│   ├── llm.ts                    ← OpenAI gpt-4o wrapper
│   ├── types.ts                  ← shared TypeScript types
│   └── seedAlerts.ts             ← hardcoded demo alert
├── data/
│   └── runbooks/                 ← markdown runbooks, pre-indexed into Nia
│       ├── db_exfiltration.md
│       ├── lateral_movement.md
│       └── ransomware.md
├── scripts/
│   └── index_runbooks.py         ← one-time: index runbooks into Nia before demo
└── vercel.json                   ← Vercel Cron config (*/5 * * * *)
```

---

## Setup

```bash
# 1. Install JS dependencies
npm install

# 2. Fill in secrets in .env.local
cp .env.local .env.local   # already exists — just fill OPENAI_API_KEY
```

Required `.env.local` keys:

| Variable | Purpose |
|---|---|
| `OPENAI_API_KEY` | gpt-4o — classification, tasks, handoff |
| `NIA_API_KEY` | Nia knowledge search |
| `TENSORLAKE_API_KEY` | Tensorlake sandbox access |
| `TENSORLAKE_SANDBOX_ID` | Pre-provisioned memory sandbox ID |

```bash
# 3. Index runbooks into Nia (run once before demo)
pip install httpx python-dotenv
python scripts/index_runbooks.py

# 4. Start dev server
npm run dev
```

Open `http://localhost:3000/dashboard`.

```bash
# 5. Trigger a manual agent cycle
curl -X POST http://localhost:3000/api/webhook

# 6. Trigger again to see cycle 2 (handoff summary appears)
curl -X POST http://localhost:3000/api/webhook
```

---

## Demo script (3 minutes)

**Minute 1 — Alert arrives**
- Show dashboard. Alert: unusual 2GB outbound from prod-db-01 at 03:14 UTC.
- Trigger cycle 1 via webhook (or wait for Vercel Cron).
- Show agent waking, Nia retrieving db_exfiltration runbook.

**Minute 2 — First cycle**
- Severity classified HIGH. 3 tasks created (isolate, pull logs, notify).
- Nia source panel shows which runbook section was used and why.
- Tensorlake memory written. Agent sleeps.

**Minute 3 — Second cycle (the money shot)**
- Trigger cycle 2. Agent reads prior memory from Tensorlake sandbox.
- Severity escalates to CRITICAL. Handoff summary generated.
- Show the summary. Show the memory state footer on dashboard.
- Say: **"The agent remembered. It did not start from zero."**

---

## Team rules — do not deviate

These constraints exist because every deviation costs demo time.

1. **No new dependencies without team lead approval.** Every new package is a new failure mode.
2. **OpenAI gpt-4o only.** Do not swap in Anthropic, Gemini, or local models.
3. **No auth, no database, no microservices.** This is a demo MVP. Keep it flat.
4. **Tensorlake sandbox = the only persistence layer.** Do not add Redis, SQLite, or file system writes outside the sandbox.
5. **Nia must be called every cycle.** Do not cache or skip Nia calls. Judges will ask about it.
6. **The Python agent lives in `agents/python/incident_agent.py`.** Do not split it into multiple files or add a framework.
7. **Dashboard is read-only.** Do not add forms, buttons, or mutations to the UI. It is a view, not a control plane.
8. **Every feature must improve the 3-minute demo.** If it doesn't show up in the demo, don't build it.

---

## One-line pitch

*"An always-on security agent that never sleeps — it monitors for incidents, grounds every decision in Nia-indexed runbooks, and remembers everything across sessions using Tensorlake, so your team wakes up to a pre-worked incident instead of a raw alert."*
