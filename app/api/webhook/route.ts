import { NextRequest, NextResponse } from "next/server";
import { runIncidentCommander } from "@/agents/incidentCommander";
import { SEED_ALERTS, DEMO_INCIDENT_ID } from "@/lib/seedAlerts";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const alert = body.alert ?? SEED_ALERTS[0];
  const incidentId: string = body.incidentId ?? DEMO_INCIDENT_ID;

  const memory = await runIncidentCommander(incidentId, alert);
  return NextResponse.json({ status: "cycle complete", incidentId, memory });
}
