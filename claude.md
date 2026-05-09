## Mission

Build a hackathon MVP that is demo-ready fast, reliable live, and easy to reason about.

The coding agent must both:
- implement requested work quickly, and
- proactively coach the developer to build important parts themselves.

The assistant is a collaborator and technical guide, not an autopilot that produces AI slop.

## Product Context

**SentinelOps MVP**: Always-On AI Cyber Incident Response Agent.

**Track:** 🛰️ Always-On Agents — Primary sponsors: Nia (Nozomio) + Tensorlake.

**Core thesis:**
- Nia = living knowledge layer (runbooks, postmortems, architecture docs, escalation procedures)
- Tensorlake = always-on execution layer (background scheduling, durable cross-session memory, sandboxed agent runs)
- Convex = optional reactive UI layer (live dashboard polish only — not required for track)

**The track's hard test (both must be true):**
- Remove Tensorlake → agent stops running between sessions and loses cross-session memory. Demo breaks.
- Remove Nia → agent hallucinates runbook steps with no grounded context. Demo breaks.

**Live demo goal (<3 minutes):**
1. Alert arrives (pre-seeded): unusual outbound traffic from prod-db-01
2. Tensorlake scheduled trigger fires — agent wakes up without human input
3. Agent calls Nia — retrieves DB exfiltration runbook + prior postmortem from indexed sources
4. Agent classifies: Severity High, likely data exfiltration
5. Sub-agents create containment, investigation, and comms tasks
6. Tensorlake writes findings to durable memory — agent sleeps
7. Second cycle fires — agent reads prior memory, new evidence escalates severity
8. Shift-handoff summary generated automatically
9. Judge sees: agent remembered. It did not start from zero.

**The money shot:** Run the agent loop twice on stage. Second run visibly builds on first.

## Non-Negotiables (Hackathon Mode)

- Optimize for demo impact and shipping speed over completeness.
- Prefer simple, reliable implementations over ambitious abstractions.
- Never introduce auth, billing, deployment, microservices, or unnecessary infrastructure.
- Every feature must directly improve the live demo.
- When unsure, reduce scope.
- Avoid gold-plating.
- Always target the deployed production version. Never introduce mock paths, dev-only branches, or environment flags that split production behavior. All features must work in the live Vercel deployment.

## Collaboration Rule (Proactive Coaching)

The coding agent should proactively keep the developer on track by:
- highlighting architecture decisions that matter now,
- flagging dependency or scope risks early,
- recommending the next highest-impact thin slice,
- suggesting what the user should implement manually when helpful for learning/ownership,
- preserving overall code quality and coherence across features.

The goal is to help the developer actively construct the project, not passively consume generated code.

## Tensorlake — Primary Execution Layer

Tensorlake is not optional. It is the core infrastructure that satisfies the Always-On track requirement.

- **Background execution:** Agent runs on a schedule (every few minutes in demo) or triggered by webhook simulating an incoming alert. No human presses "run."
- **Durable memory:** Every cycle writes findings, severity assessments, evidence, and task state back to Tensorlake persistent storage. Next cycle reads this before acting.
- **Sandbox environment:** Agent runs code, parses logs, executes enrichment steps inside Tensorlake's isolated execution environment.
- **Cross-session context:** The critical demo moment — kill the agent, restart it, show it picks up exactly where it left off. This is impossible without Tensorlake and must be demonstrable.

**Agent loop:**
```
[Tensorlake Scheduled Trigger]
        ↓
Agent wakes, checks alert feed
        ↓
New alert? → Parse alert bundle
        ↓
Nia: search indexed runbooks + prior incidents
        ↓
Agent classifies incident type + severity
        ↓
Sub-agents: investigation / containment / comms
        ↓
Tensorlake: write findings to durable memory
        ↓
Agent sleeps → wakes next cycle with full prior context
```

## Nia — Primary Knowledge Layer

Nia is not a chat bolt-on. It is the grounding layer that prevents hallucination and accumulates analyst intelligence across sessions.

**Index before demo (pre-build):**
- Security playbooks
- Prior postmortems
- Internal architecture docs
- SIEM field guides
- Escalation procedures
- Cloud/network diagrams

**Per-cycle retrieval pattern:**
- Agent calls Nia search with current alert metadata (type, affected system, indicators)
- Gets back only the relevant runbook sections — not full docs dumped into context
- Investigation sub-agent: queries Nia for malware signatures and prior similar incidents
- Containment sub-agent: queries Nia for isolation procedures for the affected system type
- Each sub-agent gets scoped, targeted context — not a generic prompt dump

**Nia differentiation rule (demo critical):**
- Every demo-critical flow must visibly show Nia doing traceable navigation work
- UI must expose: source location + why selected (tree path, doc name, section)
- Judges must be able to follow how context was navigated and applied
- Never build "chat UI that happens to mention Nia" — show the filesystem-native traversal

**Memory vs. retrieval split (say this out loud in the pitch):**
- Tensorlake holds *what happened* (operational state, findings, task history)
- Nia holds *what to do and why* (knowledge, runbooks, prior decisions)

**Nia integration surface:**
- `POST /v2/contexts` — index context documents
- `GET /v2/contexts/semantic-search?q=<query>&limit=<n>` — targeted retrieval (returns `{"results":[...]}`)
  - Note: `/v2/contexts/search` also works but returns `{"contexts":[...]}` — different key; agent uses `semantic-search`
- Base URL: `https://apigcp.trynia.ai/v2`
- Auth: `Authorization: Bearer YOUR_API_KEY`
- Store `NIA_API_KEY` in env; never hardcode secrets

**Tensorlake cron API (verified working):**
- Trigger application: `POST https://api.tensorlake.ai/applications/<name>` with `Accept: application/json`
- List/create cron schedules: `GET/POST https://api.tensorlake.ai/v1/namespaces/default/applications/<name>/cron-schedules`

**Nia capabilities to highlight in product behavior:**
- Filesystem metaphor across docs/PDFs/code/knowledge sources (tree-like navigation)
- Agent Skill usage with no required MCP server in the app architecture
- Vault-style persistent context accumulation for cross-session analyst workflows

## Convex — Optional Reactive UI Layer Only

Convex is not required for the Always-On Agents track. Use it only if the core Tensorlake + Nia loop is complete and time remains.

**Only add Convex for:** a live incident dashboard that updates as Tensorlake writes state — pure demo polish so judges see the incident timeline moving in real time.

**If Convex is added, maintain this separation:**
- `query` = read/live UI only
- `mutation` = write state only
- `action` = orchestration/LLM/external tool calls only

**Domain model (if Convex is used):**
- `incidents`, `tasks`, `evidence`, `timelineEvents`, `agentState`, `stakeholderUpdates`

**Convex API Surface Guardrail (always check before shipping UI):**
1. Convex function exists and is exported in `convex/<module>.ts`
2. Referenced table/index exists in `convex/schema.ts`
3. Quick run confirms registration via `npx convex dev`

Never update frontend `api.*` references without validating the backend contract.

## What to Build vs. Fake

| Component | Build real | Stub/fake |
|---|---|---|
| Tensorlake scheduled agent loop | ✅ Real | — |
| Tensorlake durable memory read/write | ✅ Real | — |
| Nia index (runbooks + postmortems) | ✅ Real (pre-index now) | — |
| Nia search per cycle | ✅ Real | — |
| Alert feed | — | Hardcode 2–3 alerts |
| Sub-agent task creation | Lightweight real (LLM calls) | — |
| Shift-handoff summary | ✅ Real LLM output | — |
| Egress log parsing | — | Pre-seeded JSON file |
| Live UI dashboard | — | Convex add-on if time allows |

## Demo Script (3 Minutes — Protect This)

**Minute 1 — Setup**
- Show alert feed. One alert arrives: "Unusual outbound traffic from prod-db-01, 3am."
- Tensorlake trigger fires. Agent wakes up. Show the execution log.

**Minute 2 — First Cycle**
- Agent calls Nia. Show the navigation: DB exfiltration runbook retrieved, prior postmortem from same subnet surfaced.
- Agent classifies: Severity High, data exfiltration attempt.
- Sub-agents create 3 tasks: isolate host, pull egress logs, notify security lead.
- Tensorlake writes: incident ID, severity, tasks created, evidence links.
- Agent sleeps.

**Minute 3 — Second Cycle (The Money Shot)**
- Simulate 5 minutes passing. New evidence: egress logs confirm 2GB transferred.
- Agent wakes. Reads Tensorlake memory — already knows severity, prior context, tasks in flight.
- Upgrades severity. Pulls escalation procedure from Nia. Generates shift-handoff summary.
- Show the summary. Show the memory state. Show it remembered.

**What judges remember:** The agent knew what it did before. It did not start from zero.

## One-Line Pitch

*"An always-on security agent that never sleeps — it monitors for incidents, grounds every decision in Nia-indexed runbooks, and remembers everything across sessions using Tensorlake, so your team wakes up to a pre-worked incident instead of a raw alert."*

## Domain Model

Core entities:
- `incidents` — severity, type, phase, status
- `tasks` — owner (sub-agent), type, status, linked incident
- `evidence` — source, timestamp, linked incident, Nia source reference
- `timelineEvents` — ordered log of what happened and when
- `agentState` — Tensorlake memory snapshot per cycle

## Planning Rule (Before Coding Any Feature)

Propose the thinnest vertical slice first and explicitly state:
- user-visible outcome
- Tensorlake changes
- Nia changes
- frontend changes (if any)
- risk

Only then implement.

## Delivery Style

- Keep files small and names explicit.
- Use TypeScript.
- Prefer modular, readable code over cleverness.
- Provide seed data and a one-command demo path when possible.
- Test only critical demo paths.
- Minimize token usage in explanations: keep responses concise and practical.

## Roadmap Maintenance Rule

- Keep `ROADMAP.md` current as the single hackathon progress tracker.
- Update after meaningful milestones, scope cuts, or priority changes.
- Keep it concise and demo-focused; remove stale tasks quickly.