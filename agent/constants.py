"""Centralized constants for the agent runtime. No literals belong outside this file."""

from typing import Final

SEVERITY_LEVELS: Final = {
    "CRITICAL": "critical",
    "HIGH": "high",
    "MEDIUM": "medium",
    "LOW": "low",
    "INFO": "info",
}

ALERT_TYPES: Final = {
    "GUARDDUTY": "guardduty",
    "SCHEDULED_SCAN": "scheduled_scan",
    "AGENT_TRIGGER": "agent_trigger",
}

RUNBOOK_IDS: Final = {
    "CREDENTIAL_EXPOSURE": "rb_credential_exposure",
    "MALWARE_DETECTED": "rb_malware_detected",
    "ANOMALOUS_API_CALL": "rb_anomalous_api",
    "PORT_SCAN": "rb_port_scan",
    "DATA_EXFILTRATION": "rb_data_exfiltration",
}

NIA_QUERY_TEMPLATES: Final = {
    "RUNBOOK_FOR_FINDING": "runbook for finding type: {finding_type}",
    "POSTMORTEM_FOR_SIGNATURE": "postmortems matching signature: {signature}",
    "PROCEDURE_LOOKUP": "procedure: {procedure_name}",
}

MEMORY_KEYS: Final = {
    "INCIDENT_PREFIX": "incident:",
    "TASK_PREFIX": "task:",
    "EVIDENCE_PREFIX": "evidence:",
    "AGENT_CYCLE": "agent:last_cycle",
    "AGENT_HEALTH": "agent:health",
}

CYCLE_INTERVALS: Final = {
    "POLL_SECONDS": 30,
    "HEARTBEAT_SECONDS": 60,
    "RUNBOOK_REFRESH_SECONDS": 900,
    "MEMORY_COMPACT_SECONDS": 3_600,
}

ESCALATION_THRESHOLDS: Final = {
    "CRITICAL_RESPONSE_SECONDS": 300,
    "HIGH_RESPONSE_SECONDS": 1_800,
    "MAX_RETRIES_BEFORE_ESCALATE": 3,
    "STUCK_TASK_SECONDS": 600,
}

ENV_KEYS: Final = {
    "TENSORLAKE_API_KEY": "TENSORLAKE_API_KEY",
    "TENSORLAKE_PROJECT_ID": "TENSORLAKE_PROJECT_ID",
    "NIA_API_KEY": "NIA_API_KEY",
    "NIA_INDEX_ID": "NIA_INDEX_ID",
    "MOCK_ALERT_WEBHOOK_URL": "MOCK_ALERT_WEBHOOK_URL",
    "MOCK_ALERT_INTERVAL_SECONDS": "MOCK_ALERT_INTERVAL_SECONDS",
}
