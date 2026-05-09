# Codex Rules

## Mission

Build SentinelOps as a hackathon MVP that is demo-ready fast, reliable live, and easy to reason about.

Codex should optimize for:
- working demo functionality,
- deployment-ready behavior,
- small, direct edits,
- concise communication,
- minimal verification that proves the changed path works.

## Hackathon Speed Mode

- Ship the thinnest useful vertical slice first.
- Prefer simple, reliable implementations over abstractions.
- Do not gold-plate, refactor broadly, or add infrastructure unless it directly improves the live demo.
- When unsure, reduce scope and preserve the demo flow.
- Keep responses short and practical.
- Use TypeScript and existing project patterns.
- Keep files small and names explicit.
- Update `ROADMAP.md` after meaningful milestones, scope cuts, or priority changes.

## Verification Budget

Time is limited. Run only the smallest checks needed for confidence in the changed path.

Default verification order:
1. Type/build check only when the change can affect compilation or deployment.
2. Targeted smoke check for the specific route/API/script touched.
3. Avoid broad test suites, slow exploratory checks, or repeated local rebuilds unless a failure requires it.

This project may not have a full test suite. Do not spend time creating broad tests unless the touched behavior is risky and demo-critical.

When building ideas or implementation:
- Focus on working functionality for deployment.
- Do not spend time trying to perfectly reproduce the full local production environment.
- Do not over-invest in local visual/browser validation when HTTP/build verification is enough.
- Prefer Vercel-compatible behavior over local-only branches.

Known tool limitation:
- The in-app browser control tool described by the Browser plugin is not exposed in this session, so fall back to local smoke checks with the dev server plus HTTP and/or build verification.

## Product Context

SentinelOps MVP: Always-On AI Cyber Incident Response Agent.

Track: Always-On Agents. Primary sponsors: Nia/Nozomio and Tensorlake.

Core thesis:
- Nia is the living knowledge layer for runbooks, postmortems, architecture docs, and escalation procedures.
- Tensorlake is the always-on execution layer for scheduling, durable cross-session memory, and sandboxed agent runs.
- Convex is optional dashboard polish only.

The track's hard test:
- Remove Tensorlake and the agent stops running between sessions and loses memory.
- Remove Nia and the agent loses grounded runbook context.

The money shot:
- Run the agent loop twice on stage.
- The second run visibly builds on Tensorlake memory from the first run.
- Judges must see that the agent did not start from zero.

## Non-Negotiables

- Tensorlake is core infrastructure, not optional.
- Nia is core grounding, not a chat add-on.
- Every demo-critical flow must visibly show Nia source navigation: source location, document/section, and why selected.
- Always target deployed production behavior.
- Never introduce auth, billing, microservices, or unnecessary infrastructure.
- Never hardcode secrets. Use environment variables.
- Avoid mock paths, dev-only branches, and production behavior splits.

## Demo Flow To Protect

Live demo target is under 3 minutes:

1. Alert arrives: unusual outbound traffic from `prod-db-01`.
2. Tensorlake scheduled trigger fires without human input.
3. Agent calls Nia and retrieves the DB exfiltration runbook plus prior postmortem.
4. Agent classifies severity as High and likely data exfiltration.
5. Sub-agents create containment, investigation, and comms tasks.
6. Tensorlake writes findings to durable memory.
7. Second cycle reads prior memory, sees new evidence, and escalates.
8. Shift-handoff summary is generated automatically.

## Architecture Rules

Tensorlake owns:
- background execution,
- scheduled or webhook-triggered agent loop,
- durable memory,
- cross-session incident state.

Nia owns:
- runbooks,
- prior incidents,
- architecture and escalation context,
- targeted retrieval used by each cycle and sub-agent.

Memory vs retrieval split:
- Tensorlake stores what happened.
- Nia stores what to do and why.

Convex, if present, is only for live dashboard polish after Tensorlake + Nia are working.

## Nia Integration Notes

- Base URL: `https://apigcp.trynia.ai/v2`
- Auth: `Authorization: Bearer NIA_API_KEY`
- Index contexts with `POST /v2/contexts`
- Prefer `GET /v2/contexts/semantic-search?q=<query>&limit=<n>`
- `semantic-search` returns `{"results":[...]}`
- `/v2/contexts/search` may return `{"contexts":[...]}`, so handle response shape deliberately.

## Tensorlake Notes

- Trigger application: `POST https://api.tensorlake.ai/applications/<name>` with `Accept: application/json`
- List/create cron schedules: `GET/POST https://api.tensorlake.ai/v1/namespaces/default/applications/<name>/cron-schedules`

## Planning Rule

Before coding meaningful features, identify the thinnest vertical slice:
- user-visible outcome,
- Tensorlake change,
- Nia change,
- frontend change, if any,
- risk.

Then implement directly.

## Build vs Fake

Build real:
- Tensorlake scheduled agent loop,
- Tensorlake durable memory read/write,
- Nia index and search,
- lightweight sub-agent task creation,
- shift-handoff summary.

Allowed to hardcode or seed:
- 2-3 alert examples,
- egress log JSON,
- demo incident data needed to keep the flow reliable.

Do not fake:
- Tensorlake memory,
- Nia grounding,
- the second-cycle "remembered prior state" moment.

## Collaboration

Codex should act as a fast technical collaborator:
- flag scope risks early,
- recommend the next highest-impact thin slice,
- preserve code coherence,
- suggest manual work only when it improves speed, ownership, or demo reliability.

