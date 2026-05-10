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

function icon(kind: NetworkNode["kind"]) {
  switch (kind) {
    case "router":
      return "R";
    case "firewall":
      return "F";
    case "switch":
      return "S";
    case "wifi":
      return "W";
    case "database":
      return "DB";
    case "workstation":
      return "PC";
    case "internet":
      return "WAN";
    case "quarantine":
      return "Q";
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
        <div className="flex items-center gap-2 text-[10px]">
          <span className="inline-flex items-center gap-1 text-slate-500">
            <span className="h-2 w-4 rounded-full bg-slate-400" />
            active
          </span>
          <span className="inline-flex items-center gap-1 text-rose-600">
            <span className="h-2 w-4 rounded-full bg-rose-500" />
            blocked
          </span>
          <span className="inline-flex items-center gap-1 text-amber-600">
            <span className="h-2 w-4 rounded-full bg-amber-500" />
            quarantine
          </span>
        </div>
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
                  x={midX - Math.max(5, link.label.length * 1.25)}
                  y={midY - 3.2}
                  width={Math.max(10, link.label.length * 2.5)}
                  height="6.4"
                  rx="1.2"
                  fill="white"
                  opacity="0.9"
                />
                <text
                  x={midX}
                  y={midY + 1.6}
                  textAnchor="middle"
                  className="fill-slate-500 text-[3px] font-medium"
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
                  x="-7.5"
                  y="-5.5"
                  width="15"
                  height="11"
                  rx="1.6"
                  fill={tone.fill}
                  stroke={tone.stroke}
                  strokeWidth="0.8"
                />
                <text
                  x="0"
                  y="-0.6"
                  textAnchor="middle"
                  style={{ fill: tone.text }}
                  className="text-[3.2px] font-black"
                >
                  {icon(node.kind)}
                </text>
                <text
                  x="0"
                  y="10"
                  textAnchor="middle"
                  className="fill-slate-700 text-[3.1px] font-semibold"
                >
                  {node.label}
                </text>
                {(node.ip || node.subnet) && (
                  <text x="0" y="14" textAnchor="middle" className="fill-slate-400 text-[2.5px]">
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

