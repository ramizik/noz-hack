"use client";

import { useCallback, useState } from "react";
import { LANAYA_ENDPOINT } from "@/lib/constants";

export interface LanayaChatMessage {
  id: string;
  role: "user" | "lanaya";
  body: string;
  ts: string;
}

export function useLanayaChat(incidentId: string | null) {
  const [messages, setMessages] = useState<LanayaChatMessage[]>([]);
  const [pending, setPending] = useState(false);

  const ask = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || !incidentId) return;
      const now = new Date().toISOString();
      const userMsg: LanayaChatMessage = {
        id: `q-${Date.now()}`,
        role: "user",
        body: trimmed,
        ts: now,
      };
      setMessages((prev) => [...prev, userMsg]);
      setPending(true);
      try {
        const res = await fetch(LANAYA_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ incidentId, question: trimmed }),
        });
        const data = await res.json();
        const answer: string = data.answer ?? data.error ?? "(no response)";
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "lanaya",
            body: answer,
            ts: new Date().toISOString(),
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "lanaya",
            body: "(network error — please retry)",
            ts: new Date().toISOString(),
          },
        ]);
      } finally {
        setPending(false);
      }
    },
    [incidentId]
  );

  return { messages, pending, ask };
}
