"use client";

import { useCallback, useState } from "react";
import { INJECT_ALERT_ENDPOINT } from "@/lib/constants";

const TRIGGER_ENDPOINT = "/api/trigger";

export function useTriggerCycle(onComplete?: () => void) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trigger = useCallback(async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(TRIGGER_ENDPOINT, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Trigger failed with status ${res.status}`);
      }
      onComplete?.();
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : "Trigger failed");
    } finally {
      setPending(false);
    }
  }, [onComplete]);

  return { pending, error, trigger };
}

export function useInjectAlert(onComplete?: () => void) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inject = useCallback(async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(INJECT_ALERT_ENDPOINT, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Alert injection failed with status ${res.status}`);
      }
      onComplete?.();
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : "Alert injection failed");
    } finally {
      setPending(false);
    }
  }, [onComplete]);

  return { pending, error, inject };
}
