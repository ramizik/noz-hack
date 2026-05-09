# Enterprise Playbook: Database Exfiltration From Production

Document owner: Detection and Response Engineering
Last reviewed: 2026-05-01
Classification: Internal Use Only
Primary systems: `prod-db-01`, Atlas production database subnet, finance ledger

## When To Use This Playbook

Use this playbook when an alert indicates unusual outbound traffic from a production database host, unexpected export tools such as `pg_dump`, off-hours movement of finance or customer data, suspicious cloud storage uploads, or public internet egress from a restricted database subnet. This playbook is the primary response document for the demo alert: unusual outbound traffic from `prod-db-01` at 03:14 UTC to `185.220.101.45` over TCP/443 with about 2 GB transferred.

The goal is to contain the data path, preserve forensic evidence, determine what data was accessed, and give leadership a clear answer within the first hour. Do not spend the first hour debating root cause before containment. A restricted data-tier host sending gigabytes to an unapproved public IP is already a high-confidence incident.

## Detection Criteria

Trigger this playbook when any of the following are true:

- A database host initiates outbound internet traffic to a destination not in the approved egress list.
- A single session from a database host transfers more than 500 MB outside business hours.
- `pg_dump`, `mysqldump`, `bcp`, `sqlcmd`, `COPY TO PROGRAM`, or bulk export commands run outside a scheduled job.
- A database service account authenticates from an unusual bastion, VPN client, or automation host.
- Firewall logs show TCP/443, TCP/80, TCP/1194, or TCP/22 from a database host to a public IP.
- DLP, EDR, or SIEM events show compressed archives created under `/tmp`, `/var/tmp`, `/backups`, or service account home directories.

For `prod-db-01`, normal egress should be telemetry only. A transfer to `185.220.101.45` or `203.0.113.42` is never normal. A 2 GB transfer should move the incident from High to Critical once confirmed by firewall or VPC flow logs.

## First 15 Minutes

1. Assign an Incident Commander and record the incident ID.
2. Confirm the affected host identity. For `prod-db-01`, correlate `10.0.1.45`, `10.42.18.27`, and hostname records.
3. Snapshot current network connections with `ss -tnp` or the EDR equivalent.
4. Apply quarantine security group `sg-quarantine-db` or the equivalent policy. Leave telemetry and EDR channels open.
5. Block the suspicious destination at the egress firewall. For this scenario block `185.220.101.45/32` and `203.0.113.42/32`.
6. Preserve logs from firewall, VPC flow logs, database audit logs, EDR process telemetry, bastion logs, and VPN authentication.
7. Open the security incident bridge and page the Security Lead if the event is outside business hours.

Do not restart the host, stop the database, delete temporary files, revoke broad credentials without preserving session context, or run invasive forensic tools that may destroy timestamps.

## Evidence To Collect

Collect enough evidence to answer these questions:

- Which host transferred data?
- Which destination received it?
- How many bytes were transferred?
- Which process initiated the transfer?
- Which database user or service account accessed data before the transfer?
- Which tables, schemas, or files were accessed?
- Was the data PII, payment-related, financial ledger, credentials, or internal-only?
- Did the attacker use a known path from a prior incident?

For `prod-db-01`, prioritize:

- Firewall session record for `10.0.1.45 -> 185.220.101.45:443`.
- VPC flow log for `10.42.18.27 -> 185.220.101.45`.
- EDR process event showing `pg_dump`, `psql`, `gzip`, `curl`, `openssl`, or `scp`.
- PostgreSQL audit rows for `finance.customer_ledger`, `billing.payment_tokens`, `accounts.customer_profile`, and `audit.login_history`.
- Bastion session transcript for `bastion-01`.
- Vault access log for token renewal anomalies.

## Severity Rules

Start at High when any restricted database host makes unapproved public egress. Upgrade to Critical if any one of the following is true:

- Confirmed transfer size exceeds 1 GB.
- Accessed table includes PII, regulated financial data, payment tokens, or authentication secrets.
- Destination is known malicious, Tor-associated, or previously seen in incident intelligence.
- Evidence shows credential compromise, privilege escalation, persistence, or data staging.
- The incident affects more than one host or a shared service account.

The demo event should be High on cycle 1 because the alert says unusual outbound traffic from a restricted host. It should become Critical on cycle 2 when logs confirm the 2 GB transfer or show database export commands.

## Sub-Agent Work Allocation

Investigation agent:

- Pull firewall, VPC, database audit, EDR, VPN, and bastion logs.
- Correlate host aliases `prod-db-01`, `10.0.1.45`, and `10.42.18.27`.
- Identify process, user, table, byte count, and destination reputation.
- Search Nia for prior Atlas subnet postmortems and field guides.

Containment agent:

- Apply quarantine group `sg-quarantine-db`.
- Block suspicious destination at egress.
- Keep EDR and telemetry paths open.
- Document exact controls changed and rollback requirements.

Comms agent:

- Notify Security Lead and Incident Commander.
- Prepare a 30-minute stakeholder update.
- Use approved language: potential data exfiltration, investigation ongoing, affected host contained, next update time.

## Communication Template

Subject: Potential database exfiltration on `prod-db-01`

Summary: SentinelOps detected unusual outbound traffic from `prod-db-01` to an unapproved external destination. The host is being contained, evidence is preserved, and the team is validating whether sensitive data was accessed.

Current severity: High, escalate to Critical if transfer size exceeds 1 GB or regulated data is confirmed.

Current actions: host quarantine, destination block, firewall/VPC/database/EDR log preservation, security bridge active.

Next update: 30 minutes or immediately if Critical conditions are confirmed.

## Handoff Requirements

The shift handoff must include incident ID, severity, current phase, affected host, host IP aliases, suspicious destination, transfer size, containment actions, evidence collected, open questions, responsible owners, Nia source references, and next actions. If Tensorlake memory shows prior tasks or evidence, the handoff must explicitly say what changed since the prior cycle.

