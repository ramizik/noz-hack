import { NextResponse } from "next/server";
import { triggerAgentOnAlert } from "@/services/agent-bridge";

export async function POST(req: Request) {
  const finding = await req.json();
  const result = await triggerAgentOnAlert(finding);
  return NextResponse.json(result, { status: 202 });
}
