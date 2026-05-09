import { NextRequest, NextResponse } from "next/server";
import { listAllMemory, readMemory } from "@/lib/tensorlake";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const incidentId = searchParams.get("incidentId");

  if (incidentId) {
    const memory = await readMemory(incidentId);
    return NextResponse.json({ memory: memory ?? null });
  }

  const incidents = await listAllMemory();
  return NextResponse.json({ incidents });
}
