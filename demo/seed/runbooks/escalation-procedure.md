# Runbook: Production exfiltration — escalation procedure

**ID:** rb_escalation_exfiltration
**Trigger:** Confirmed data exfiltration from a production host.

## Notify

1. Page the on-call security lead (priority 1).
2. Open an incident bridge in the on-call channel.
3. Notify the data-protection officer if any subnet tagged `pii=true` is involved.

## Contain

1. Confirm the affected instance is in the `quarantine` security group.
2. Rotate any IAM credentials attached to the instance role.
3. Snapshot the affected EBS volumes for forensics before any teardown.

## Communicate

1. Generate a shift-handoff summary including timeline, evidence, and outstanding tasks.
2. Post the summary to the incident channel.
3. Hand off ownership to the next on-call shift if the incident crosses a shift boundary.
