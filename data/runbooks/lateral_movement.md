# Runbook: Lateral Movement

## Detection Criteria
- Authentication events from a single account across 3+ hosts within 10 minutes
- Use of remote execution tools (psexec, wmiexec, winrm) outside approved windows
- New admin shares or scheduled tasks created on multiple hosts simultaneously
- Pass-the-hash or pass-the-ticket indicators in authentication logs

## Immediate Containment (first 15 minutes)
1. Disable the compromised account in Active Directory / IAM immediately
2. Invalidate all active sessions and tokens for that account
3. Segment the affected subnet at the firewall — block east-west on ports 445, 135, 5985
4. Do NOT reimage hosts yet — preserve memory and disk for forensics

## Investigation Checklist
- [ ] Map all hosts the account authenticated to in the past 24 hours
- [ ] Check for new local admin accounts or privilege changes on affected hosts
- [ ] Review scheduled tasks and startup items on each compromised host
- [ ] Pull process creation logs (Event ID 4688) for the anomaly window
- [ ] Identify the initial access vector — phishing, credential stuffing, or insider
- [ ] Check for data staging or compression activity (zip, tar, rar on unusual paths)

## Escalation Path
- Confirmed lateral movement across 3+ hosts → page Security Lead immediately
- Evidence of domain admin compromise → page CISO, begin tabletop
- Active ransomware staging detected → invoke ransomware runbook in parallel

## Communication Template
> **[INCIDENT ALERT]** Lateral movement detected from account `{account}`.
> `{host_count}` hosts affected. Account disabled at `{time}`.
> Containment active. Forensic investigation in progress.
> Incident Commander: `{name}`
