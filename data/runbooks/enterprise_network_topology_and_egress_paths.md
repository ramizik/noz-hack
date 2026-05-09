# Enterprise Network Topology and Egress Paths

Document owner: Platform Security Architecture
Last reviewed: 2026-04-28
Classification: Internal Use Only
Environment: SentinelOps demo enterprise, fictional data

## Purpose

This document describes the corporate network paths that matter during a security incident. It is written for incident commanders, containment engineers, and investigation agents that need to understand whether traffic is expected, suspicious, or explicitly forbidden. When an alert references unusual outbound traffic, database hosts, finance data, or the Atlas production subnet, this document should be consulted before taking containment action.

## High-Level Zones

The enterprise network is split into production, shared services, security tooling, corporate, and external egress zones. Production systems should never initiate arbitrary internet connections. They may send telemetry to approved collectors, call internal services, and reach approved vendor endpoints through the egress proxy. Database systems are treated as restricted data-tier assets and have the narrowest outbound policy.

Primary CIDR ranges:

- Production application subnet: `10.0.1.0/24`
- Production database subnet, Atlas: `10.42.18.0/24`
- Security tooling subnet: `10.0.8.0/24`
- Shared services subnet: `10.0.9.0/24`
- Corporate VPN client pool: `10.20.0.0/16`
- Bastion subnet: `10.0.12.0/24`
- Quarantine subnet: `10.99.0.0/24`
- Partner integration DMZ: `172.16.40.0/24`

Key hosts:

- `prod-db-01` has primary IP `10.0.1.45` and secondary data-tier IP `10.42.18.27`.
- `prod-api-01` has IP `10.0.1.12`.
- `fileserver01` has IP `10.0.9.21`.
- `bastion-01` has IP `10.0.12.10`.
- `vault.corp.local` has IP `10.0.1.99`.
- `siem-collector-01` has IP `10.0.8.15`.
- `fw-egress-01` has internal IP `10.0.8.2`.

## Approved Production Egress

All production egress must leave through `fw-egress-01` and must have an approved destination, port, owner, ticket, and expiration date. Direct internet egress from a production host is prohibited unless the host belongs to the partner DMZ. The following traffic is approved for database hosts:

- Metrics to `10.0.8.15:4317` using OTLP.
- Logs to `10.0.8.16:6514` using TLS syslog.
- Package mirror access to `198.51.100.20:443` during the approved patch window only.
- Backup metadata to `10.0.9.30:443`.
- Time sync to `10.0.9.10:123`.
- Vault token renewal to `10.0.1.99:8200`.

Explicitly suspicious destinations in training and demo data:

- `185.220.101.45` appears in prior Tor exit node intelligence and is not approved for any production system.
- `203.0.113.42` is an external documentation/test address used in synthetic exfiltration scenarios and is not approved for database egress.
- `45.133.1.77` was observed in a previous credential-stuffing campaign and should be treated as hostile until proven otherwise.

## Normal Paths for `prod-db-01`

`prod-db-01` is a PostgreSQL-backed finance and customer ledger database. It accepts inbound application traffic from `prod-api-01` and batch traffic from `finops-worker-02`. It should not initiate outbound TCP sessions to the public internet. The normal daily traffic pattern includes small log and metrics flows, usually below 40 MB per hour. Backups are snapshot-based and do not produce large outbound TCP sessions from the database host.

Expected flows:

- `prod-api-01:random -> prod-db-01:5432`
- `prod-db-01:4317 -> siem-collector-01:4317`
- `prod-db-01:6514 -> log-collector-01:6514`
- `prod-db-01:8200 -> vault.corp.local:8200`
- `bastion-01:22 -> prod-db-01:22` during approved maintenance only

Unexpected flows:

- `prod-db-01 -> 185.220.101.45:443`
- `prod-db-01 -> 203.0.113.42:443`
- `prod-db-01 -> any public IP on TCP/1194`
- `prod-db-01 -> fileserver01` for mass SMB reads
- `prod-db-01 -> corporate VPN client pool`

## Egress Severity Matrix

The severity of outbound traffic from production systems is based on host criticality, data classification, destination reputation, transfer size, timing, and whether there is a change ticket.

- Medium: unexpected outbound connection from an application host under 100 MB with no sensitive data source.
- High: unexpected outbound connection from a database host, any off-hours transfer over 500 MB, or destination outside the allowlist.
- Critical: confirmed transfer over 1 GB from a restricted data host, transfer involving PII or financial ledger tables, connection to known malicious infrastructure, or evidence of credential misuse.

For the demo alert `prod-db-01 -> 185.220.101.45:443` at 03:14 UTC with roughly 2 GB transferred, classify as at least High immediately and escalate to Critical when log evidence confirms the byte count or table access.

## Containment Network Actions

When containment is approved, move the affected host to the quarantine security group `sg-quarantine-db`. The quarantine profile allows only security telemetry, EDR command channel, and forensic collection. It blocks outbound internet, east-west SMB, and application traffic. Do not power off the host. Do not restart database processes. Preserve active connections and memory state before making destructive changes.

Approved containment steps for `prod-db-01`:

1. Add `prod-db-01` to `sg-quarantine-db`.
2. Block destination `185.220.101.45/32` and `203.0.113.42/32` at `fw-egress-01`.
3. Preserve firewall session table for the previous 90 minutes.
4. Preserve VPC flow logs for `10.0.1.45` and `10.42.18.27`.
5. Keep `10.0.8.15`, `10.0.8.16`, and EDR channels reachable.

## Investigator Notes

If the host field alternates between `10.0.1.45` and `10.42.18.27`, treat both as `prod-db-01`. The dual-homed configuration exists for historical reasons and is a known source of SIEM confusion. The Atlas subnet `10.42.18.0/24` should trigger database exfiltration playbooks and prior postmortems, especially the March 2026 Atlas exfiltration attempt.

