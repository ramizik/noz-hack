"use client";

type Props = { onClose: () => void };

const INTEGRATIONS = [
  {
    name: "TensorLake Sandbox",
    tag: "Memory",
    color: "bg-teal-50 text-teal-700 ring-teal-200",
    dot: "bg-teal-500",
    detail:
      "Persistent agent memory across autonomous cycles. JSON state read/written to /memory/ in an isolated cloud sandbox — survives restarts, shared across Next.js API routes.",
  },
  {
    name: "TensorLake Applications",
    tag: "Compute",
    color: "bg-teal-50 text-teal-700 ring-teal-200",
    dot: "bg-teal-500",
    detail:
      "Serverless agent executor. sentinel_agent_cycle application triggered via api.tensorlake.ai — stateless invocation, stateful memory via Sandbox.",
  },
  {
    name: "Nia RAG API",
    tag: "Context",
    color: "bg-violet-50 text-violet-700 ring-violet-200",
    dot: "bg-violet-500",
    detail:
      "Semantic search over indexed network topology docs. Agent grounds every containment decision in retrieved Nia context — not hallucinated heuristics.",
  },
  {
    name: "Slack Webhooks",
    tag: "Comms",
    color: "bg-amber-50 text-amber-700 ring-amber-200",
    dot: "bg-amber-500",
    detail:
      "Real-time incident alerts dispatched per cycle. Comms-agent constructs structured Slack messages with severity, affected system, and containment status.",
  },
];

const LOOP_STEPS = [
  { label: "Poll", desc: "Read monitoring.json + pending_alert.json from TensorLake Sandbox" },
  { label: "Classify", desc: "GPT-4o classifies threat type, severity, and affected systems" },
  { label: "Ground", desc: "Nia semantic search retrieves relevant topology context (top-3)" },
  { label: "Reason", desc: "GPT-4o generates containment plan grounded in Nia context" },
  { label: "Act", desc: "Network isolation · DB egress block · workstation quarantine — parallel" },
  { label: "Notify", desc: "Slack webhook dispatched with incident summary + action status" },
  { label: "Persist", desc: "Updated AgentMemory written back to TensorLake Sandbox" },
];

export function AboutModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-start justify-between border-b border-slate-100 bg-white px-6 pt-5 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-orange-500">
                <path
                  d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"
                  fill="currentColor" fillOpacity="0.15"
                  stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
                />
              </svg>
              <span className="text-base font-bold text-slate-900">SentinelOps</span>
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700 ring-1 ring-orange-200">
                Always-On
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Autonomous AI cyber incident response — detects, reasons, acts, and notifies with zero human trigger.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 [scrollbar-width:thin]">
        <div className="space-y-6 px-6 py-5">
          {/* What it does */}
          <section>
            <h2 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">What It Does</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: "⚡", label: "Zero-trigger monitoring", sub: "Polls for threats every 60 s autonomously" },
                { icon: "🧠", label: "Multi-cycle memory", sub: "Remembers decisions across independent runs" },
                { icon: "🔗", label: "Parallel containment", sub: "Quarantine + egress block + comms simultaneously" },
                { icon: "📋", label: "Shift handoff report", sub: "Auto-generates structured summary for human review" },
              ].map(({ icon, label, sub }) => (
                <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-800">{icon} {label}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Autonomous loop */}
          <section>
            <h2 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">Autonomous Agent Loop</h2>
            <div className="relative">
              <div className="absolute left-[22px] top-3 h-[calc(100%-24px)] w-px bg-slate-200" />
              <ol className="space-y-2">
                {LOOP_STEPS.map(({ label, desc }, i) => (
                  <li key={label} className="flex items-start gap-3">
                    <span className="relative mt-0.5 flex h-[22px] w-[44px] shrink-0 items-center justify-center rounded-md bg-slate-800 text-[10px] font-bold text-white">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <span className="text-[11px] font-semibold text-slate-700">{label} · </span>
                      <span className="text-[11px] text-slate-500">{desc}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* Sponsor integrations */}
          <section>
            <h2 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">Sponsor Integrations</h2>
            <div className="space-y-2">
              {INTEGRATIONS.map(({ name, tag, color, dot, detail }) => (
                <div key={name} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${color}`}>{tag}</span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-800">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
                      {name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Stack */}
          <section>
            <h2 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">Stack</h2>
            <div className="flex flex-wrap gap-2">
              {[
                "Next.js 15 App Router",
                "GPT-4o",
                "TensorLake SDK",
                "TensorLake Sandbox",
                "Nia v2 RAG API",
                "Slack Webhooks",
                "Vercel",
                "TypeScript",
                "Tailwind CSS",
              ].map((t) => (
                <span
                  key={t}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600"
                >
                  {t}
                </span>
              ))}
            </div>
          </section>
        </div>
        </div>
      </div>
    </div>
  );
}
