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
  { level: "ERROR", source: "FW", message: "BLOCKED prod-db-01 → 185.220.101.45:1194 (OpenVPN port, not whitelisted)" },
  { level: "WARN", source: "EDR", message: "Unusual process: pg_dump on prod-db-01 — no scheduled job found" },
  { level: "ERROR", source: "IDS", message: "Exfiltration pattern: sustained outbound 10.0.1.45 → 185.220.101.45" },
  { level: "WARN", source: "SIEM", message: "Rule triggered: large_outbound_db_host (threshold 500 MB/5 min exceeded)" },
];

const CRITICAL: Tpl[] = [
  { level: "CRITICAL", source: "SIEM", message: "ALERT INC-2026-001 — Exfiltration confirmed: 2.1 GB transferred over 8 min" },
  { level: "CRITICAL", source: "EDR", message: "Ransomware signature matched on prod-db-01 (MITRE ATT&CK T1041)" },
  { level: "CRITICAL", source: "SIEM", message: "14 correlated events across prod-db-01, fileserver01, bastion-01" },
  { level: "ERROR", source: "FW", message: "Outbound block candidate identified for 185.220.101.45:443" },
  { level: "CRITICAL", source: "SIEM", message: "Containment threshold exceeded for database subnet egress" },
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
  const elapsed = useRef(0);

  useEffect(() => {
    elapsed.current = 0;
    normalIdx.current = 0;
    suspIdx.current = 0;
    critIdx.current = 0;
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
          tpl = NORMAL[normalIdx.current++ % NORMAL.length];
          delay = 800 + Math.random() * 800;
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
