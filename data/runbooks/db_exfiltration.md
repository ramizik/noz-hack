# Runbook: Database Exfiltration

## Detection Criteria
- Outbound traffic from a database host exceeding 500MB in a single session
- Connections to IPs not in the approved egress allowlist
- Off-hours transfers (outside 06:00–22:00 local time)
- Protocol anomalies: database port traffic routed over TCP/443 or TCP/80

## Immediate Containment (first 15 minutes)
1. Apply quarantine security group to the affected host — block all outbound except monitoring
2. Preserve current network connections: `ss -tnp > /tmp/connections_snapshot.txt`
3. Do NOT restart the host or stop the database process — preserve forensic state
4. Revoke or rotate database credentials for all service accounts on the affected instance

## Investigation Checklist
- [ ] Pull egress logs for the 60 minutes before and after the anomaly window
- [ ] Identify the destination IP — check threat intel feeds (VirusTotal, Shodan)
- [ ] Review database audit logs: which tables were queried, by which user, at what time
- [ ] Check for recent privilege escalation or new service account creation
- [ ] Determine data classification of accessed tables (PII, financial, credentials)
- [ ] Review VPN and bastion access logs for the same time window

## Escalation Path
- Severity HIGH → notify Security Lead within 30 minutes
- Severity CRITICAL (confirmed exfil > 1GB or PII involved) → page CISO, open incident bridge
- Legal/compliance hold if PII or regulated data is confirmed in scope

## Communication Template
> **[INCIDENT ALERT]** Potential database exfiltration detected on `{host}`.
> Severity: `{severity}`. Affected system isolated at `{time}`.
> Investigation in progress. Next update in 30 minutes.
> Incident Commander: `{name}` | Bridge: `{url}`
