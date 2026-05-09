"use client";

import { useEffect, useRef, useState } from "react";
import type { AgentMemory } from "@/lib/types";
import {
  LANAYA_BG,
  LANAYA_LEVEL_TONE,
  PAGE_LABELS,
} from "@/lib/constants";
import { buildLanayaUpdates } from "@/lib/incidentView";
import { useLanayaChat } from "../_hooks/useLanayaChat";
import { PanelCard } from "./PanelCard";

type Props = {
  memory: AgentMemory | null;
};

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString();
}

export function LanayaPanel({ memory }: Props) {
  const updates = buildLanayaUpdates(memory);
  const chat = useLanayaChat(memory?.incidentId ?? null);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new updates / chat replies.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [updates.length, chat.messages.length]);

  const dayLabel = updates[0]?.ts
    ? formatDay(updates[0].ts)
    : formatDay(new Date().toISOString());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (chat.pending || !draft.trim()) return;
    const q = draft;
    setDraft("");
    await chat.ask(q);
  }

  return (
    <PanelCard className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-white/5 px-5 py-4">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
          {PAGE_LABELS.LANAYA_TITLE}
        </div>
        <span className="text-slate-500">🔔</span>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
        {updates.length === 0 && chat.messages.length === 0 ? (
          <p className="text-center text-sm text-slate-500">
            {PAGE_LABELS.LANAYA_EMPTY}
          </p>
        ) : (
          <div className="space-y-4">
            <p className="text-center text-[10px] font-medium uppercase tracking-[0.18em] text-slate-600">
              {dayLabel}
            </p>
            {updates.map((u) => (
              <div
                key={u.id}
                className={`rounded-md px-3 py-2 ${LANAYA_BG[u.level]}`}
              >
                <p className="text-[11px]">
                  <span className={`font-semibold ${LANAYA_LEVEL_TONE[u.level]}`}>
                    {u.level}
                  </span>
                  <span className="ml-2 tabular-nums text-slate-500">
                    {formatTime(u.ts)}
                  </span>
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-100">
                  {u.body}
                </p>
              </div>
            ))}
            {chat.messages.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-md px-3 py-2 ${
                  msg.role === "user"
                    ? "bg-sky-950/40 border-l-2 border-sky-500/60"
                    : "bg-violet-950/40 border-l-2 border-violet-500/60"
                }`}
              >
                <p className="text-[11px]">
                  <span
                    className={`font-semibold ${
                      msg.role === "user" ? "text-sky-300" : "text-violet-300"
                    }`}
                  >
                    {msg.role === "user" ? "ANALYST" : "LANAYA"}
                  </span>
                  <span className="ml-2 tabular-nums text-slate-500">
                    {formatTime(msg.ts)}
                  </span>
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-100">
                  {msg.body}
                </p>
              </div>
            ))}
            {chat.pending && (
              <p className="text-center text-xs text-slate-500">
                Lanaya is thinking{PAGE_LABELS.LANAYA_THINKING}
              </p>
            )}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-white/5 px-4 py-3"
      >
        <span className="text-slate-500">🎤</span>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={PAGE_LABELS.LANAYA_INPUT_PLACEHOLDER}
          disabled={!memory || chat.pending}
          className="flex-1 rounded-md border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500/50 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!memory || chat.pending || !draft.trim()}
          className="rounded-md bg-sky-500 px-4 py-2 text-xs font-medium text-white transition hover:bg-sky-400 disabled:opacity-50"
        >
          {PAGE_LABELS.LANAYA_SEND}
        </button>
      </form>
    </PanelCard>
  );
}
