#!/usr/bin/env python3
"""Deterministic Python incident cycle for Tensorlake background execution."""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path
from typing import Any


def main() -> None:
    args = parse_args()
    memory_dir = Path(args.memory_dir)
    memory_dir.mkdir(parents=True, exist_ok=True)

    alert = json.loads(Path(args.event).read_text(encoding="utf-8"))
    memory_path = memory_dir / f"{args.incident_id}.json"
    prior = json.loads(memory_path.read_text(encoding="utf-8")) if memory_path.exists() else None
    state = build_memory(args.incident_id, alert, prior)

    memory_path.write_text(json.dumps(state, indent=2, sort_keys=True), encoding="utf-8")
    print(json.dumps(state, sort_keys=True))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run one SentinelOps incident cycle")
    parser.add_argument("--incident-id", required=True)
    parser.add_argument("--event", required=True)
    parser.add_argument("--memory-dir", default="/memory")
    return parser.parse_args()


def build_memory(
    incident_id: str,
    alert: dict[str, Any],
    prior: dict[str, Any] | None,
) -> dict[str, Any]:
    cycle_count = int((prior or {}).get("cycleCount", 0)) + 1
    now = iso_now()
    severity = classify_severity(alert, prior)
    classification = "suspected database exfiltration"

    prior_tasks = list((prior or {}).get("tasks", []))
    prior_evidence = list((prior or {}).get("evidence", []))

    state: dict[str, Any] = {
        "incidentId": incident_id,
        "severity": severity,
        "classification": classification,
        "tasks": [*prior_tasks, *tasks_for_cycle(incident_id, cycle_count)],
        "evidence": [*prior_evidence, *evidence_for_cycle(incident_id, alert, cycle_count)],
        "cycleCount": cycle_count,
        "lastCycleAt": now,
    }

    if cycle_count >= 2:
        state["handoffSummary"] = handoff_summary(state)

    return state


def classify_severity(alert: dict[str, Any], prior: dict[str, Any] | None) -> str:
    details = str(alert.get("details", "")).lower()
    if prior and any(token in details for token in ("2gb", "2 gb", "exfil", "outbound transfer")):
        return "critical"
    if any(token in details for token in ("prod-db", "outbound", "unknown ip")):
        return "high"
    return "medium"


def tasks_for_cycle(incident_id: str, cycle_count: int) -> list[dict[str, Any]]:
    timestamp = int(time.time() * 1000)
    if cycle_count == 1:
        return [
            task(incident_id, timestamp, 0, "contain", "security-ops", "Isolate prod-db-01 with the quarantine security group.", "in_progress"),
            task(incident_id, timestamp, 1, "investigate", "security-ops", "Pull the last 60 minutes of egress logs for prod-db-01.", "in_progress"),
            task(incident_id, timestamp, 2, "communicate", "on-call", "Notify the security lead with current severity and evidence.", "pending"),
        ]
    return [
        task(incident_id, timestamp, 0, "investigate", "security-ops", "Mark egress log collection complete and attach 2GB transfer evidence.", "done"),
        task(incident_id, timestamp, 1, "escalate", "security-lead", "Open the incident bridge and page the escalation owner.", "in_progress"),
        task(incident_id, timestamp, 2, "communicate", "on-call", "Publish the Tensorlake handoff summary to Slack and dashboard.", "in_progress"),
    ]


def task(
    incident_id: str,
    timestamp: int,
    index: int,
    task_type: str,
    assigned_to: str,
    description: str,
    status: str,
) -> dict[str, Any]:
    return {
        "id": f"{incident_id}-task-{timestamp}-{index}",
        "incidentId": incident_id,
        "type": task_type,
        "assignedTo": assigned_to,
        "status": status,
        "description": description,
    }


def evidence_for_cycle(
    incident_id: str,
    alert: dict[str, Any],
    cycle_count: int,
) -> list[dict[str, Any]]:
    timestamp = int(time.time() * 1000)
    if cycle_count == 1:
        content = (
            f"{alert.get('affectedSystem', 'affected system')} generated unusual outbound traffic. "
            "Nia matched the database exfiltration runbook and a related prior postmortem."
        )
    else:
        content = (
            "Follow-up egress evidence confirms the outbound transfer crossed the critical escalation threshold. "
            "Tensorlake memory preserved the prior HIGH triage context before this cycle."
        )
    return [
        {
            "id": f"{incident_id}-ev-{timestamp}",
            "incidentId": incident_id,
            "source": "Tensorlake Python investigator",
            "content": content,
            "niaSourceRef": "Nia context: db-exfiltration runbook, prior prod-db postmortem, Tensorlake memory, Slack, dashboard",
            "timestamp": iso_now(),
        }
    ]


def handoff_summary(memory: dict[str, Any]) -> str:
    evidence_count = len(memory.get("evidence", []))
    task_count = len(memory.get("tasks", []))
    return (
        f"Incident {memory['incidentId']} is now CRITICAL after Python background execution in Tensorlake "
        f"confirmed production database egress evidence. Tensorlake preserved {evidence_count} evidence items "
        f"and {task_count} tasks across cycles. Immediate next steps: confirm host isolation, keep the incident "
        "bridge active, notify the security lead, and continue collecting egress logs for handoff."
    )


def iso_now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


if __name__ == "__main__":
    main()
