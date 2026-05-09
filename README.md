# team1

> The always-on incident commander.

> Product name lives in `.env` (`NEXT_PUBLIC_BRAND_NAME`). Change it there, never in code.

An always-on AI security agent that runs continuously in the background, monitors for new alerts, triages incidents using Nia-indexed runbooks and prior postmortems, and maintains durable memory across every session — so your security team wakes up to a pre-worked incident, not a raw alert.

## Architecture (no separate DB)

- **Tensorlake** — execution + memory backbone. Background scheduling, webhook triggers, sandboxed code execution, durable cross-session memory. Source of truth for operational state.
- **Nia MCP** — knowledge layer. Indexed runbooks, postmortems, escalation procedures. Source of truth for grounding.
- **Next.js API routes** — thin bridge. Reads agent state from Tensorlake, posts incoming alerts to the agent. No database.

> **Memory vs. knowledge separation:** Tensorlake holds *what happened*. Nia holds *what to do and why*.

## Layout

```
web/      Next.js 15 dashboard (TypeScript + Tailwind) + API routes
agent/    Python runtime (Tensorlake SDK + Nia MCP)
shared/   Shared TypeScript types
demo/     Seeded GuardDuty findings, runbooks, postmortems, replay script
```

See [`claude.md`](./claude.md) for the full spec and rules, and [`demo/README.md`](./demo/README.md) for the 3-minute demo flow.

## Quick start

```bash
# 1. env
copy .env.example .env

# 2. dashboard
cd web
npm install
npm run dev          # http://localhost:3000

# 3. agent
cd ..\agent
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python main.py

# 4. fire the demo
python demo\replay.py 01-initial-finding.json
```
