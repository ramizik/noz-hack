# Incident Command Roles, Contacts, and Escalation Directory

Document owner: Security Operations
Last reviewed: 2026-04-30
Classification: Internal Use Only
Note: All people, addresses, and phone numbers are fictional demo data.

## Purpose

This directory defines who owns each part of a cybersecurity incident and when they must be contacted. It is intended for automated response agents and human responders. If an agent classifies an incident as High or Critical, it should use this document to create communication tasks, identify the correct role, and generate a shift handoff with accountable owners.

## Incident Roles

Incident Commander:

- Primary: Maya Chen, Director of Security Operations
- Email: `maya.chen@example-corp.test`
- Phone: `+1-555-0101`
- Pager: `sec-ic-primary`
- Responsibilities: Owns incident cadence, severity decisions, bridge discipline, and executive updates. Approves containment that may cause material business impact.

Deputy Incident Commander:

- Primary: Andre Patel, Senior Security Program Manager
- Email: `andre.patel@example-corp.test`
- Phone: `+1-555-0102`
- Pager: `sec-ic-secondary`
- Responsibilities: Tracks timeline, actions, evidence, and open decisions. Prepares handoff and ensures Tensorlake memory snapshots are complete.

Security Lead:

- Primary: Priya Raman, Head of Detection and Response
- Email: `priya.raman@example-corp.test`
- Phone: `+1-555-0103`
- Pager: `security-lead`
- Responsibilities: Directs technical investigation, validates classification, assigns investigation and containment agents, and approves high-confidence blocking actions.

Containment Lead:

- Primary: Jonah Miles, Network Security Engineering
- Email: `jonah.miles@example-corp.test`
- Phone: `+1-555-0104`
- Pager: `netsec-containment`
- Responsibilities: Applies quarantine policies, firewall blocks, segmentation controls, and rollback notes. Owns `sg-quarantine-db` and `fw-egress-01` changes.

Database Owner:

- Primary: Elena Rossi, Principal Database Reliability Engineer
- Email: `elena.rossi@example-corp.test`
- Phone: `+1-555-0105`
- Pager: `dbre-prod`
- Responsibilities: Validates database health, audit logging, table sensitivity, backup state, and safe query execution during investigation.

Application Owner:

- Primary: Marcus Hill, Finance Platform Engineering
- Email: `marcus.hill@example-corp.test`
- Phone: `+1-555-0106`
- Pager: `finance-platform`
- Responsibilities: Confirms scheduled jobs, expected data exports, finance application dependencies, and user impact from containment.

Legal and Privacy:

- Primary: Nora Fields, Privacy Counsel
- Email: `nora.fields@example-corp.test`
- Phone: `+1-555-0107`
- Pager: `legal-privacy`
- Responsibilities: Determines breach notification obligations, privilege boundaries, and evidence retention requirements.

Executive Sponsor:

- Primary: Victor Okafor, CISO
- Email: `victor.okafor@example-corp.test`
- Phone: `+1-555-0108`
- Pager: `ciso-urgent`
- Responsibilities: Executive decision maker for Critical incidents, customer notification posture, board-level communications, and regulatory escalation.

Communications Lead:

- Primary: Sofia Alvarez, Corporate Communications
- Email: `sofia.alvarez@example-corp.test`
- Phone: `+1-555-0109`
- Pager: `corp-comms`
- Responsibilities: Internal and external messaging when approved by IC, Legal, and CISO.

## Severity-Based Escalation

Low:

- Notify Security Operations queue.
- No page required.
- Update ticket within one business day.

Medium:

- Notify Security Lead during business hours.
- Create investigation task.
- Escalate if more than one production host is affected.

High:

- Page Security Lead within 30 minutes.
- Assign Incident Commander.
- Open incident bridge if active compromise is plausible.
- Notify system owner and containment lead.
- Prepare stakeholder update within 30 minutes.

Critical:

- Page CISO immediately.
- Page Legal and Privacy immediately if data exposure is possible.
- Open war room bridge.
- Freeze routine changes in affected environment.
- Create executive summary within 30 minutes.
- Update every 30 minutes until severity is downgraded or contained.

## Escalation Rules for Database Exfiltration

Unusual outbound traffic from `prod-db-01` starts at High if the destination is not allowlisted. Escalate to Critical if logs confirm more than 1 GB transferred, PII table access, financial ledger table access, known malicious destination, or credential compromise. If the alert references `185.220.101.45`, `203.0.113.42`, `pg_dump`, `finance.customer_ledger`, or `billing.payment_tokens`, page the CISO and Legal once confirmed.

For the demo incident:

- Cycle 1: notify Security Lead Priya Raman and assign IC Maya Chen.
- Cycle 1: notify Containment Lead Jonah Miles for host isolation and destination block.
- Cycle 1: notify Database Owner Elena Rossi for audit log review.
- Cycle 2 after 2 GB evidence: page CISO Victor Okafor and Legal Nora Fields.

## Bridge and Channel Conventions

Incident bridge: `https://meet.example-corp.test/sec-bridge`
Slack incident channel: `#inc-prod-db-01`
Ticket prefix: `SEC-INC`
Evidence store path: `s3://example-corp-security-evidence/incidents/{incident_id}/`
Tensorlake memory path: `/memory/{incident_id}.json`
Nia source tag: `sentinelops`

## Communication Rules

Communications must be precise and restrained. Do not say "breach" until Legal confirms notification criteria. Do not say "false positive" until the suspicious flow, process, and data access have been explained. Use "potential data exfiltration" until confirmed. Every update must contain severity, affected systems, customer impact status, containment status, evidence collected, open questions, next update time, and named owner.

## Shift Handoff Checklist

The outgoing responder must include:

- Incident ID and current severity.
- Current phase and status.
- Affected host and aliases.
- Suspicious destination IPs and ports.
- Current containment controls.
- Evidence already collected.
- Tasks still open by owner.
- Decision log, including why severity changed.
- Nia documents used.
- Tensorlake cycle count and last memory write time.
- Next update deadline.

