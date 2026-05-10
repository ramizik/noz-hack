"use client";

import { useEffect, useRef, useState } from "react";

export interface LiveLog {
  id: string;
  ts: string;
  level: "INFO" | "WARN" | "ERROR" | "CRITICAL" | "AGENT";
  source: string;
  message: string;
}

type Tpl = Omit<LiveLog, "id" | "ts">;

// Per-run randomised values — picked once when stream initialises
interface RunSeed {
  egressMb: number;        // 620–1140
  fileRate: number;        // 450–820
  transferMin: number;     // 6–11
  totalGb: string;         // "1.7"–"2.8"
  eventCount: number;      // 14–23
  extIp: string;           // slight variation on the known C2 IP
  suspectUser: string;     // maria.chen or james.park
  travelFrom: string;      // US | UK
  travelTo: string;        // NL | DE | SG
  travelMin: number;       // 9–14
  attachName: string;
  incidentId: string;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function rInt(lo: number, hi: number) {
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

function buildSeed(): RunSeed {
  const suspectUser = pick(["maria.chen", "james.park"]);
  return {
    egressMb:    rInt(620, 1140),
    fileRate:    rInt(450, 820),
    transferMin: rInt(6, 11),
    totalGb:     (rInt(17, 28) / 10).toFixed(1),
    eventCount:  rInt(14, 23),
    extIp:       `185.220.${rInt(98, 103)}.${rInt(40, 60)}`,
    suspectUser,
    travelFrom:  pick(["US", "UK"]),
    travelTo:    pick(["NL", "DE", "SG"]),
    travelMin:   rInt(9, 14),
    attachName:  pick(["Benefits_Update.html", "Payroll_Q2.html", "HR_Policy_2026.html"]),
    incidentId:  `INC-2026-00${rInt(1, 4)}`,
  };
}

function buildTemplates(s: RunSeed) {
  const NORMAL: Tpl[] = [
    { level: "INFO", source: "DNS",      message: "Query: prod-api.corp.local → 10.0.1.12 (3ms)" },
    { level: "INFO", source: "HTTPS",    message: "GET api.internal:8080/health → 200 OK (11ms)" },
    { level: "INFO", source: "LDAP",     message: "Auth: svc-monitor@corp.local → ACCEPTED" },
    { level: "INFO", source: "SMB",      message: "\\\\fileserver01\\shared READ → prod-db-01 (OK)" },
    { level: "INFO", source: "DNS",      message: "Query: updates.microsoft.com → 13.107.4.50 (5ms)" },
    { level: "INFO", source: "HTTPS",    message: `GET log-collector.corp.local:9200/_cluster/health → 200 (${rInt(20, 50)}ms)` },
    { level: "INFO", source: "KERBEROS", message: "TGT issued: svc-backup@CORP.LOCAL TTL=8h" },
    { level: "INFO", source: "NTP",      message: `Sync: time.corp.local drift=+${rInt(1, 4)}ms` },
    { level: "INFO", source: "SSH",      message: "Session opened: ops@bastion-01 → app-server-03" },
    { level: "INFO", source: "DNS",      message: "Query: s3.amazonaws.com → 52.217.44.251 (12ms)" },
    { level: "INFO", source: "HTTPS",    message: "POST metrics.corp.local/ingest → 202 (8ms)" },
    { level: "INFO", source: "LDAP",     message: "Auth: john.smith@corp.local → ACCEPTED" },
    { level: "INFO", source: "SMB",      message: "\\\\fileserver01\\finance READ → ws-44 (OK)" },
    { level: "INFO", source: "M365",     message: `Inbox delivery: ${s.suspectUser}@corp.local ← vendor-invoice@contoso-payments.com (SPF pass)` },
    { level: "INFO", source: "M365",     message: "Attachment scanned: Q2_forecast.xlsx → clean verdict for alex.kim@corp.local" },
    { level: "INFO", source: "ENTRA",    message: "Interactive sign-in: priya.narayan@corp.local from managed device ws-31 → SUCCESS" },
    { level: "INFO", source: "DNS",      message: "Query: vault.corp.local → 10.0.1.99 (2ms)" },
    { level: "INFO", source: "KERBEROS", message: "Service ticket: MSSQLSvc/prod-db-01:1433 → ISSUED" },
    { level: "INFO", source: "HTTP",     message: `GET prod-db-01:8080/metrics → 200 (${rInt(4, 9)}ms)` },
    { level: "INFO", source: "LDAP",     message: "Auth: svc-dbbackup@corp.local → ACCEPTED" },
    { level: "INFO", source: "SSH",      message: `Session closed: ops@bastion-01 duration=${rInt(2, 7)}m${rInt(10, 59)}s` },
    { level: "INFO", source: "HTTPS",    message: "GET github.com/api/status → 200 (145ms)" },
  ];

  const SUSPICIOUS: Tpl[] = [
    { level: "WARN",  source: "FW",       message: `Outbound 10.0.1.45:5432 → ${s.extIp}:443 — unusual destination` },
    { level: "WARN",  source: "IDS",      message: `Egress spike: prod-db-01 transferred ${s.egressMb} MB in last 3 min` },
    { level: "WARN",  source: "SMB",      message: `Mass file access: prod-db-01 reading \\\\fileserver01\\finance (${s.fileRate} files/min)` },
    { level: "WARN",  source: "M365",     message: `Suspicious inbox rule created: ${s.suspectUser}@corp.local → forward invoices to audit-mailbox@proton.example` },
    { level: "WARN",  source: "M365",     message: `Attachment detonation: ${s.attachName} opened credential-harvest page from HR-themed email` },
    { level: "WARN",  source: "ENTRA",    message: `Impossible travel: ${s.suspectUser}@corp.local signed in from ${s.travelFrom} then ${s.travelTo} within ${s.travelMin} minutes` },
    { level: "ERROR", source: "EDR",      message: "ws-44 spawned powershell.exe with encoded command after Outlook attachment open" },
    { level: "WARN",  source: "VPN",      message: `New VPN session: ${s.suspectUser}@corp.local from unmanaged device → finance subnet route requested` },
    { level: "ERROR", source: "FW",       message: `BLOCKED prod-db-01 → ${s.extIp}:1194 (OpenVPN port, not whitelisted)` },
    { level: "WARN",  source: "EDR",      message: "Unusual process: pg_dump on prod-db-01 — no scheduled job found" },
    { level: "ERROR", source: "IDS",      message: `Exfiltration pattern: sustained outbound 10.0.1.45 → ${s.extIp}` },
    { level: "WARN",  source: "SIEM",     message: `Rule triggered: large_outbound_db_host (threshold 500 MB/${rInt(4, 7)} min exceeded)` },
    { level: "WARN",  source: "KERBEROS", message: `${s.suspectUser}@CORP.LOCAL requested service ticket for MSSQLSvc/prod-db-01 from ws-44` },
    { level: "ERROR", source: "SMB",      message: "Lateral movement candidate: ws-44 enumerated \\\\fileserver01\\finance then touched prod-db-01 admin share" },
  ];

  const CRITICAL: Tpl[] = [
    { level: "CRITICAL", source: "SIEM",  message: `ALERT ${s.incidentId} — Exfiltration confirmed: ${s.totalGb} GB transferred over ${s.transferMin} min` },
    { level: "CRITICAL", source: "EDR",   message: "Credential theft chain: Outlook attachment → ws-44 PowerShell → prod-db-01 service ticket" },
    { level: "CRITICAL", source: "SIEM",  message: `${s.eventCount} correlated events across prod-db-01, ws-44, M365 mailbox, fileserver01` },
    { level: "ERROR",    source: "FW",    message: `Outbound block candidate identified for ${s.extIp}:443` },
    { level: "CRITICAL", source: "SIEM",  message: "Containment threshold exceeded for database subnet egress" },
    { level: "CRITICAL", source: "ENTRA", message: `${s.suspectUser}@corp.local marked HIGH risk — token replay suspected` },
  ];

  const RESPONSE_NOISE: Tpl[] = [
    { level: "AGENT", source: "SENTINEL", message: "Containment-agent queued host isolation for ws-44 and prod-db-01 egress clamp" },
    { level: "AGENT", source: "SENTINEL", message: "Investigation-agent fetching M365 message trace and Entra sign-in context via Nia-guided playbook" },
    { level: "WARN",  source: "M365",     message: `Follow-on phish delivered to daniel.ross@corp.local with same attachment hash — quarantine pending` },
    { level: "WARN",  source: "EDR",      message: "ws-44 attempted LSASS handle access after containment command issued" },
    { level: "ERROR", source: "FW",       message: `Blocked retry: prod-db-01 → ${s.extIp}:443 after policy update` },
    { level: "WARN",  source: "ENTRA",    message: `Refresh token revoked for ${s.suspectUser}@corp.local; one stale session still expiring` },
    { level: "AGENT", source: "SENTINEL", message: "Comms-agent prepared Slack update: account risk, workstation isolation, DB egress block" },
    { level: "AGENT", source: "SENTINEL", message: `Network-agent applied egress block rule: prod-db-01 → ${s.extIp} on fw-egress-01` },
    { level: "AGENT", source: "SENTINEL", message: "Network-agent moved ws-44 to quarantine VLAN 99 — corp-access-switch port disabled" },
    { level: "INFO",  source: "FW",       message: `ACL updated: deny outbound 10.0.1.45 → ${s.extIp}/32 (agent-applied rule #sentinel-auto-${rInt(100, 999)})` },
  ];

  return { NORMAL, SUSPICIOUS, CRITICAL, RESPONSE_NOISE };
}

function makeLog(tpl: Tpl): LiveLog {
  return {
    ...tpl,
    id: `live-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ts: new Date().toISOString(),
  };
}

export type StreamPhase = "idle" | "monitoring" | "incident";

export function useLiveLogStream(streamPhase: StreamPhase, paused = false) {
  const [logs, setLogs] = useState<LiveLog[]>([]);
  const [containmentFired, setContainmentFired] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const normalIdx = useRef(0);
  const suspIdx = useRef(0);
  const critIdx = useRef(0);
  const responseIdx = useRef(0);
  const elapsed = useRef(0);
  const seedRef = useRef<ReturnType<typeof buildSeed> | null>(null);
  const tplRef = useRef<ReturnType<typeof buildTemplates> | null>(null);

  useEffect(() => {
    elapsed.current = 0;
    normalIdx.current = 0;
    suspIdx.current = 0;
    critIdx.current = 0;
    responseIdx.current = 0;
    if (streamPhase === "incident") {
      // Fresh seed each incident run → randomised values
      const seed = buildSeed();
      seedRef.current = seed;
      tplRef.current = buildTemplates(seed);
      setContainmentFired(false);
    }
  }, [streamPhase]);

  useEffect(() => {
    if (streamPhase === "idle" || paused) return;
    const { NORMAL, SUSPICIOUS, CRITICAL, RESPONSE_NOISE } = tplRef.current ?? buildTemplates(buildSeed());

    function emit() {
      let tpl: Tpl;
      let delay: number;

      if (streamPhase === "monitoring") {
        tpl = NORMAL[normalIdx.current++ % NORMAL.length];
        delay = 600 + Math.random() * 600;
      } else {
        const t = elapsed.current;
        if (t < 6000) {
          const pickSusp = Math.random() < 0.6 && suspIdx.current < SUSPICIOUS.length;
          tpl = pickSusp ? SUSPICIOUS[suspIdx.current++] : NORMAL[normalIdx.current++ % NORMAL.length];
          delay = 400 + Math.random() * 500;
        } else if (critIdx.current < CRITICAL.length) {
          tpl = CRITICAL[critIdx.current++];
          delay = 600 + Math.random() * 500;
        } else {
          const roll = Math.random();
          if (roll < 0.55) {
            tpl = RESPONSE_NOISE[responseIdx.current++ % RESPONSE_NOISE.length];
          } else if (roll < 0.8) {
            tpl = SUSPICIOUS[suspIdx.current++ % SUSPICIOUS.length];
          } else {
            tpl = NORMAL[normalIdx.current++ % NORMAL.length];
          }
          delay = 900 + Math.random() * 1300;
        }
      }

      const log = makeLog(tpl);
      setLogs((prev) => [...prev, log]);
      if (log.level === "AGENT" && log.message.includes("isolation")) {
        setContainmentFired(true);
      }
      elapsed.current += delay;
      timer.current = setTimeout(emit, delay);
    }

    emit();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [streamPhase, paused]);

  const clear = () => { setLogs([]); setContainmentFired(false); };
  return { logs, containmentFired, clear };
}
