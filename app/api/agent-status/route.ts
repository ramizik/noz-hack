import { NextRequest, NextResponse } from "next/server";
import { listAllMemory, readMemory } from "@/lib/tensorlake";
import { summarizeAgent } from "@/lib/agentSummary";
import { isMockMode } from "@/lib/constants";
import { mockStore } from "@/lib/mockStore";
import type { AgentStatusResponse } from "@/lib/types";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const incidentId = searchParams.get("incidentId");
  const mock = isMockMode();

  if (incidentId) {
    const memory = await readMemory();
    return NextResponse.json({ memory: memory ?? null });
  }

  const incidents = mock ? mockStore.list() : await listAllMemory();
  const response: AgentStatusResponse = {
    incidents,
    agent: summarizeAgent(incidents),
  };
  return NextResponse.json(response);
}
