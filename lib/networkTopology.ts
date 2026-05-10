import type { NetworkLink, NetworkState } from "./types";

export const DEFAULT_NETWORK_STATE: NetworkState = {
  updatedAt: "2026-05-09T00:00:00Z",
  groundedSource: "data/runbooks/enterprise_network_diagram_context.md#baseline-diagram-codes",
  nodes: [
    { id: "internet", label: "Internet", kind: "internet", x: 8, y: 56 },
    { id: "edge-router-01", label: "Edge Router", kind: "router", ip: "10.0.8.1", x: 20, y: 28 },
    { id: "fw-egress-01", label: "Egress FW", kind: "firewall", ip: "10.0.8.2", x: 36, y: 28 },
    { id: "prod-app-switch", label: "Prod App", kind: "switch", subnet: "10.0.1.0/24", x: 52, y: 18 },
    { id: "atlas-db-switch", label: "Atlas DB", kind: "switch", subnet: "10.42.18.0/24", x: 52, y: 46 },
    { id: "corp-access-switch", label: "Corp Access", kind: "switch", subnet: "10.20.44.0/24", x: 52, y: 74 },
    { id: "corp-wifi", label: "Corp Wi-Fi", kind: "wifi", subnet: "10.20.80.0/22", x: 36, y: 74 },
    { id: "prod-api-01", label: "prod-api-01", kind: "server", ip: "10.0.1.12", x: 74, y: 14 },
    { id: "prod-db-01", label: "prod-db-01", kind: "database", ip: "10.0.1.45 / 10.42.18.27", x: 74, y: 38 },
    { id: "fileserver01", label: "fileserver01", kind: "server", ip: "10.0.9.21", x: 74, y: 64 },
    { id: "ws-44", label: "ws-44", kind: "workstation", ip: "10.20.44.44", x: 74, y: 84 },
    { id: "quarantine-vlan", label: "Quarantine", kind: "quarantine", subnet: "10.99.0.0/24", x: 92, y: 50 },
  ],
  links: [
    { id: "internet-edge", source: "internet", target: "edge-router-01", label: "100BaseTX", status: "active" },
    { id: "edge-fw", source: "edge-router-01", target: "fw-egress-01", label: "100BaseTX", status: "active" },
    { id: "fw-prod-app", source: "fw-egress-01", target: "prod-app-switch", label: "Ethernet", status: "active" },
    { id: "fw-atlas-db", source: "fw-egress-01", target: "atlas-db-switch", label: "Fiber", status: "active" },
    { id: "fw-internet", source: "fw-egress-01", target: "internet", label: "egress", status: "active" },
    { id: "prod-app-api", source: "prod-app-switch", target: "prod-api-01", label: "10.0.1.12", status: "active" },
    { id: "prod-app-db", source: "prod-app-switch", target: "prod-db-01", label: "10.0.1.45", status: "active" },
    { id: "atlas-db-prod-db", source: "atlas-db-switch", target: "prod-db-01", label: "10.42.18.27", status: "active" },
    { id: "corp-files", source: "corp-access-switch", target: "fileserver01", label: "SMB", status: "active" },
    { id: "corp-ws44", source: "corp-access-switch", target: "ws-44", label: "wired", status: "active" },
    { id: "wifi-ws44", source: "corp-wifi", target: "ws-44", label: "wifi", status: "active" },
  ],
  changes: [],
};

export function applyDemoContainment(base: NetworkState): NetworkState {
  const now = new Date().toISOString();
  const linkPatch: Record<string, NetworkLink["status"]> = {
    "corp-ws44": "blocked",
    "wifi-ws44": "blocked",
    "fw-internet": "blocked",
  };
  return {
    ...base,
    updatedAt: now,
    links: [
      ...base.links.map((l) =>
        linkPatch[l.id] ? { ...l, status: linkPatch[l.id] as NetworkLink["status"] } : l
      ),
      {
        id: "ws44-quarantine",
        source: "ws-44",
        target: "quarantine-vlan",
        label: "VLAN 99",
        status: "quarantined",
      },
    ],
    changes: [
      {
        id: "demo-chg-1",
        incidentId: "demo",
        cycle: 1,
        operation: "block",
        target: "fw-internet (egress)",
        reason: "prod-db-01 exfiltration confirmed — outbound egress blocked by containment-agent",
        groundedSource: "DB Exfiltration Runbook · Immediate Containment Steps",
        timestamp: now,
      },
      {
        id: "demo-chg-2",
        incidentId: "demo",
        cycle: 1,
        operation: "disconnect",
        target: "ws-44",
        reason: "lateral movement candidate — moved to quarantine VLAN 99",
        groundedSource: "Nia-guided playbook · Endpoint Isolation",
        timestamp: now,
      },
    ],
  };
}

