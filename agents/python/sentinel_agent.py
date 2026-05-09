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


async def _monitoring_cycle(sb) -> dict:
    from openai import OpenAI

    print("[sentinel] Monitoring mode — scanning logs", flush=True)

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

    query = (
        f"{alert.get('type', 'security_incident')} {alert.get('affectedSystem', 'host')} "
        "incident response runbook data exfiltration"
    )
    nia_results = _nia_search(query)
    print(f"[sentinel] Nia returned {len(nia_results)} results", flush=True)

    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    classification = _classify(client, alert, nia_results, prior)
    ts = int(time.time() * 1000)
    tasks = _gen_tasks(client, INCIDENT_ID, alert, nia_results, cycle_count, ts)
    evidence = _gen_evidence(client, INCIDENT_ID, alert, nia_results, cycle_count, ts)

    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    state: dict = {
        "incidentId": INCIDENT_ID,
        "severity": classification["severity"],
        "classification": classification["classification"],
        "tasks": [*(prior or {}).get("tasks", []), *tasks],
        "evidence": [*(prior or {}).get("evidence", []), *evidence],
        "cycleCount": cycle_count,
        "lastCycleAt": now,
        "createdAt": (prior or {}).get("createdAt", now),
        "alert": alert,
    }
    if cycle_count >= 2:
        state["handoffSummary"] = _gen_handoff(client, state, nia_results)

    await sb.write_file(
        f"{MEMORY_DIR}/{INCIDENT_ID}.json",
        json.dumps(state, indent=2).encode("utf-8"),
    )

    print(
        f"[sentinel] Incident cycle {cycle_count} done. "
        f"Severity: {state['severity']}. Tasks: {len(state['tasks'])}.",
        flush=True,
    )
    return state


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
