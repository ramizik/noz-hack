# Asset Profile and Data Classification: prod-db-01

Document owner: Database Reliability Engineering
Last reviewed: 2026-04-26
Classification: Confidential Internal

## Asset Summary

`prod-db-01` is the primary PostgreSQL database host for the finance ledger and customer account platform. It is one of the most sensitive production systems in the environment because it stores customer profile records, billing references, ledger transactions, operational audit history, and payment-token metadata. It is not internet-facing and should not initiate public internet egress.

Asset identifiers:

- Hostname: `prod-db-01`
- Primary IP: `10.0.1.45`
- Atlas data-tier IP: `10.42.18.27`
- Environment: production
- Business owner: Finance Platform Engineering
- Technical owner: Database Reliability Engineering
- On-call pager: `dbre-prod`
- Data classification: Restricted
- Recovery tier: Tier 0
- Backup model: hourly snapshots, write-ahead-log archive, no host-initiated internet copy

## Business Context

The finance platform uses `prod-db-01` for customer billing, account statements, refunds, revenue reports, and internal financial reconciliation. Availability matters, but data confidentiality matters more during a suspected exfiltration incident. Security Operations is authorized to quarantine the host if there is a credible exfiltration signal. Application owners must be notified before extended containment, but notification is not required before blocking a hostile destination.

Critical dependent services:

- `prod-api-01` at `10.0.1.12`
- `finops-worker-02` at `10.0.1.31`
- `ledger-reporting-01` at `10.0.1.52`
- `vault.corp.local` at `10.0.1.99`
- `siem-collector-01` at `10.0.8.15`

## Sensitive Schemas and Tables

Restricted tables:

- `finance.customer_ledger`: account balances, transaction history, refund metadata.
- `billing.payment_tokens`: tokenized payment references, processor IDs, last-four metadata.
- `accounts.customer_profile`: customer names, emails, billing addresses, account status.
- `audit.login_history`: timestamps, IP addresses, authentication methods.
- `risk.chargeback_reviews`: dispute notes and fraud analyst comments.

Internal tables:

- `finance.daily_summary`
- `finance.reconciliation_jobs`
- `audit.job_runs`
- `app.feature_flags`

Public or low-sensitivity tables are not stored on this host. Any confirmed data export from `prod-db-01` should be treated as at least High severity until table-level evidence proves otherwise.

## Normal Administrative Patterns

Expected database administration occurs during approved maintenance windows. Routine maintenance is scheduled Tuesdays 06:00-08:00 UTC and Sundays 07:00-09:00 UTC. The standard path is VPN to `bastion-01`, then SSH to `prod-db-01`, with command logging enabled. Emergency access requires a ticket and approval from the Database Reliability Engineering manager.

Expected users:

- `svc_finance_api`
- `svc_finops_worker`
- `svc_ledger_reporting`
- `dbre_elena`
- `dbre_rotation`

Unexpected users during a security incident:

- Generic Linux users such as `ubuntu`, `ec2-user`, `postgres_backup_temp`.
- Service accounts authenticating from VPN client addresses.
- Any account running `pg_dump` outside the backup automation path.
- Any shell process that creates compressed archives under `/tmp`, `/var/tmp`, or `/home/postgres`.

## Normal Network Behavior

`prod-db-01` receives inbound PostgreSQL connections from application systems. It sends telemetry to internal collectors. It does not upload backups to the internet. It does not call public APIs. It does not use OpenVPN. It does not connect to Tor nodes. It does not transfer large volumes over TCP/443.

Normal outbound:

- `10.0.1.45 -> 10.0.8.15:4317`
- `10.0.1.45 -> 10.0.8.16:6514`
- `10.0.1.45 -> 10.0.1.99:8200`
- `10.0.1.45 -> 10.0.9.10:123`

Abnormal outbound:

- `10.0.1.45 -> 185.220.101.45:443`
- `10.42.18.27 -> 185.220.101.45:443`
- `10.0.1.45 -> 203.0.113.42:443`
- `10.0.1.45 -> any public IP:1194`
- `10.0.1.45 -> fileserver01:445` at high volume

## Approved Containment Impact

The quarantine group `sg-quarantine-db` blocks application access and most outbound traffic. Applying it will cause finance API errors and may interrupt billing workflows. This is acceptable for suspected exfiltration if one of the following is true:

- Unapproved public egress from `prod-db-01`.
- Confirmed bulk export process.
- Suspicious process communicating with external IP.
- Evidence of access to restricted tables before outbound transfer.
- Security Lead or Incident Commander approval.

Rollback requires approval from the Incident Commander and Database Reliability Engineering. Do not remove quarantine simply because the application is degraded.

## Evidence Sources

Useful evidence locations:

- PostgreSQL audit logs: `/var/log/postgresql/audit/postgresql-audit.log`
- EDR process timeline: EDR console asset `prod-db-01`
- Firewall sessions: `fw-egress-01` filter source `10.0.1.45` or `10.42.18.27`
- VPC flow logs: stream `prod-vpc-flow-atlas`
- Bastion transcript: `bastion-01` session recording
- Vault logs: filter entity `prod-db-01`
- Backup controller: `backup-orchestrator-01`

## Incident Notes for Agents

When an alert says "unusual outbound traffic from prod-db-01", retrieve this asset profile, the database exfiltration playbook, the enterprise network topology, and the incident command directory. Mention both host IP aliases in evidence and handoff. If the new evidence says 2 GB transferred, classify as Critical unless there is a documented approved transfer, which this asset does not have.

