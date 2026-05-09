import { NextResponse } from "next/server";
import type { AgentTimelineEvent } from "@shared/types";
import { fetchTimeline } from "@/services/agent-bridge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const incidentId = searchParams.get("incidentId") ?? undefined;
  const events: AgentTimelineEvent[] = await fetchTimeline(incidentId);
  return NextResponse.json({ events });
}
