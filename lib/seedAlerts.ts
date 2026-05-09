import type { Alert } from "./types";

export const SEED_ALERTS: Alert[] = [
  {
    id: "alert-001",
    type: "unusual_outbound_traffic",
    affectedSystem: "prod-db-01",
    details:
      "2GB outbound transfer to unknown IP 185.220.101.45 at 03:14 UTC. Protocol: TCP/443. Duration: 8 minutes. No matching scheduled job.",
    timestamp: new Date().toISOString(),
  },
];

export const DEMO_INCIDENT_ID = "incident-demo-001";

export function getAlert(id: string): Alert | undefined {
  return SEED_ALERTS.find((a) => a.id === id);
}
