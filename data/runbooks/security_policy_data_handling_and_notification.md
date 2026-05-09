# Security Policy: Data Handling, Evidence Retention, and Notification

Document owner: Legal, Privacy, and Security Governance
Last reviewed: 2026-04-25
Classification: Internal Use Only

## Purpose

This policy defines how responders handle potential data exposure incidents. It covers evidence retention, regulated data classification, stakeholder notification, legal escalation, and language that may be used before facts are confirmed. It is relevant for database exfiltration, suspicious outbound transfer, restricted table access, and incidents involving `prod-db-01`.

## Data Classes

Public:

- Marketing pages, public documentation, published pricing, and already public status messages.

Internal:

- Engineering runbooks, service health dashboards, internal metrics, and ordinary operational logs.

Confidential:

- Non-public architecture diagrams, incident reports, system owner lists, and business reports.

Restricted:

- Customer names, emails, billing addresses, payment-token references, finance ledger records, authentication logs, fraud review notes, API tokens, credentials, secrets, and legal case material.

`prod-db-01` stores Restricted data. Any unapproved export or suspicious outbound transfer from this host must be treated as potential Restricted data exposure until investigation proves otherwise.

## Evidence Retention

Preserve evidence in a way that supports later review. Do not modify original logs. Do not delete temporary files, compressed archives, database audit rows, firewall sessions, or EDR telemetry. Store copies under the incident evidence path:

`s3://example-corp-security-evidence/incidents/{incident_id}/`

Minimum evidence set for database exfiltration:

- Alert payload.
- Firewall session with byte count.
- VPC flow logs.
- EDR process tree.
- Database audit logs showing table access.
- Bastion session logs.
- VPN authentication logs.
- Vault access logs.
- Nia context references used by the agent.
- Tensorlake memory snapshots for each cycle.

## Notification Thresholds

Security Lead notification:

- Required for any High incident.
- Required for unapproved outbound traffic from a production database host.
- Required for suspicious export tooling.

Incident Commander assignment:

- Required for High or Critical incidents.
- Required if containment may degrade production service.

CISO page:

- Required for Critical incidents.
- Required for confirmed transfer over 1 GB from a restricted data host.
- Required for evidence of regulated data access followed by suspicious outbound transfer.

Legal and Privacy notification:

- Required when Restricted customer data may have been accessed or transferred.
- Required before anyone uses the words breach, disclosure, regulatory notification, or customer notice externally.
- Required if `billing.payment_tokens`, `accounts.customer_profile`, `finance.customer_ledger`, or `audit.login_history` are in scope.

## Approved Language

Use careful, factual language:

- "Potential data exfiltration detected."
- "Restricted database host initiated unapproved outbound traffic."
- "Investigation is validating whether sensitive data was accessed or transferred."
- "Containment is active and evidence is being preserved."

Avoid premature conclusions:

- Do not say "breach confirmed" without Legal approval.
- Do not say "no customer impact" until table access and transfer evidence are complete.
- Do not say "false positive" because a user has not confessed to a benign action.
- Do not disclose specific customer data categories outside the incident team until approved.

## Regulatory Clock

The regulatory notification clock does not start from a raw alert alone. It may start when Legal determines that unauthorized acquisition of regulated data is reasonably likely. However, Security must preserve the timeline from first detection. Handoffs must include first alert time, first containment time, first evidence of restricted data access, and time Legal was notified.

For the demo scenario:

- First alert: unusual outbound traffic from `prod-db-01` at 03:14 UTC.
- First containment target: destination block and database quarantine.
- Potential Critical evidence: 2 GB transferred to `185.220.101.45`.
- Legal notification trigger: confirmed restricted table access or confirmed 2 GB transfer from restricted host.

## Handoff Requirements

Every handoff must include:

- Incident ID.
- Severity and why it changed.
- Affected systems and owners.
- Data classes potentially involved.
- Known evidence and evidence gaps.
- Containment actions already completed.
- Notifications already sent.
- Legal and privacy status.
- Next decision deadline.
- Nia document titles used.
- Tensorlake cycle count and last memory time.

## Agent Instruction

If an agent sees `prod-db-01`, `2GB`, `185.220.101.45`, `203.0.113.42`, `finance.customer_ledger`, `billing.payment_tokens`, or "unusual outbound traffic", it should retrieve this policy along with the database exfiltration playbook and incident command directory. The agent should produce cautious communication and preserve evidence before suggesting destructive actions.

