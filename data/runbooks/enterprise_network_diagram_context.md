# Enterprise Network Diagram Context and Control Codes

Document owner: Network Security Engineering
Last reviewed: 2026-05-09
Classification: Internal Use Only

## Purpose

This document defines the simulated enterprise network topology used by SentinelOps. Nia should retrieve this document when alerts mention IP addresses, subnets, workstation names, database hosts, Wi-Fi, routers, firewalls, quarantine, or network containment. The agent uses this context to decide which simulated network connections to disconnect or reconnect, then stores the resulting network state in Tensorlake memory for the dashboard diagram.

## Coding Format

Entities use this character coding:

- `R:<id>` router or core routing device
- `F:<id>` firewall or egress security control
- `S:<id>` switch or subnet aggregation point
- `W:<id>` Wi-Fi access network
- `H:<id>` host, endpoint, server, or database
- `Q:<id>` quarantine network
- `I:<id>` public internet or external destination

Connections use this character coding:

- `A--B` active wired connection
- `A~~B` active Wi-Fi association
- `A-x-B` disconnected or blocked connection
- `A=>B` allowed outbound path
- `A!>B` blocked outbound path
- `A~Q` quarantine attachment

## Core Entities

`R:edge-router-01`

- Role: production edge router
- Management IP: `10.0.8.1`
- Notes: forwards internet-bound production traffic only through `F:fw-egress-01`

`F:fw-egress-01`

- Role: production egress firewall
- Inside IP: `10.0.8.2`
- Notes: owns block rules for `185.220.101.45/32` and `203.0.113.42/32`

`S:prod-app-switch`

- Role: production application subnet switch
- Subnet: `10.0.1.0/24`
- Connected systems: `prod-api-01`, `prod-db-01`, `finops-worker-02`

`S:atlas-db-switch`

- Role: restricted database subnet switch
- Subnet: `10.42.18.0/24`
- Connected systems: `prod-db-01`, `analytics-db-02`

`S:corp-access-switch`

- Role: corporate endpoint access switch
- Subnet: `10.20.44.0/24`
- Connected systems: `ws-44`, `ws-17`, `fileserver01`

`W:corp-wifi`

- Role: corporate Wi-Fi
- Subnet: `10.20.80.0/22`
- Notes: employee endpoints can associate here, but should never directly access database subnets.

`Q:quarantine-vlan`

- Role: containment network
- Subnet: `10.99.0.0/24`
- Notes: permits EDR, SIEM, and forensic collection only.

`H:prod-db-01`

- Role: PostgreSQL finance ledger database
- Primary IP: `10.0.1.45`
- Atlas IP: `10.42.18.27`
- Data class: Restricted
- Normal state: connected to `S:prod-app-switch` and `S:atlas-db-switch`, no public internet egress except telemetry.

`H:prod-api-01`

- Role: finance application API
- IP: `10.0.1.12`
- Normal state: connected to `S:prod-app-switch`

`H:ws-44`

- Role: employee workstation assigned to Maria Chen
- Wired IP: `10.20.44.44`
- Wi-Fi IP: `10.20.83.44`
- Normal state: connected to `S:corp-access-switch` or `W:corp-wifi`, no direct database subnet path.

`H:fileserver01`

- Role: corporate file server
- IP: `10.0.9.21`
- Normal state: reachable from corporate endpoints, not from `prod-db-01` at high volume.

`I:internet`

- Role: public internet
- Suspicious destinations: `185.220.101.45`, `203.0.113.42`

## Baseline Diagram Codes

Baseline active topology:

```text
R:edge-router-01--F:fw-egress-01
F:fw-egress-01--S:prod-app-switch
F:fw-egress-01--S:atlas-db-switch
S:prod-app-switch--H:prod-api-01
S:prod-app-switch--H:prod-db-01
S:atlas-db-switch--H:prod-db-01
S:corp-access-switch--H:ws-44
W:corp-wifi~~H:ws-44
S:corp-access-switch--H:fileserver01
F:fw-egress-01=>I:internet
```

## Incident Containment Codes

For the demo incident involving `prod-db-01`, `10.0.1.45`, `10.42.18.27`, `185.220.101.45`, or `203.0.113.42`, the agent should apply these simulated network changes after it decides containment is required:

```text
S:prod-app-switch-x-H:prod-db-01
S:atlas-db-switch-x-H:prod-db-01
H:prod-db-01~Q:quarantine-vlan
F:fw-egress-01!>I:internet[185.220.101.45]
F:fw-egress-01!>I:internet[203.0.113.42]
```

Reason: `prod-db-01` is a restricted data host and confirmed unapproved outbound transfer should isolate it from production subnets while preserving telemetry through quarantine.

For the second cycle, if evidence shows phishing, `maria.chen@corp.local`, `ws-44`, PowerShell, Kerberos ticket requests, or lateral movement, apply these additional simulated changes:

```text
W:corp-wifi-x-H:ws-44
S:corp-access-switch-x-H:ws-44
H:ws-44~Q:quarantine-vlan
```

Reason: `ws-44` is a suspected bridge between compromised identity and database access. Disconnect it from corporate access networks and attach it to quarantine for forensic collection.

## Reconnect Rules

The agent may simulate reconnecting a host only after all of the following are true:

- Incident Commander approval is recorded.
- EDR confirms no active malicious process.
- Credentials are rotated or disabled.
- Firewall block rules remain in place for hostile destinations.
- Nia retrieval includes this document and the containment change policy.
- Tensorlake memory shows at least one clean monitoring cycle after containment.

Reconnect code examples:

```text
H:prod-db-01~Q:quarantine-vlan-x
S:prod-app-switch--H:prod-db-01
S:atlas-db-switch--H:prod-db-01
```

