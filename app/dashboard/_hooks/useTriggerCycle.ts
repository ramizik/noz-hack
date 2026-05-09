"use client";

import { useCallback, useState } from "react";
import { INJECT_ALERT_ENDPOINT } from "@/lib/constants";

const TRIGGER_ENDPOINT = "/api/trigger";

export function useTriggerCycle(onComplete?: () => void) {
  const [pending, setPending] = useState(false);

  const trigger = useCallback(async () => {
    setPending(true);
    try {
      await fetch(TRIGGER_ENDPOINT, { method: "POST" });
      onComplete?.();
    } finally {
      setPending(false);
    }
  }, [onComplete]);

  return { pending, trigger };
}

export function useInjectAlert(onComplete?: () => void) {
  const [pending, setPending] = useState(false);

  const inject = useCallback(async () => {
    setPending(true);
    try {
      await fetch(INJECT_ALERT_ENDPOINT, { method: "POST" });
      onComplete?.();
    } finally {
      setPending(false);
    }
  }, [onComplete]);

  return { pending, inject };
}
