# CLAUDE.md

## Track
Always-On Agents (Nia + Tensorlake). Agent runs continuously in the background, remembers state across sessions, and acts without human prompting.

## Goal
Maximize total weighted score. Target 4.5+ to enter top-6 finalists.

| Criterion | Weight | Target Behavior |
|---|---|---|
| Background Execution | 30% | Multi-source triggers (webhook + schedule + agent-to-agent), graceful failure recovery, runs reliably for hours |
| Statefulness | 25% | Memory is load-bearing — killing and restarting the agent must not reset progress |
| Agentic Depth | 25% | Plans, executes, reflects, recovers, improves autonomously |
| Demo & Presentation | 10% | Story + live demo land together |
| Judge's Personal Rating | 10% | Compelling, fundable narrative |

## Stack
- **Frontend (Dashboard)**: Next.js 15 + React + TypeScript + Tailwind CSS, deployed on Vercel
- **Backend**: Next.js API routes only. No separate database — Tensorlake durable memory is the source of truth.
- **Agent Runtime**: Tensorlake Python SDK — sandbox execution + durable memory + scheduling/webhook triggers
- **Knowledge Layer**: Nia MCP server — indexed runbooks, postmortems, procedures
- **Mock Alert Source**: AWS GuardDuty sample finding JSONs in `demo/seed/alerts`, replayed via `demo/replay.py` into the webhook

## File Structure
```
web/
  src/
    app/api/                 # Next.js API routes — no DB; calls into agent-bridge
    constants/index.ts       # API_ENDPOINTS, ROUTES, BRAND, MESSAGES, COLORS, SEVERITY_LEVELS, ALERT_TYPES, POLLING_INTERVALS, STORAGE_KEYS
    components/common/       # all shared UI components
    services/                # all API calls (incl. agent-bridge.ts that talks to Tensorlake)
    hooks/                   # all business logic
agent/
  constants.py               # SEVERITY_LEVELS, ALERT_TYPES, RUNBOOK_IDS, NIA_QUERY_TEMPLATES, MEMORY_KEYS, CYCLE_INTERVALS, ESCALATION_THRESHOLDS, ENV_KEYS
  services/                  # nia_client.py, memory_client.py, tensorlake_client.py
  main.py                    # plan -> execute -> reflect -> recover loop
shared/
  types/index.ts             # shared TS types for dashboard layer
demo/
  seed/alerts/               # pre-seeded GuardDuty findings replayed on the demo timer
  seed/runbooks/             # Nia-indexed runbooks for the demo
  seed/postmortems/          # prior postmortem grounding context
  replay.py                  # POSTs seed findings into the webhook on a timer
```

## Absolute Rules

### No Hardcoding
- Every literal lives in a constants file or `.env`.
- Frontend constants: `web/src/constants/index.ts`
- Agent constants: `agent/constants.py`
- Environment values: `.env`
- Inline strings, numbers, URLs, colors, intervals, thresholds = forbidden.

### Shared Components First
- All UI elements come from `web/src/components/common/`.
- A pattern repeated twice is extracted to a common component immediately.

### Code Structure
- Business logic stays in hooks or services, never in components.
- API calls live only in `web/src/services/`.
- Agent external calls (Nia, Tensorlake memory, mock alerts) live only in `agent/services/`.
- Shared TypeScript types in `shared/types/index.ts`.

### Styling
- Tailwind utility classes only. No inline styles. No standalone CSS files except global resets.

### Memory vs Knowledge Separation
- Operational state (incident IDs, severity, evidence, task status) → Tensorlake memory only.
- Knowledge retrieval (runbooks, procedures, signatures) → Nia only.
- Never mix: no knowledge in Tensorlake, no operational state in Nia.