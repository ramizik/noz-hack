"use client";

import { useEffect, useState } from "react";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

export function formatElapsed(ms: number): string {
  if (ms < MINUTE) return `${Math.floor(ms / SECOND)}s`;
  if (ms < HOUR) {
    const m = Math.floor(ms / MINUTE);
    const s = Math.floor((ms % MINUTE) / SECOND);
    return `${m}m ${s.toString().padStart(2, "0")}s`;
  }
  const h = Math.floor(ms / HOUR);
  const m = Math.floor((ms % HOUR) / MINUTE);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

// Live elapsed-time string ticking every second.
export function useElapsed(startedAt: string | undefined): string {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!startedAt) return "—";
  const start = new Date(startedAt).getTime();
  return formatElapsed(Math.max(0, now - start));
}
