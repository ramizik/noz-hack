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

const NORMAL: Tpl[] = [
  { level: "INFO", source: "DNS", message: "Query: prod-api.corp.local → 10.0.1.12 (3ms)" },
  { level: "INFO", source: "HTTPS", message: "GET api.internal:8080/health → 200 OK (11ms)" },
  { level: "INFO", source: "LDAP", message: "Auth: svc-monitor@corp.local → ACCEPTED" },
  { level: "INFO", source: "SMB", message: "\\\\fileserver01\\shared READ → prod-db-01 (OK)" },
  { level: "INFO", source: "DNS", message: "Query: updates.microsoft.com → 13.107.4.50 (5ms)" },
  { level: "INFO", source: "HTTPS", message: "GET log-collector.corp.local:9200/_cluster/health → 200 (34ms)" },
  { level: "INFO", source: "KERBEROS", message: "TGT issued: svc-backup@CORP.LOCAL TTL=8h" },
  { level: "INFO", source: "NTP", message: "Sync: time.corp.local drift=+2ms" },
  { level: "INFO", source: "SSH", message: "Session opened: ops@bastion-01 → app-server-03" },
  { level: "INFO", source: "DNS", message: "Query: s3.amazonaws.com → 52.217.44.251 (12ms)" },
  { level: "INFO", source: "HTTPS", message: "POST metrics.corp.local/ingest → 202 (8ms)" },
  { level: "INFO", source: "LDAP", message: "Auth: john.smith@corp.local → ACCEPTED" },
  { level: "INFO", source: "SMB", message: "\\\\fileserver01\\finance READ → ws-44 (OK)" },
  { level: "INFO", source: "M365", message: "Inbox delivery: maria.chen@corp.local ← vendor-invoice@contoso-payments.com (SPF pass)" },
  { level: "INFO", source: "M365", message: "Attachment scanned: Q2_forecast.xlsx → clean verdict for alex.kim@corp.local" },
  { level: "INFO", source: "ENTRA", message: "Interactive sign-in: priya.narayan@corp.local from managed device ws-31 → SUCCESS" },
  { level: "INFO", source: "DNS", message: "Query: vault.corp.local → 10.0.1.99 (2ms)" },
  { level: "INFO", source: "KERBEROS", message: "Service ticket: MSSQLSvc/prod-db-01:1433 → ISSUED" },
  { level: "INFO", source: "DNS", message: "Query: pool.ntp.org → 162.159.200.123 (18ms)" },
  { level: "INFO", source: "HTTP", message: "GET prod-db-01:8080/metrics → 200 (6ms)" },
  { level: "INFO", source: "LDAP", message: "Auth: svc-dbbackup@corp.local → ACCEPTED" },
  { level: "INFO", source: "SSH", message: "Session closed: ops@bastion-01 duration=4m12s" },
  { level: "INFO", source: "HTTPS", message: "GET github.com/api/status → 200 (145ms)" },
];

const SUSPICIOUS: Tpl[] = [
  { level: "WARN", source: "FW", message: "Outbound 10.0.1.45:5432 → 185.220.101.45:443 — unusual destination" },
  { level: "WARN", source: "IDS", message: "Egress spike: prod-db-01 transferred 847 MB in last 3 min" },
  { level: "WARN", source: "SMB", message: "Mass file access: prod-db-01 reading \\\\fileserver01\\finance (622 files/min)" },
  { level: "WARN", source: "M365", message: "Suspicious inbox rule created: maria.chen@corp.local → forward invoices to audit-mailbox@proton.example" },
  { level: "WARN", source: "M365", message: "Attachment detonation: Benefits_Update.html opened credential-harvest page from HR-themed email" },
  { level: "WARN", source: "ENTRA", message: "Impossible travel: maria.chen@corp.local signed in from US then NL within 11 minutes" },
  { level: "ERROR", source: "EDR", message: "ws-44 spawned powershell.exe with encoded command after Outlook attachment open" },
  { level: "WARN", source: "VPN", message: "New VPN session: maria.chen@corp.local from unmanaged device → finance subnet route requested" },
  { level: "ERROR", source: "FW", message: "BLOCKED prod-db-01 → 185.220.101.45:1194 (OpenVPN port, not whitelisted)" },
  { level: "WARN", source: "EDR", message: "Unusual process: pg_dump on prod-db-01 — no scheduled job found" },
  { level: "ERROR", source: "IDS", message: "Exfiltration pattern: sustained outbound 10.0.1.45 → 185.220.101.45" },
  { level: "WARN", source: "SIEM", message: "Rule triggered: large_outbound_db_host (threshold 500 MB/5 min exceeded)" },
  { level: "WARN", source: "KERBEROS", message: "maria.chen@CORP.LOCAL requested service ticket for MSSQLSvc/prod-db-01 from ws-44" },
  { level: "ERROR", source: "SMB", message: "Lateral movement candidate: ws-44 enumerated \\\\fileserver01\\finance then touched prod-db-01 admin share" },
];

const CRITICAL: Tpl[] = [
  { level: "CRITICAL", source: "SIEM", message: "ALERT INC-2026-001 — Exfiltration confirmed: 2.1 GB transferred over 8 min" },
  { level: "CRITICAL", source: "EDR", message: "Credential theft chain: Outlook attachment → ws-44 PowerShell → prod-db-01 service ticket" },
  { level: "CRITICAL", source: "SIEM", message: "18 correlated events across prod-db-01, ws-44, M365 mailbox, fileserver01" },
  { level: "ERROR", source: "FW", message: "Outbound block candidate identified for 185.220.101.45:443" },
  { level: "CRITICAL", source: "SIEM", message: "Containment threshold exceeded for database subnet egress" },
  { level: "CRITICAL", source: "ENTRA", message: "maria.chen@corp.local marked HIGH risk — token replay suspected" },
];

const RESPONSE_NOISE: Tpl[] = [
  { level: "AGENT", source: "SENTINEL", message: "Containment-agent queued host isolation for ws-44 and prod-db-01 egress clamp" },
  { level: "AGENT", source: "SENTINEL", message: "Investigation-agent fetching M365 message trace and Entra sign-in context via Nia-guided playbook" },
  { level: "WARN", source: "M365", message: "Follow-on phish delivered to daniel.ross@corp.local with same attachment hash — quarantine pending" },
  { level: "WARN", source: "EDR", message: "ws-44 attempted LSASS handle access after containment command issued" },
  { level: "ERROR", source: "FW", message: "Blocked retry: prod-db-01 → 185.220.101.45:443 after policy update" },
  { level: "WARN", source: "ENTRA", message: "Refresh token revoked for maria.chen@corp.local; one stale session still expiring" },
  { level: "AGENT", source: "SENTINEL", message: "Comms-agent prepared Slack update: account risk, workstation isolation, DB egress block" },
];

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
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const normalIdx = useRef(0);
  const suspIdx = useRef(0);
  const critIdx = useRef(0);
  const responseIdx = useRef(0);
  const elapsed = useRef(0);

  useEffect(() => {
    elapsed.current = 0;
    normalIdx.current = 0;
    suspIdx.current = 0;
    critIdx.current = 0;
    responseIdx.current = 0;
  }, [streamPhase]);

  useEffect(() => {
    if (streamPhase === "idle" || paused) return;

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

      setLogs((prev) => [...prev, makeLog(tpl)]);
      elapsed.current += delay;
      timer.current = setTimeout(emit, delay);
    }

    emit();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [streamPhase, paused]);

  const clear = () => setLogs([]);
  return { logs, clear };
}
