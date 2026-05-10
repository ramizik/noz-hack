"use client";

import type { NetworkNode, NetworkState } from "@/lib/types";

const NODE_TONE: Record<NetworkNode["kind"], { fill: string; stroke: string; text: string }> = {
  router: { fill: "#dbeafe", stroke: "#2563eb", text: "#1e3a8a" },
  firewall: { fill: "#fee2e2", stroke: "#dc2626", text: "#7f1d1d" },
  switch: { fill: "#ccfbf1", stroke: "#0f766e", text: "#134e4a" },
  wifi: { fill: "#fef3c7", stroke: "#d97706", text: "#78350f" },
  server: { fill: "#e2e8f0", stroke: "#64748b", text: "#334155" },
  database: { fill: "#ede9fe", stroke: "#7c3aed", text: "#4c1d95" },
  workstation: { fill: "#dcfce7", stroke: "#16a34a", text: "#14532d" },
  internet: { fill: "#f1f5f9", stroke: "#475569", text: "#334155" },
  quarantine: { fill: "#fff1f2", stroke: "#e11d48", text: "#881337" },
};

const NODE_LEGEND: { kind: NetworkNode["kind"]; abbr: string; label: string }[] = [
  { kind: "internet",    abbr: "WAN",  label: "Internet" },
  { kind: "router",      abbr: "RTR",  label: "Router" },
  { kind: "firewall",    abbr: "FW",   label: "Firewall" },
  { kind: "switch",      abbr: "SW",   label: "Switch" },
  { kind: "wifi",        abbr: "AP",   label: "Access Point" },
  { kind: "server",      abbr: "SRV",  label: "Server" },
  { kind: "database",    abbr: "DB",   label: "Database" },
  { kind: "workstation", abbr: "WS",   label: "Workstation" },
  { kind: "quarantine",  abbr: "QUAR", label: "Quarantine Zone" },
];

function icon(kind: NetworkNode["kind"]) {
  switch (kind) {
    case "router":
      return "RTR";
    case "firewall":
      return "FW";
    case "switch":
      return "SW";
    case "wifi":
      return "AP";
    case "database":
      return "DB";
    case "workstation":
      return "WS";
    case "internet":
      return "WAN";
    case "quarantine":
      return "QUAR";
    default:
      return "SRV";
  }
}

function linkTone(status: string) {
  if (status === "blocked") return { stroke: "#e11d48", dash: "5 4", width: 2.5 };
  if (status === "quarantined") return { stroke: "#f59e0b", dash: "3 3", width: 2.5 };
  return { stroke: "#64748b", dash: "", width: 1.8 };
}

type Props = {
  network: NetworkState;
};

export function NetworkingDiagram({ network }: Props) {
  const nodes = new Map(network.nodes.map((node) => [node.id, node]));
  const recentChanges = [...network.changes].reverse().slice(0, 3);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <p className="text-xs font-semibold text-slate-700">Networking Diagram</p>
          <p className="mt-0.5 text-[10px] text-slate-400">
            Tensorlake state · grounded by Nia topology docs
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="inline-flex items-center gap-1.5 text-slate-500">
            <svg width="16" height="4"><line x1="0" y1="2" x2="16" y2="2" stroke="#94a3b8" strokeWidth="1.5"/></svg>
            active
          </span>
          <span className="inline-flex items-center gap-1.5 text-rose-600">
            <svg width="16" height="4"><line x1="0" y1="2" x2="16" y2="2" stroke="#e11d48" strokeWidth="1.5" strokeDasharray="3 2"/></svg>
            blocked
          </span>
          <span className="inline-flex items-center gap-1.5 text-amber-600">
            <svg width="16" height="4"><line x1="0" y1="2" x2="16" y2="2" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 2"/></svg>
            quarantine
          </span>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap gap-x-3 gap-y-1 border-b border-slate-100 bg-white px-4 py-2">
        {NODE_LEGEND.map(({ kind, abbr, label }) => {
          const tone = NODE_TONE[kind];
          return (
            <span key={kind} className="inline-flex items-center gap-1">
              <span
                className="inline-flex h-4 min-w-[22px] items-center justify-center rounded px-1 text-[9px] font-black"
                style={{ background: tone.fill, border: `1px solid ${tone.stroke}`, color: tone.text }}
              >
                {abbr}
              </span>
              <span className="text-[9px] text-slate-500">{label}</span>
            </span>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 px-3 py-3">
        <svg viewBox="0 0 100 100" className="h-full min-h-[230px] w-full">
          <defs>
            <filter id="nodeShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.18" />
            </filter>
          </defs>

          {network.links.map((link) => {
            const source = nodes.get(link.source);
            const target = nodes.get(link.target);
            if (!source || !target) return null;
            const tone = linkTone(link.status);
            const midX = (source.x + target.x) / 2;
            const midY = (source.y + target.y) / 2;
            return (
              <g key={link.id}>
                <line
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={tone.stroke}
                  strokeWidth={tone.width}
                  strokeDasharray={tone.dash}
                  strokeLinecap="round"
                />
                <rect
                  x={midX - Math.max(4, link.label.length * 1.1)}
                  y={midY - 2.5}
                  width={Math.max(8, link.label.length * 2.2)}
                  height="5"
                  rx="1"
                  fill="white"
                  opacity="0.9"
                />
                <text
                  x={midX}
                  y={midY + 1.2}
                  textAnchor="middle"
                  className="fill-slate-500 text-[2.4px] font-medium"
                >
                  {link.status === "blocked" ? "DISCONNECTED" : link.label}
                </text>
              </g>
            );
          })}

          {network.nodes.map((node) => {
            const tone = NODE_TONE[node.kind];
            return (
              <g key={node.id} transform={`translate(${node.x} ${node.y})`} filter="url(#nodeShadow)">
                <rect
                  x="-6"
                  y="-4"
                  width="12"
                  height="8"
                  rx="1.4"
                  fill={tone.fill}
                  stroke={tone.stroke}
                  strokeWidth="0.7"
                />
                <text
                  x="0"
                  y="0.8"
                  textAnchor="middle"
                  style={{ fill: tone.text }}
                  className="text-[2.6px] font-black"
                >
                  {icon(node.kind)}
                </text>
                <text
                  x="0"
                  y="7.5"
                  textAnchor="middle"
                  className="fill-slate-700 text-[2.6px] font-semibold"
                >
                  {node.label}
                </text>
                {(node.ip || node.subnet) && (
                  <text x="0" y="10.5" textAnchor="middle" className="fill-slate-400 text-[2.1px]">
                    {node.ip ?? node.subnet}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-4 py-2">
        {recentChanges.length === 0 ? (
          <p className="text-[10px] text-slate-400">
            Baseline topology from Nia context · waiting for agent containment actions
          </p>
        ) : (
          <ul className="space-y-1">
            {recentChanges.map((change) => (
              <li key={change.id} className="flex items-start gap-2 text-[10px]">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                <span className="min-w-0 flex-1 truncate text-slate-600">
                  Cycle {change.cycle}: {change.operation} {change.target} · {change.reason}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

