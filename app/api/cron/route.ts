import { NextResponse } from "next/server";
import { runIncidentCommander } from "@/agents/incidentCommander";
import { SEED_ALERTS, DEMO_INCIDENT_ID } from "@/lib/seedAlerts";

export const maxDuration = 300;

// Vercel Cron hits this via GET every 5 minutes
export async function GET() {
  const memory = await runIncidentCommander(DEMO_INCIDENT_ID, SEED_ALERTS[0]);
  return NextResponse.json({ status: "cycle complete", memory });
}
