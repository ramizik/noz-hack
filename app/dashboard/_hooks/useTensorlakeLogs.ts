"use client";

import { useCallback, useEffect, useState } from "react";
import { TENSORLAKE_LOGS_ENDPOINT } from "@/lib/constants";
import type { TensorlakeLogEntry, TensorlakeLogsResponse } from "@/lib/types";

type TensorlakeLogsState = {
  logs: TensorlakeLogEntry[];
  fetchedAt: string | null;
  consoleUrl: string;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const POLL_MS = 1500;
const DEFAULT_CONSOLE_URL = "https://cloud.tensorlake.ai";

export function useTensorlakeLogs(enabled: boolean): TensorlakeLogsState {
  const [logs, setLogs] = useState<TensorlakeLogEntry[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [consoleUrl, setConsoleUrl] = useState(DEFAULT_CONSOLE_URL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${TENSORLAKE_LOGS_ENDPOINT}?tail=100`, { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as Partial<TensorlakeLogsResponse> & {
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? `Tensorlake logs failed (${res.status})`);
      }

      setLogs(data.logs ?? []);
      setFetchedAt(data.fetchedAt ?? new Date().toISOString());
      setConsoleUrl(data.consoleUrl ?? DEFAULT_CONSOLE_URL);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tensorlake logs unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [enabled, refresh]);

  return { logs, fetchedAt, consoleUrl, loading, error, refresh };
}
