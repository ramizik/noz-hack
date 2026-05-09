#!/usr/bin/env python3
"""SentinelOps incident cycle: Nia knowledge retrieval + OpenAI classification."""

from __future__ import annotations

import argparse
import json
import os
import time
from pathlib import Path

import httpx
from openai import OpenAI

NIA_BASE = "https://apigcp.trynia.ai/v2"
_openai: OpenAI | None = None


def oai() -> OpenAI:
    """Return cached OpenAI client."""
    global _openai
    if _openai is None:
        _openai = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    return _openai


def main() -> None:
    """Entry point: load alert + prior memory, run cycle, write memory, print JSON."""
    args = parse_args()
    memory_dir = Path(args.memory_dir)
    memory_dir.mkdir(parents=True, exist_ok=True)

    alert = json.loads(Path(args.event).read_text(encoding="utf-8"))
    memory_path = memory_dir / f"{args.incident_id}.json"
    prior = json.loads(memory_path.read_text(encoding="utf-8")) if memory_path.exists() else None

    state = run_cycle(args.incident_id, alert, prior)
    memory_path.write_text(json.dumps(state, indent=2, sort_keys=True), encoding="utf-8")
    print(json.dumps(state, sort_keys=True))


def run_cycle(incident_id: str, alert: dict, prior: dict | None) -> dict:
    """Execute one agent cycle: Nia search → classify → tasks → evidence → handoff."""
    cycle_count = int((prior or {}).get("cycleCount", 0)) + 1
    query = f"{alert.get('type', '')} {alert.get('affectedSystem', '')} incident response runbook"
    nia = nia_search(query)

    classification = classify(alert, nia, prior)
    tasks = gen_tasks(incident_id, alert, nia, cycle_count)
    evidence = gen_evidence(incident_id, alert, nia, cycle_count)

    state: dict = {
        "incidentId": incident_id,
        "severity": classification["severity"],
        "classification": classification["classification"],
        "tasks": [*(prior or {}).get("tasks", []), *tasks],
        "evidence": [*(prior or {}).get("evidence", []), *evidence],
        "cycleCount": cycle_count,
        "lastCycleAt": iso_now(),
    }

    if cycle_count >= 2:
        state["handoffSummary"] = gen_handoff(state, nia)

    return state


def nia_search(query: str) -> list[dict]:
    """Search Nia for relevant runbook/postmortem context."""
    api_key = os.environ.get("NIA_API_KEY", "")
    if not api_key:
        return []
    try:
        r = httpx.get(
            f"{NIA_BASE}/contexts/search",
            params={"query": query},
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=15,
        )
        r.raise_for_status()
        data = r.json()
        return (data.get("results") or data or [])[:3]
    except Exception as exc:
        print(f"[nia] search failed: {exc}", flush=True)
        return []


def classify(alert: dict, nia: list[dict], prior: dict | None) -> dict:
    """Classify incident severity + type using OpenAI gpt-4o."""
    prior_ctx = f"Prior severity: {prior['severity']}. " if prior else ""
    resp = oai().chat.completions.create(
        model="gpt-4o",
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": "Senior security incident commander. Return JSON only."},
            {"role": "user", "content": (
                f"{prior_ctx}Alert: {json.dumps(alert)}\n"
                f"Nia context: {json.dumps(nia[:2])}\n"
                'Return: {"severity":"critical"|"high"|"medium"|"low","classification":"<type>"}'
            )},
        ],
    )
    return json.loads(resp.choices[0].message.content)


def gen_tasks(incident_id: str, alert: dict, nia: list[dict], cycle: int) -> list[dict]:
    """Generate 3 response tasks grounded in Nia containment procedures."""
    resp = oai().chat.completions.create(
        model="gpt-4o",
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": "Security responder. Return JSON only."},
            {"role": "user", "content": (
                f"Alert: {json.dumps(alert)}, cycle {cycle}\n"
                f"Nia procedures: {json.dumps(nia[:2])}\n"
                'Return: {"tasks":[{"type":"contain"|"investigate"|"communicate"|"escalate",'
                '"assignedTo":"<role>","description":"<action>"}]}'
            )},
        ],
    )
    raw = json.loads(resp.choices[0].message.content).get("tasks", [])
    ts = int(time.time() * 1000)
    return [
        {"id": f"{incident_id}-task-{ts}-{i}", "incidentId": incident_id,
         "type": t["type"], "assignedTo": t["assignedTo"],
         "status": "pending", "description": t["description"]}
        for i, t in enumerate(raw[:3])
    ]


def gen_evidence(incident_id: str, alert: dict, nia: list[dict], cycle: int) -> list[dict]:
    """Generate evidence items with Nia source references."""
    resp = oai().chat.completions.create(
        model="gpt-4o",
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": "Security investigator. Return JSON only."},
            {"role": "user", "content": (
                f"Alert: {json.dumps(alert)}, cycle {cycle}\n"
                f"Nia context: {json.dumps(nia[:2])}\n"
                'Return: {"evidence":[{"source":"<source>","content":"<finding>",'
                '"niaSourceRef":"<nia doc/section>"}]}'
            )},
        ],
    )
    raw = json.loads(resp.choices[0].message.content).get("evidence", [])
    ts = int(time.time() * 1000)
    return [
        {"id": f"{incident_id}-ev-{ts}-{i}", "incidentId": incident_id,
         "source": e["source"], "content": e["content"],
         "niaSourceRef": e.get("niaSourceRef"), "timestamp": iso_now()}
        for i, e in enumerate(raw[:2])
    ]


def gen_handoff(memory: dict, nia: list[dict]) -> str:
    """Generate shift handoff summary using OpenAI and Nia escalation procedures."""
    escalation = nia_search("escalation procedure shift handoff security incident")
    resp = oai().chat.completions.create(
        model="gpt-4o",
        temperature=0,
        messages=[
            {"role": "system", "content": "Security comms specialist writing shift handoff summaries."},
            {"role": "user", "content": (
                f"Incident: {json.dumps({k: memory[k] for k in ('incidentId','severity','classification','cycleCount')})}\n"
                f"Evidence: {json.dumps(memory.get('evidence', []))}\n"
                f"Tasks: {json.dumps(memory.get('tasks', []))}\n"
                f"Nia escalation procedures: {json.dumps((escalation or nia)[:1])}\n"
                "Write shift handoff summary. Under 200 words, plain text, no markdown."
            )},
        ],
    )
    return resp.choices[0].message.content


def iso_now() -> str:
    """Return current UTC time as ISO 8601 string."""
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def parse_args() -> argparse.Namespace:
    """Parse CLI arguments."""
    p = argparse.ArgumentParser()
    p.add_argument("--incident-id", required=True)
    p.add_argument("--event", required=True)
    p.add_argument("--memory-dir", default="/memory")
    return p.parse_args()


if __name__ == "__main__":
    main()
