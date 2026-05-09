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
COMPROMISED_ACCOUNT = "maria.chen@corp.local"
SUSPECT_WORKSTATION = "ws-44"

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
        "SLACK_BOT_TOKEN",
        "SLACK_CHANNEL_ID",
    ],
)
def sentinel_agent_cycle() -> dict:
    """Entry point: one full agent cycle — monitoring or incident response."""
    return asyncio.run(_cycle())


async def _cycle() -> dict:
    from tensorlake.sandbox import AsyncSandbox

    sandbox_id = os.environ["TENSORLAKE_MEMORY_SANDBOX_ID"]
    sb = await AsyncSandbox.connect(sandbox_id)

    info = await sb.info()
    if str(info.status).lower() in ("suspended", "suspending"):
        print("[sentinel] Resuming sandbox...", flush=True)
        await sb.resume()

    await sb.run("mkdir", ["-p", MEMORY_DIR])

    # Check for pending alert flag
    alert_data = None
    try:
        raw = await sb.read_file(f"{MEMORY_DIR}/pending_alert.json")
        alert_data = json.loads(raw.value.decode("utf-8"))
        await sb.run("rm", ["-f", f"{MEMORY_DIR}/pending_alert.json"])
        print("[sentinel] Alert flag found — switching to incident mode", flush=True)
    except Exception:
        pass

    if alert_data:
        return await _incident_cycle(sb, alert_data)
    else:
        return await _monitoring_cycle(sb)


def _emit_event(event: str, **attrs) -> None:
    payload = {
        "level": "INFO",
        "event": event,
        "component": "sentinel-agent",
        **attrs,
    }
    print(json.dumps(payload, sort_keys=True), flush=True)


async def _monitoring_cycle(sb) -> dict:
    from openai import OpenAI

    print("[sentinel] Monitoring mode — scanning logs", flush=True)
    _emit_event("monitoring.scan.started", sources="network,m365,entra,edr")

    normal_logs = []
    try:
        raw = await sb.read_file(f"{MEMORY_DIR}/normal_logs.json")
        normal_logs = json.loads(raw.value.decode("utf-8"))
    except Exception:
        normal_logs = [
            {"source": "DNS", "message": "prod-api.corp.local queries nominal"},
            {"source": "FW", "message": "No anomalous outbound connections"},
            {"source": "IDS", "message": "No signatures matched in last 5 minutes"},
        ]

    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    resp = client.chat.completions.create(
        model="gpt-4o",
        temperature=0,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a security monitoring agent. "
                    "Scan the provided network logs and report status. "
                    "Keep response under 30 words."
                ),
            },
            {
                "role": "user",
                "content": f"Network logs (last 5 minutes): {json.dumps(normal_logs[:5])}\nReport status:",
            },
        ],
    )
    message = resp.choices[0].message.content.strip()

    state = {
        "status": "all_clear",
        "message": message,
        "lastCheckedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "cycleCount": 1,
    }

    await sb.write_file(
        f"{MEMORY_DIR}/monitoring.json",
        json.dumps(state, indent=2).encode("utf-8"),
    )

    print(f"[sentinel] Monitoring cycle done. Status: all_clear. Message: {message}", flush=True)
    _emit_event("monitoring.scan.completed", status="all_clear", message=message)
    return state


async def _incident_cycle(sb, alert: dict) -> dict:
    from openai import OpenAI

    prior: dict | None = None
    try:
        raw = await sb.read_file(f"{MEMORY_DIR}/{INCIDENT_ID}.json")
        prior = json.loads(raw.value.decode("utf-8"))
    except Exception:
        pass

    cycle_count = int((prior or {}).get("cycleCount", 0)) + 1
    print(f"[sentinel] Incident cycle {cycle_count} starting", flush=True)
    _emit_event(
        "incident.cycle.started",
        incidentId=INCIDENT_ID,
        cycle=cycle_count,
        affectedSystem=alert.get("affectedSystem", "unknown"),
    )

    query = (
        f"{alert.get('type', 'security_incident')} {alert.get('affectedSystem', 'host')} "
        "incident response runbook data exfiltration compromised account lateral movement"
    )
    nia_results = [
        *_nia_search(query),
        *_nia_search("lateral movement microsoft account phishing mailbox workstation containment"),
    ][:5]
    print(f"[sentinel] Nia returned {len(nia_results)} results", flush=True)
    _emit_event("nia.search.completed", incidentId=INCIDENT_ID, hits=len(nia_results), query=query)

    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    classification = _classify(client, alert, nia_results, prior)
    if _has_lateral_movement_signal(prior):
        classification["severity"] = "critical"
        classification["classification"] = "data_exfiltration_with_lateral_movement"
    _emit_event(
        "incident.classified",
        incidentId=INCIDENT_ID,
        severity=classification["severity"],
        classification=classification["classification"],
    )
    ts = int(time.time() * 1000)
    tasks = _gen_tasks(client, INCIDENT_ID, alert, nia_results, cycle_count, ts)
    evidence = _gen_evidence(client, INCIDENT_ID, alert, nia_results, cycle_count, ts)
    actions = _gen_actions(INCIDENT_ID, alert, nia_results, cycle_count, ts, prior)
    critical_logs = _gen_critical_logs(INCIDENT_ID, alert, cycle_count, ts)
    progress_history = _gen_progress_history(INCIDENT_ID, cycle_count, ts, prior, actions, evidence)

    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    state: dict = {
        "incidentId": INCIDENT_ID,
        "sourceKind": "live",
        "severity": classification["severity"],
        "classification": classification["classification"],
        "tasks": [*(prior or {}).get("tasks", []), *tasks],
        "evidence": [*(prior or {}).get("evidence", []), *evidence],
        "actions": [*(prior or {}).get("actions", []), *actions],
        "criticalLogs": [*(prior or {}).get("criticalLogs", []), *critical_logs],
        "progressHistory": [*(prior or {}).get("progressHistory", []), *progress_history],
        "notifications": (prior or {}).get("notifications", []),
        "cycleCount": cycle_count,
        "lastCycleAt": now,
        "createdAt": (prior or {}).get("createdAt", now),
        "alert": alert,
    }
    if cycle_count >= 2:
        state["handoffSummary"] = _gen_handoff(client, state, nia_results)
        state["shiftHandoff"] = _gen_shift_handoff_context(state, nia_results)

    state["notifications"] = _dispatch_slack_outbox(
        _build_slack_outbox(state, alert, cycle_count)
    )
    _emit_event(
        "actions.dispatched",
        incidentId=INCIDENT_ID,
        cycle=cycle_count,
        actions=len(actions),
        notifications=len(state.get("notifications", [])),
    )

    await sb.write_file(
        f"{MEMORY_DIR}/{INCIDENT_ID}.json",
        json.dumps(state, indent=2).encode("utf-8"),
    )

    print(
        f"[sentinel] Incident cycle {cycle_count} done. "
        f"Severity: {state['severity']}. Tasks: {len(state['tasks'])}.",
        flush=True,
    )
    _emit_event(
        "incident.memory.written",
        incidentId=INCIDENT_ID,
        cycle=cycle_count,
        severity=state["severity"],
        evidence=len(state["evidence"]),
        actions=len(state["actions"]),
    )
    return state


def _has_lateral_movement_signal(prior: dict | None) -> bool:
    if prior and int(prior.get("cycleCount", 0)) >= 1:
        return True
    return False


def _build_slack_outbox(memory: dict, alert: dict, cycle: int) -> list[dict]:
    """Create durable Slack message intents without duplicating sent notifications."""
    existing = list(memory.get("notifications", []))
    keys = {n.get("dedupeKey") for n in existing}
    incident_id = memory["incidentId"]
    host = alert.get("affectedSystem", "unknown system")

    if cycle == 1:
        triage_key = f"{incident_id}:slack:triage"
        if triage_key not in keys:
            existing.append(_slack_notification(
                incident_id,
                triage_key,
                (
                    f":rotating_light: SentinelOps woke up for `{incident_id}` and triaged "
                    f"`{host}` as *{memory['severity'].upper()}* - {memory['classification']}.\n"
                    f"Early hypothesis: malicious mailbox activity on `{COMPROMISED_ACCOUNT}` "
                    f"may have led to `{SUSPECT_WORKSTATION}` and then `{host}` access.\n"
                    f"Tensorlake persisted cycle {cycle}; Nia grounded the response with "
                    f"{len(memory.get('evidence', []))} evidence item(s)."
                ),
            ))

    action_key = f"{incident_id}:slack:actions:{cycle}"
    cycle_actions = [a for a in memory.get("actions", []) if a.get("cycle") == cycle]
    if cycle_actions and action_key not in keys:
        action_lines = "\n".join(
            f"- `{a.get('actionType', 'action')}` on `{a.get('target', 'target')}` - {a.get('status', 'pending')}"
            for a in cycle_actions[:3]
        )
        existing.append(_slack_notification(
            incident_id,
            action_key,
            (
                f":shield: SentinelOps action update for `{incident_id}` cycle {cycle}:\n"
                f"{action_lines}\n"
                "Actions are recorded in Tensorlake memory with Nia-grounded source refs."
            ),
        ))

    note_key = f"{incident_id}:slack:note:{cycle}"
    if note_key not in keys:
        latest_progress = (memory.get("progressHistory") or [])[-1:]
        summary = latest_progress[0].get("summary") if latest_progress else None
        if summary:
            existing.append(_slack_notification(
                incident_id,
                note_key,
                f":memo: SentinelOps note for `{incident_id}` cycle {cycle}: {summary}",
            ))

    if cycle >= 2:
        handoff_key = f"{incident_id}:slack:handoff:{cycle}"
        if handoff_key not in keys:
            handoff = memory.get("handoffSummary") or "Handoff summary pending."
            existing.append(_slack_notification(
                incident_id,
                handoff_key,
                (
                    f":fire: SentinelOps escalated `{incident_id}` to "
                    f"*{memory['severity'].upper()}* after Tensorlake restored prior memory, "
                    f"confirmed possible lateral movement from `{SUSPECT_WORKSTATION}`, "
                    f"and completed cycle {cycle}.\n\n{handoff}"
                ),
            ))

    return existing


def _slack_notification(incident_id: str, dedupe_key: str, text: str) -> dict:
    ts = int(time.time() * 1000)
    return {
        "id": f"{incident_id}-slack-{ts}-{len(dedupe_key)}",
        "incidentId": incident_id,
        "dedupeKey": dedupe_key,
        "channel": os.environ.get("SLACK_CHANNEL_ID", ""),
        "text": text,
        "status": "pending",
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


def _dispatch_slack_outbox(notifications: list[dict]) -> list[dict]:
    """Post pending/failed Slack intents and persist delivery receipts."""
    token = os.environ.get("SLACK_BOT_TOKEN")
    channel = os.environ.get("SLACK_CHANNEL_ID")
    if not token or not channel:
        return [
            {
                **n,
                "status": "failed",
                "error": "Missing SLACK_BOT_TOKEN or SLACK_CHANNEL_ID",
            }
            if n.get("status") in ("pending", "failed") else n
            for n in notifications
        ]

    return [
        _send_slack_notification(token, channel, n)
        if n.get("status") in ("pending", "failed") else n
        for n in notifications
    ]


def _send_slack_notification(token: str, channel: str, notification: dict) -> dict:
    import httpx

    resolved_channel = notification.get("channel") or channel
    try:
        posted = httpx.post(
            "https://slack.com/api/chat.postMessage",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json; charset=utf-8",
            },
            json={
                "channel": resolved_channel,
                "text": notification["text"],
                "unfurl_links": False,
                "unfurl_media": False,
            },
            timeout=15,
        ).json()
        if not posted.get("ok") or not posted.get("ts"):
            return {
                **notification,
                "channel": resolved_channel,
                "status": "failed",
                "error": posted.get("error", "Slack post failed"),
            }

        posted_channel = posted.get("channel") or resolved_channel
        permalink = _slack_permalink(token, posted_channel, posted["ts"])
        result = {
            **notification,
            "channel": posted_channel,
            "status": "sent",
            "sentAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "slackTs": posted["ts"],
            "error": None,
        }
        if permalink:
            result["permalink"] = permalink
        return result
    except Exception as exc:
        return {
            **notification,
            "channel": resolved_channel,
            "status": "failed",
            "error": str(exc),
        }


def _slack_permalink(token: str, channel: str, message_ts: str) -> str | None:
    import httpx

    try:
        result = httpx.post(
            "https://slack.com/api/chat.getPermalink",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json; charset=utf-8",
            },
            json={"channel": channel, "message_ts": message_ts},
            timeout=15,
        ).json()
        if result.get("ok"):
            return result.get("permalink")
    except Exception as exc:
        print(f"[slack] permalink failed: {exc}", file=sys.stderr, flush=True)
    return None


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
            {"role": "system", "content": "Senior security incident commander. Return JSON only."},
            {
                "role": "user",
                "content": (
                    f"{prior_ctx}Alert: {json.dumps(alert)}\n"
                    f"Nia runbook context: {json.dumps(nia[:2])}\n"
                    "Also consider account compromise, malicious email attachment, token replay, "
                    "workstation-to-database lateral movement, and persistence attempts.\n"
                    'Return: {"severity":"critical"|"high"|"medium"|"low",'
                    '"classification":"<incident type>"}'
                ),
            },
        ],
    )
    return json.loads(resp.choices[0].message.content)


def _gen_tasks(client, incident_id: str, alert: dict, nia: list, cycle: int, ts: int) -> list:
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
                    f"Observed identity path: {COMPROMISED_ACCOUNT} received malicious email, "
                    f"{SUSPECT_WORKSTATION} executed PowerShell, then requested DB access.\n"
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


def _gen_evidence(client, incident_id: str, alert: dict, nia: list, cycle: int, ts: int) -> list:
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
                    "Include concrete evidence from M365 message trace, Entra ID sign-in risk, "
                    "EDR process telemetry, Kerberos service tickets, and database egress.\n"
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


def _source_ref(nia: list, fallback: str) -> str:
    if not nia:
        return fallback
    first = nia[0]
    if isinstance(first, dict):
        return (
            first.get("path")
            or first.get("sourcePath")
            or first.get("title")
            or first.get("name")
            or fallback
        )
    return fallback


def _gen_actions(
    incident_id: str,
    alert: dict,
    nia: list,
    cycle: int,
    ts: int,
    prior: dict | None,
) -> list:
    source = _source_ref(nia, "data/runbooks/db_exfiltration.md#immediate-containment")
    lateral_source = _source_ref(nia[1:] if len(nia) > 1 else nia, "data/runbooks/lateral_movement.md#containment")
    host = alert.get("affectedSystem", "prod-db-01")
    destination = "203.0.113.42"
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    if cycle >= 2:
        return [
            {
                "id": f"{incident_id}-action-{ts}-0",
                "incidentId": incident_id,
                "cycle": cycle,
                "proposedBy": "escalation-agent",
                "actionType": "escalate",
                "status": "completed",
                "target": "tier-2-on-call",
                "description": "Escalated confirmed exfiltration plus lateral-movement indicators to Tier-2 on-call and prepared shift handoff.",
                "groundedSource": source,
                "timestamp": now,
            },
            {
                "id": f"{incident_id}-action-{ts}-1",
                "incidentId": incident_id,
                "cycle": cycle,
                "proposedBy": "identity-containment-agent",
                "actionType": "disable_account",
                "status": "completed",
                "target": COMPROMISED_ACCOUNT,
                "description": f"Disabled {COMPROMISED_ACCOUNT}, revoked refresh tokens, and required password reset before re-enable.",
                "groundedSource": lateral_source,
                "timestamp": now,
            },
            {
                "id": f"{incident_id}-action-{ts}-2",
                "incidentId": incident_id,
                "cycle": cycle,
                "proposedBy": "endpoint-containment-agent",
                "actionType": "isolate_endpoint",
                "status": "executing",
                "target": SUSPECT_WORKSTATION,
                "description": f"Isolate {SUSPECT_WORKSTATION} from the finance subnet while preserving volatile EDR evidence.",
                "groundedSource": lateral_source,
                "timestamp": now,
            },
            {
                "id": f"{incident_id}-action-{ts}-3",
                "incidentId": incident_id,
                "cycle": cycle,
                "proposedBy": "communications-agent",
                "actionType": "notify_lead",
                "status": "completed",
                "target": "security-slack-incident-room",
                "description": "Sent Slack update with suspected phish-to-DB lateral path, containment status, and unresolved identity risk.",
                "groundedSource": "data/runbooks/incident_command_roles_contacts_escalation.md#stakeholder-communications",
                "timestamp": now,
            },
        ]

    return [
        {
            "id": f"{incident_id}-action-{ts}-0",
            "incidentId": incident_id,
            "cycle": cycle,
            "proposedBy": "containment-agent",
            "actionType": "isolate_host",
            "status": "executing",
            "target": host,
            "description": f"Isolate {host} from non-whitelisted outbound traffic while preserving database service state.",
            "groundedSource": source,
            "timestamp": now,
        },
        {
            "id": f"{incident_id}-action-{ts}-1",
            "incidentId": incident_id,
            "cycle": cycle,
            "proposedBy": "containment-agent",
            "actionType": "block_destination",
            "status": "completed",
            "target": destination,
            "description": f"Block outbound connections from {host} to external destination {destination}.",
            "groundedSource": source,
            "timestamp": now,
        },
        {
            "id": f"{incident_id}-action-{ts}-2",
            "incidentId": incident_id,
            "cycle": cycle,
            "proposedBy": "investigation-agent",
            "actionType": "request_logs",
            "status": "proposed",
            "target": "m365-entra-edr-audit-bundle",
            "description": f"Fetch M365 message trace, Entra sign-in risk, EDR process tree, and Kerberos service tickets for {COMPROMISED_ACCOUNT} and {SUSPECT_WORKSTATION}.",
            "groundedSource": lateral_source,
            "timestamp": now,
        },
        {
            "id": f"{incident_id}-action-{ts}-3",
            "incidentId": incident_id,
            "cycle": cycle,
            "proposedBy": "communications-agent",
            "actionType": "notify_lead",
            "status": "completed",
            "target": "security-slack-incident-room",
            "description": "Posted initial Slack incident update with DB exfiltration suspicion and account-compromise hypothesis.",
            "groundedSource": "data/runbooks/incident_command_roles_contacts_escalation.md#initial-notification",
            "timestamp": now,
        },
    ]


def _gen_critical_logs(incident_id: str, alert: dict, cycle: int, ts: int) -> list:
    host = alert.get("affectedSystem", "prod-db-01")
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    if cycle >= 2:
        return [
            {
                "id": f"{incident_id}-log-{ts}-0",
                "incidentId": incident_id,
                "source": "firewall-egress",
                "severity": "critical",
                "message": f"{host} attempted additional outbound transfer after initial containment signal.",
                "timestamp": now,
            },
            {
                "id": f"{incident_id}-log-{ts}-1",
                "incidentId": incident_id,
                "source": "m365-defender",
                "severity": "critical",
                "message": f"{COMPROMISED_ACCOUNT} received phishing email with malicious HTML attachment before {SUSPECT_WORKSTATION} process execution.",
                "timestamp": now,
            },
            {
                "id": f"{incident_id}-log-{ts}-2",
                "incidentId": incident_id,
                "source": "entra-id",
                "severity": "critical",
                "message": f"{COMPROMISED_ACCOUNT} showed impossible travel and high-risk token replay indicators.",
                "timestamp": now,
            },
            {
                "id": f"{incident_id}-log-{ts}-3",
                "incidentId": incident_id,
                "source": "kerberos",
                "severity": "warning",
                "message": f"{SUSPECT_WORKSTATION} requested MSSQL service ticket for {host}; likely lateral movement path to database host.",
                "timestamp": now,
            },
        ]

    return [
        {
            "id": f"{incident_id}-log-{ts}-0",
            "incidentId": incident_id,
            "source": "firewall-egress",
            "severity": "critical",
            "message": f"{host} transferred data to unapproved external destination before block action.",
            "timestamp": now,
        },
        {
            "id": f"{incident_id}-log-{ts}-1",
            "incidentId": incident_id,
            "source": "m365-defender",
            "severity": "warning",
            "message": f"Suspicious email delivered to {COMPROMISED_ACCOUNT}; attachment later correlated with {SUSPECT_WORKSTATION} PowerShell execution.",
            "timestamp": now,
        },
        {
            "id": f"{incident_id}-log-{ts}-2",
            "incidentId": incident_id,
            "source": "edr",
            "severity": "warning",
            "message": f"{SUSPECT_WORKSTATION} spawned encoded PowerShell and touched finance file share before DB access.",
            "timestamp": now,
        },
    ]


def _gen_progress_history(
    incident_id: str,
    cycle: int,
    ts: int,
    prior: dict | None,
    actions: list,
    evidence: list,
) -> list:
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    prior_summary = (
        f"Loaded prior Tensorlake memory with {len((prior or {}).get('evidence', []))} evidence items "
        f"and {len((prior or {}).get('actions', []))} actions."
        if prior
        else "No prior incident memory found; starting response context and checking DB, mailbox, identity, and endpoint telemetry."
    )
    executed = ", ".join(a.get("actionType", "action") for a in actions) or "no action"
    observed = "; ".join(e.get("source", "evidence") for e in evidence) or "no new evidence"

    return [
        {
            "id": f"{incident_id}-progress-{ts}-0",
            "incidentId": incident_id,
            "cycle": cycle,
            "actor": "Sentinel agent",
            "status": "observed",
            "summary": prior_summary,
            "timestamp": now,
        },
        {
            "id": f"{incident_id}-progress-{ts}-1",
            "incidentId": incident_id,
            "cycle": cycle,
            "actor": "response sub-agents",
            "status": "executed" if actions else "decided",
            "summary": f"Cycle {cycle} added evidence from {observed} and produced {executed}.",
            "timestamp": now,
        },
        {
            "id": f"{incident_id}-progress-{ts}-2",
            "incidentId": incident_id,
            "cycle": cycle,
            "actor": "lateral-movement detector",
            "status": "observed" if cycle == 1 else "executed",
            "summary": (
                f"Tracked suspected path: phishing email to {COMPROMISED_ACCOUNT}, "
                f"{SUSPECT_WORKSTATION} PowerShell execution, service-ticket request to prod-db-01, "
                "and continued egress retries after containment."
            ),
            "timestamp": now,
        },
    ]


def _gen_shift_handoff_context(memory: dict, nia: list) -> dict:
    actions = memory.get("actions", [])[-5:]
    logs = memory.get("criticalLogs", [])[-5:]
    sources = []
    for ev in memory.get("evidence", []):
        ref = ev.get("niaSourceRef")
        if ref and ref not in sources:
            sources.append(ref)
    source = _source_ref(nia, "data/runbooks/incident_command_roles_contacts_escalation.md#shift-handoff")
    if source not in sources:
        sources.append(source)

    return {
        "generatedAt": memory["lastCycleAt"],
        "incomingShiftFocus": [
            "Confirm containment remains in place and no new egress destination appeared.",
            f"Confirm {COMPROMISED_ACCOUNT} token revocation, mailbox rule cleanup, and password reset before recovery.",
            f"Review {SUSPECT_WORKSTATION} EDR process tree and preserve memory before reimage.",
            "Prepare impact notes from confirmed transfer size and affected data owner.",
        ],
        "actionsTaken": [a.get("description", "") for a in actions if a.get("description")],
        "unresolvedRisks": [
            "Additional staging paths may exist on the database host.",
            "Mailbox forwarding rule or OAuth consent persistence may survive account password reset.",
            "Additional employees may have received the same malicious attachment.",
            "Credential exposure scope is not fully closed.",
        ],
        "criticalLogIds": [log.get("id") for log in logs if log.get("id")],
        "niaSources": sources[:5],
        "memoryBasis": (
            f"Tensorlake memory for {memory['incidentId']} across {memory['cycleCount']} cycles: "
            "evidence, tasks, actions, critical logs, and progress history."
        ),
    }


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
