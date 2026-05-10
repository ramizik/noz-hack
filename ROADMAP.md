# SentinelOps Roadmap

Last updated: 2026-05-09 5:20pm PT
Deadline: 2026-05-09 6:00pm PT

## North Star

Ship a working, production-targeted hackathon demo where Tensorlake is the always-on execution and durable memory layer, Nia is the grounded knowledge layer, and the dashboard makes the second-cycle memory moment obvious.

The demo must prove:
- Tensorlake wakes the agent without human state kept in Next.js.
- Tensorlake memory survives across cycles and page/server restarts.
- Nia is called during incident response and produces visible, traceable runbook context.
- The agent performs safe autonomous incident-response actions in a controlled demo environment.
- Cycle 2 builds on Cycle 1 and generates the handoff summary.

## Current Working Surface

### Product

- [x] Product name and pitch defined: SentinelOps, always-on AI cyber incident response agent.
- [x] Demo incident defined: unusual outbound traffic from `prod-db-01`.
- [x] Demo story defined: monitoring -> alert -> Nia retrieval -> classification -> tasks/evidence -> durable memory -> second cycle -> handoff.
- [x] Production-only rule defined in `CLAUDE.md`: no mock/dev split for demo-critical behavior.

### Tensorlake

- [x] Tensorlake Application exists in `agents/python/sentinel_agent.py`.
- [x] Application entry point is `sentinel_agent_cycle`.
- [x] Agent runs as a Tensorlake `@application()` / `@function()`.
- [x] Agent image installs `httpx`, `openai`, and `tensorlake`.
- [x] Tensorlake secrets are declared for `NIA_API_KEY`, `OPENAI_API_KEY`, `TENSORLAKE_API_KEY`, `TENSORLAKE_MEMORY_SANDBOX_ID`, `SLACK_BOT_TOKEN`, and `SLACK_CHANNEL_ID`.
- [x] Named memory sandbox pattern exists.
- [x] Next.js reads memory from Tensorlake via `lib/tensorlake.ts`.
- [x] Memory paths are established:
  - `/memory/monitoring.json`
  - `/memory/pending_alert.json`
  - `/memory/INC-2026-001.json`
  - `/memory/normal_logs.json`
- [x] One-time memory sandbox setup script exists: `scripts/setup_memory_sandbox.py`.
- [x] Deploy script exists: `scripts/deploy.py`.
- [x] Cron registration script exists and skips duplicate schedules: `scripts/register_cron.py`.
- [x] Manual trigger API exists: `POST /api/trigger`.
- [x] Alert injection API exists: `POST /api/inject-alert`.
- [x] Demo reset API exists: `POST /api/reset-demo`.

### Agent Behavior

- [x] Two-mode agent cycle exists.
- [x] Monitoring mode runs when no pending alert flag exists.
- [x] Monitoring mode reads normal logs and writes all-clear status.
- [x] Incident mode runs when `/memory/pending_alert.json` exists.
- [x] Incident mode deletes pending alert flag after reading it.
- [x] Incident mode reads prior incident memory.
- [x] Cycle count increments from prior Tensorlake memory.
- [x] Agent calls Nia for incident-response context.
- [x] Agent classifies incident severity and type with OpenAI.
- [x] Agent creates response tasks.
- [x] Agent creates evidence records with Nia source references.
- [x] Agent persists safe autonomous action records into Tensorlake incident memory.
- [x] Agent persists Slack communication intents and delivery receipts into Tensorlake incident memory.
- [x] Agent sends Slack updates for triage, autonomous action summaries, progress notes, and cycle-2 handoff/escalation.
- [x] Agent identifies suspected mailbox-to-workstation-to-database lateral movement and records identity/endpoint containment actions.
- [x] Agent writes updated incident memory back to Tensorlake.
- [x] Agent generates handoff summary on cycle 2+.

### Nia

- [x] Nia REST client exists in `lib/nia.ts`.
- [x] Runbook indexing script exists: `scripts/index_runbooks.py`.
- [x] Demo runbooks exist:
  - `data/runbooks/db_exfiltration.md`
  - `data/runbooks/lateral_movement.md`
  - `data/runbooks/ransomware.md`
- [x] Expanded enterprise Nia corpus exists:
  - `data/runbooks/enterprise_network_topology_and_egress_paths.md`
  - `data/runbooks/db_exfiltration_incident_playbook_enterprise.md`
  - `data/runbooks/incident_command_roles_contacts_escalation.md`
  - `data/runbooks/prod_db_01_asset_profile_and_data_classification.md`
  - `data/runbooks/prior_postmortem_2026_03_14_atlas_subnet_exfil_attempt.md`
  - `data/runbooks/siem_firewall_edr_log_field_guide.md`
  - `data/runbooks/containment_change_policy_and_approved_actions.md`
  - `data/runbooks/security_policy_data_handling_and_notification.md`
- [x] Agent calls Nia during incident mode.
- [x] UI has a Nia Navigator component.
- [x] Derived UI retrievals exist via `deriveNiaRetrievals`.

### Dashboard

- [x] Next.js App Router dashboard exists at `/dashboard`.
- [x] Agent status API reads Tensorlake memory: `GET /api/agent-status`.
- [x] Dashboard polling hook exists.
- [x] Live network console exists.
- [x] Network log windows can be hidden/restored during the demo.
- [x] Generated network logs can be stopped/resumed without clearing existing events.
- [x] Top bar, status panel, phase tracker, timeline, tasks, activity feed, Nia navigator, and handoff summary components exist.
- [x] Monitoring state is part of `AgentStatusResponse`.
- [x] Alert injection route writes to Tensorlake and fires the agent.
- [x] Dashboard can display monitoring, incident, timeline, task, evidence, Nia, and handoff surfaces.
- [x] Dashboard shows an Autonomous Actions ledger grounded in Nia sources.
- [x] Dashboard shows Slack communications inside Autonomous Actions, including sent/failed status and permalinks.
- [x] Dashboard has a Reset Demo control for clean rehearsals.
- [x] Dashboard has an always-visible Networking Diagram widget backed by Tensorlake incident memory.
- [x] Left status panel shows friendly all-clear/standby visuals and switches to active recovery with Tensorlake-backed incident duration.
- [x] Dashboard can open a Tensorlake Console drawer backed by the real Tensorlake application logs API.
- [x] Live demo logs include identity, mailbox, endpoint, phishing attachment, and continuing post-containment suspicious activity.

## Known Gaps and Risks

### Must Resolve Before Demo

- [ ] Verify production environment variables are set in Vercel:
  - `TENSORLAKE_API_KEY`
  - `TENSORLAKE_MEMORY_SANDBOX_ID`
  - `NIA_API_KEY`
  - `OPENAI_API_KEY`
  - `SLACK_BOT_TOKEN`
  - `SLACK_CHANNEL_ID`
- [x] Verify Nia runbooks are indexed in the account used by production.
- [ ] Verify Nia search endpoint shape. Code currently uses `/contexts/semantic-search`; `CLAUDE.md` mentions `/contexts/search`. Pick the working endpoint and standardize both code and docs.
- [x] Verify Tensorlake cron registration endpoint. Duplicate schedules were pruned to one active `*/2 * * * *` schedule.
- [x] Verify deployed Tensorlake app can read/write the named memory sandbox.
- [ ] Verify `POST /api/trigger` works on the deployed Vercel URL.
- [ ] Verify `POST /api/inject-alert` writes the flag and triggers incident mode on deployed Vercel.
- [ ] Verify Tensorlake app can post to Slack with the configured bot token and channel.
- [ ] Verify cycle 2 visibly reads prior memory and generates handoff.
- [x] Add or document a reliable demo reset path before judging.

### Demo Quality Risks

- [ ] Nia Navigator may show derived or weak source titles if Nia result payload shape differs from assumptions.
- [ ] LLM output can vary; prompts should force short, judge-readable text.
- [ ] The UI must make Tensorlake memory explicit, not just imply it.
- [x] The "autonomous action" story needs a visible action ledger, even if actions are safe demo actions.
- [ ] Dashboard should never look idle after clicking Start Monitoring; give immediate local visual feedback while Tensorlake runs.

## 2.5 Hour Execution Plan

### 3:30-3:50pm: Stabilize Tracker and Baseline

- [x] Create `ROADMAP.md`.
- [x] Run TypeScript check: `npx tsc --noEmit`.
- [x] Run production build check: `npm run build`.
- [x] Parse-check Python agent: `python -c "import ast; ast.parse(open('agents/python/sentinel_agent.py').read()); print('OK')"`.
- [x] Record any failures here and fix only demo-blocking issues.

Outcome: We know whether the codebase is shippable before touching more features.

### 3:50-4:25pm: Tensorlake Perfection Pass

- [ ] Confirm memory sandbox exists and has `/memory/normal_logs.json`.
- [ ] Confirm `scripts/setup_memory_sandbox.py` works against the current env.
- [ ] Confirm `scripts/deploy.py` deploys `sentinel_agent_cycle`.
- [ ] Confirm manual trigger creates or updates `/memory/monitoring.json`.
- [x] Confirm alert injection creates `/memory/pending_alert.json`, fires the agent, and produces `/memory/INC-2026-001.json`.
- [ ] Confirm second trigger increments `cycleCount` and preserves previous tasks/evidence.
- [x] Add a reset endpoint or reset script if stale state will hurt the live demo.

Outcome: Tensorlake is undeniably the execution and memory layer.

### 4:25-5:00pm: Nia Perfection Pass

- [x] Run `scripts/index_runbooks.py` against the production Nia API key.
- [x] Confirm DB exfiltration query returns the DB exfiltration runbook.
- [x] Confirm prior/postmortem-style context is available or add one high-signal runbook/postmortem document now.
- [x] Add broad enterprise corpus for Nia retrieval:
  - network topology and egress allowlist
  - database exfiltration playbook
  - incident roles, contacts, and escalation
  - `prod-db-01` asset profile and data classification
  - prior Atlas subnet postmortem
  - SIEM/firewall/EDR log field guide
  - containment action policy
  - data-handling and notification policy
- [x] Add Nia-indexed enterprise network diagram context with coded entities, links, disconnect/connect rules, and quarantine rules.
- [ ] Store enough Nia source metadata in agent memory for the UI to show document title, section/path, excerpt, and why selected.
- [ ] Update prompts so tasks/evidence cite exact Nia source names.
- [ ] Make Nia Navigator copy crisp: source, section, relevance, applied action.

Outcome: Judges can see that Nia grounded the agent's decisions.

### 5:00-5:25pm: Wow Demo Layer

- [x] Add a visible "Autonomous Actions" ledger to the dashboard.
- [x] Actions should be safe, demo-contained, and incident-response shaped:
  - isolate `prod-db-01` in a simulated network control plane
  - block outbound destination `203.0.113.42`
  - request egress logs from the firewall/SIEM feed
  - notify security lead / start handoff
- [x] Each action should show:
  - proposed by which sub-agent
  - grounded Nia source
  - Tensorlake cycle number
  - status: proposed, executing, completed
- [x] Persist actions inside Tensorlake incident memory, not local UI state.
- [x] Make the second cycle update action statuses or add escalation actions.

Outcome: The agent does not only summarize; it appears to act autonomously and safely.

### 5:25-5:45pm: Production Hardening

- [ ] Deploy latest Vercel build.
- [ ] Verify `/dashboard` on the production URL.
- [ ] Verify `GET /api/agent-status` on production.
- [ ] Verify `POST /api/trigger` on production.
- [ ] Verify `POST /api/inject-alert` on production.
- [ ] Verify no missing env var errors in production logs.
- [ ] Verify dashboard does not depend on localhost-only behavior.
- [ ] Freeze new feature work unless the demo path is broken.

Outcome: The deployed app is the source of truth.

### 5:45-6:00pm: Rehearsal and Freeze

- [ ] Reset demo state.
- [ ] Open dashboard and verify idle/on-watch view.
- [ ] Start monitoring.
- [ ] Wait for all-clear.
- [ ] Inject or auto-inject alert.
- [ ] Wait for incident memory to land.
- [ ] Trigger second cycle.
- [ ] Show handoff summary.
- [ ] Say the key line: "Tensorlake remembers what happened; Nia tells the agent what to do and why."
- [ ] Do not make code changes after rehearsal unless there is a showstopper.

Outcome: Repeatable 3-minute demo.

## Feature Backlog for Next Requests

These are ready to implement when asked, in priority order.

### P0: Demo-Critical

- [x] Reset endpoint or script:
  - Clear `INC-2026-001.json`
  - Clear `monitoring.json`
  - Clear `pending_alert.json`
  - Keep `normal_logs.json`
- [x] Action ledger:
  - Add `actions` to memory type.
  - Generate actions in Python agent.
  - Render actions in dashboard.
- [ ] Nia source fidelity:
  - Normalize Nia result payloads.
  - Persist exact source fields into memory.
  - Render source path and excerpt without guessing.
- [ ] Second-cycle escalation:
  - Force cycle 1 to high.
  - Force cycle 2 with 2GB transfer evidence to critical.
  - Generate a punchy handoff summary.

### P1: Sponsor Polish

- [ ] Tensorlake badge/panel showing:
  - sandbox ID
  - cycle count
  - last memory write
  - memory files used
  - next scheduled run
- [ ] Nia badge/panel showing:
  - query used
  - result count
  - selected runbook
  - source path/section
- [ ] Execution log panel:
  - "Tensorlake woke agent"
  - "Read prior memory"
  - "Queried Nia"
  - "Wrote memory"
  - "Sleeping until next cycle"
- [x] Networking diagram:
  - Baseline enterprise topology is visible before incident.
  - Agent writes simulated disconnect/connect network state to Tensorlake memory.
  - Dashboard shows blocked production/database links and quarantine links after containment.
- [x] Better runbook corpus:
  - Added prior postmortem for exfiltration from same subnet.
  - Added escalation/contact procedure.
  - Added containment playbook and action policy for database host isolation.
  - Added topology, asset profile, log field guide, and data-handling policy.

### P2: Nice If Time Remains

- [ ] One-command production smoke script.
- [ ] Dashboard copy tightening.
- [ ] More realistic log stream.
- [ ] Task status progression over cycles.
- [x] Shift handoff context:
  - Dashboard can switch between live and prerecorded incidents.
  - Tensorlake memory now carries progress history, critical logs, and structured handoff context for future chat-agent grounding.
- [ ] Stakeholder update card.
- [ ] Downloadable shift handoff.

## Implementation Rules

- Keep Tensorlake mandatory for every state transition that matters.
- Keep Nia mandatory for every incident-response decision that matters.
- Do not add auth, billing, databases, queues, or new infrastructure.
- Do not add mock mode or local-only branches.
- Use production routes and deployed behavior as the target.
- Prefer one reliable vertical slice over broad partial features.
- Every new feature must improve the 3-minute demo.
- Autonomous network actions must be safe, controlled, and demo-contained unless explicitly connected to approved real infrastructure.

## Demo Script

1. Open `/dashboard`.
2. Show agent on watch.
3. Start monitoring.
4. Tensorlake wakes the agent and writes all-clear monitoring memory.
5. Alert arrives for unusual outbound traffic from `prod-db-01`.
6. Agent wakes again, reads Tensorlake memory, and switches to incident mode.
7. Agent queries Nia and retrieves DB exfiltration response guidance.
8. Agent classifies severity high and creates investigation, containment, and comms work.
9. Agent writes incident state to Tensorlake memory and sleeps.
10. Trigger the second cycle.
11. Agent reads prior Tensorlake memory, sees previous findings/tasks, escalates with new evidence, and writes a handoff summary.
12. Close with: "Tensorlake holds what happened. Nia holds what to do and why. The agent never starts from zero."

## Current Source of Truth Files

- `CLAUDE.md`: mission, constraints, demo doctrine.
- `ROADMAP.md`: live execution tracker.
- `agents/python/sentinel_agent.py`: Tensorlake agent.
- `lib/tensorlake.ts`: Next.js memory access into Tensorlake.
- `lib/nia.ts`: Nia REST client.
- `app/api/trigger/route.ts`: manual Tensorlake trigger.
- `app/api/inject-alert/route.ts`: alert injection into Tensorlake memory.
- `app/api/agent-status/route.ts`: dashboard state read model.
- `app/dashboard/page.tsx`: demo surface.
- `data/runbooks/`: Nia seed corpus.
