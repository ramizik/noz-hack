# Demo

Three-minute live demo of the always-on incident commander (product name set via `NEXT_PUBLIC_BRAND_NAME` in `.env`).

## Files

- `seed/alerts/01-initial-finding.json` — first GuardDuty finding (minute 1)
- `seed/alerts/02-followup-evidence.json` — egress logs arriving 5 minutes later (minute 3)
- `seed/runbooks/db-exfiltration.md` — Nia-indexed runbook for the demo
- `seed/runbooks/escalation-procedure.md` — escalation procedure pulled in cycle 2
- `seed/postmortems/2024-q4-prod-db-incident.md` — prior postmortem on the same subnet
- `replay.py` — replays seeded alerts into the webhook on a timer

## Demo flow

| Time | Action | Source |
|---|---|---|
| 0:00 | Start the agent. Show empty dashboard. | `python agent/main.py` |
| 0:30 | POST `01-initial-finding.json` to `/api/webhooks/guardduty`. Tensorlake trigger fires. | `replay.py` |
| 1:00 | Cycle 1: agent calls Nia, retrieves runbook + postmortem, classifies severity HIGH, creates 3 tasks, writes to Tensorlake memory, sleeps. | live |
| 2:00 | Stop the agent process. Show memory still intact in Tensorlake. Restart. | `Ctrl+C` then re-run |
| 2:15 | POST `02-followup-evidence.json`. | `replay.py` |
| 2:30 | Cycle 2: agent reads prior memory, upgrades severity, pulls escalation procedure, generates handoff summary. | live |

## Memory vs. knowledge separation

- **Tensorlake (memory):** what happened — incident IDs, severity history, evidence links, task state, handoff notes.
- **Nia (knowledge):** what to do and why — runbooks, postmortems, escalation procedures, signatures.

The agent writes to Tensorlake every cycle. It only reads from Nia.
