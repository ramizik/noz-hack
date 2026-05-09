# Postmortem: 2024-Q4 prod-db egress incident

**Date:** 2024-11-12
**Subnet:** subnet-prod-db-1a
**Severity at peak:** CRITICAL
**Outcome:** 4.2 GB exfiltrated before containment.

## Summary

Attacker reused a leaked deploy key to pull a database snapshot from a production read-replica in the same subnet (`subnet-prod-db-1a`) the agent is currently watching. The egress was first flagged by GuardDuty as `Backdoor:EC2/C&CActivity.B!DNS` at 02:54 and confirmed as exfiltration at 03:11.

## What worked

- VPC flow logs were the decisive evidence — bytes-out is the clearest signal.
- Quarantining the host via security-group swap stopped the bleed within 6 minutes once initiated.

## What didn't

- Initial responder spent 40 minutes triaging because no prior context was available.
- Severity stayed at HIGH for 25 minutes despite 2 GB already transferred — the upgrade trigger wasn't automated.

## Action items still relevant

- Auto-upgrade severity to CRITICAL once bytes-out > 1 GB within 30 minutes.
- Pre-stage a quarantine security group per VPC.
- Generate handoff summaries automatically so the next shift starts informed.
