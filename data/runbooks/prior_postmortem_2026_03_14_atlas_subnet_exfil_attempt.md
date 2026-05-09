# Postmortem: March 2026 Atlas Subnet Exfiltration Attempt

Document owner: Security Post-Incident Review Board
Incident date: 2026-03-14
Published: 2026-03-21
Classification: Internal Use Only

## Executive Summary

On 2026-03-14, Security Operations investigated suspicious outbound traffic from the Atlas production database subnet `10.42.18.0/24`. The affected host was `analytics-db-02`, not `prod-db-01`, but the network path, service account behavior, and detection gap are directly relevant to future database egress alerts. The incident was contained before confirmed customer data exposure, but the investigation found that database hosts were still able to initiate outbound TCP/443 sessions to unapproved destinations through a legacy firewall exception.

This postmortem is important for the `prod-db-01` demo scenario because it explains why an unapproved database egress event from the Atlas subnet should be treated seriously, even when the first alert has incomplete details.

## Timeline

03:08 UTC: SIEM detected `analytics-db-02` initiating a TCP/443 session to `203.0.113.42`.

03:11 UTC: Firewall logs showed 612 MB transferred over eight minutes. The destination was not in the approved egress list.

03:16 UTC: The first responder searched runbooks but only found a generic network anomaly guide. The database exfiltration playbook was not linked to Atlas subnet alerts.

03:21 UTC: Security Lead declared High severity and assigned containment.

03:25 UTC: Containment engineer blocked `203.0.113.42/32` at `fw-egress-01`.

03:33 UTC: EDR showed `pg_dump` executed by `svc_reporting_temp` under `/tmp/report-cache`.

03:41 UTC: Database audit logs showed access to internal analytics tables but no customer PII tables.

04:05 UTC: Host was moved to quarantine. Investigation found a stale firewall exception allowing direct TCP/443 from the Atlas database subnet.

06:20 UTC: Incident downgraded after no regulated data exposure was confirmed.

## Root Cause

The direct cause was misuse of a temporary service account, `svc_reporting_temp`, which retained broader database permissions after a reporting migration. The enabling cause was a legacy egress firewall exception for `10.42.18.0/24` that allowed TCP/443 to any destination during a vendor migration window. The exception should have expired on 2026-02-28 but had no automated expiration.

The detection gap was document linkage. Responders searched for "outbound traffic" and "Atlas subnet" but did not immediately retrieve the database exfiltration playbook. That delayed containment by about 15 minutes.

## What Went Well

- Firewall logs had byte counts and destination IPs.
- EDR retained process execution details.
- Database audit logging was enabled for the relevant schemas.
- The containment team could block a destination at `fw-egress-01` without waiting for a full change review.
- The incident commander established a clear update cadence.

## What Went Poorly

- Runbooks were not indexed with enough aliases for `10.42.18.0/24`, Atlas subnet, database egress, and exfiltration.
- The first responder did not know that `203.0.113.42` was already used in synthetic testing and suspicious training data.
- The service account owner was unclear.
- The firewall exception had no owner and no expiration alert.
- The handoff omitted which tables were confirmed out of scope, causing duplicate investigation work.

## Lessons Learned

1. Any outbound public internet traffic from the Atlas database subnet should retrieve the database exfiltration playbook automatically.
2. `10.42.18.0/24` must be treated as a restricted database subnet, not a generic production subnet.
3. Byte count matters. Over 500 MB off-hours is High; over 1 GB from a restricted database host is Critical until proven otherwise.
4. Every containment action must preserve EDR and telemetry paths.
5. Handoffs must include table-level evidence, not just "database checked".
6. Nia indexing should include topology, asset profile, incident command contacts, and prior postmortems so agents can navigate from alert metadata to appropriate guidance.
7. Tensorlake memory should store previous cycle findings so a second response cycle does not repeat first-cycle collection.

## Action Items Completed

- Added Atlas subnet aliases to database exfiltration detection content.
- Added `sg-quarantine-db` runbook entry.
- Added firewall expiration owner field to egress exceptions.
- Added Security Lead approval path for emergency database egress block.
- Added handoff checklist requiring byte count, table list, process name, containment status, and next update time.

## Relevance to prod-db-01

`prod-db-01` is dual-homed between `10.0.1.45` and `10.42.18.27`. If a SIEM event references either IP, responders must treat it as the same host. The March incident showed that public TCP/443 from the Atlas subnet can represent exfiltration even when it looks like normal HTTPS. If `prod-db-01` transfers 2 GB to `185.220.101.45` or `203.0.113.42`, the response should skip generic triage and go directly to database exfiltration containment and executive escalation.

## Recommended Agent Behavior

An always-on response agent should:

- Search Nia for "Atlas subnet database exfiltration postmortem" when alert metadata includes `10.42.18.0/24`, `prod-db-01`, or large outbound HTTPS.
- Use the postmortem to justify faster containment.
- Avoid repeating the March delay by retrieving the database playbook in the first cycle.
- Store the byte count, process name, table evidence, and containment status in durable memory for the next cycle.

