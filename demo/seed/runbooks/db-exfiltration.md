# Runbook: Suspected database exfiltration

**ID:** rb_data_exfiltration
**Applies to:** Production database hosts (`Env=production`, `Subnet=subnet-prod-db-*`)
**Default severity:** HIGH

## Triggers

- GuardDuty `Backdoor:EC2/C&CActivity.B!DNS` against a prod-db host.
- GuardDuty `Exfiltration:S3/AnomalousBehavior` originating from a prod-db host.
- VPC flow log anomaly: outbound bytes > 500 MB from a prod-db host outside business hours.

## Immediate actions

1. **Isolate host** — apply the `quarantine` security group to the affected instance.
2. **Pull egress logs** — last 60 minutes of VPC flow logs filtered to the source IP.
3. **Notify security lead** — page the on-call via the on-call rotation channel.

## Severity escalation

If confirmed bytes-out exceeds **1 GB** within a 30-minute window, upgrade to CRITICAL and follow `escalation-procedure.md`.

## Evidence to capture

- Source instance ID, subnet, and tags.
- Remote IP and port.
- Bytes-in / bytes-out and the time window observed.
- Process / SSM session list at time of finding (best-effort).
