import { NextResponse } from "next/server";
import type { Incident } from "@shared/types";
import { fetchIncidents } from "@/services/agent-bridge";

export async function GET() {
  const incidents: Incident[] = await fetchIncidents();
  return NextResponse.json({ incidents });
}
