# Runbook: Ransomware

## Detection Criteria
- Mass file rename events with unknown extensions (.locked, .enc, .crypted, or random)
- Ransom note files (README.txt, HOW_TO_DECRYPT.txt) created in multiple directories
- Volume Shadow Copy deletion commands detected (vssadmin, wmic shadowcopy)
- High disk I/O across multiple hosts simultaneously with no scheduled job explanation

## Immediate Containment (first 10 minutes)
1. **Network isolation first** — disconnect affected hosts from the network immediately
2. Do NOT shut down hosts if encryption is still in progress — may trigger wiper logic
3. Disable file shares and mapped drives on unaffected hosts as a precaution
4. Snapshot all unaffected cloud volumes before the blast radius expands
5. Alert backup team to take backups offline and verify integrity immediately

## Investigation Checklist
- [ ] Identify patient zero: which host first showed encryption activity
- [ ] Determine ransomware family via ransom note text and file extension signatures
- [ ] Check for data exfiltration before encryption (double-extortion pattern)
- [ ] Review email gateway for phishing delivery in the 48h window prior
- [ ] Identify the C2 domain or IP from network logs before isolation
- [ ] Verify backup integrity — confirm backups predate the encryption event

## Escalation Path
- Any confirmed ransomware → immediate CISO page, open war room
- Double-extortion confirmed → engage Legal immediately for breach assessment
- Critical infrastructure affected → consider regulatory notification requirements (72-hour window)

## Communication Template
> **[CRITICAL INCIDENT]** Ransomware activity confirmed on `{host_count}` hosts.
> Hosts isolated at `{time}`. Backup team notified.
> War room active: `{bridge_url}`. Do NOT reconnect isolated hosts.
> Incident Commander: `{name}` | Legal notified: `{yes/no}`
