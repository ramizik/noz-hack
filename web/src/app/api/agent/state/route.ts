import { NextResponse } from "next/server";
import type { AgentState } from "@shared/types";
import { fetchAgentState } from "@/services/agent-bridge";

export async function GET() {
  const state: AgentState = await fetchAgentState();
  return NextResponse.json(state);
}
