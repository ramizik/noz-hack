"use client";

import { useCallback, useState } from "react";
import { REPLAY_ENDPOINT } from "@/lib/constants";

export function useTriggerCycle(onComplete?: () => void) {
  const [pending, setPending] = useState(false);

  const trigger = useCallback(async () => {
    setPending(true);
    try {
      await fetch(REPLAY_ENDPOINT, { method: "POST" });
      onComplete?.();
    } finally {
      setPending(false);
    }
  }, [onComplete]);

  return { pending, trigger };
}
