import { NextRequest, NextResponse } from "next/server";
import { readMemory } from "@/lib/tensorlake";
import { classify } from "@/lib/llm";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const incidentId: string | undefined = body.incidentId;
  const question: string | undefined = body.question;

  if (!incidentId || !question) {
    return NextResponse.json(
      { error: "incidentId and question required" },
      { status: 400 }
    );
  }

  const memory = await readMemory(incidentId);
  const context = memory
    ? {
        severity: memory.severity,
        classification: memory.classification,
        cycleCount: memory.cycleCount,
        evidence: memory.evidence,
        tasks: memory.tasks,
        alert: memory.alert,
        handoffSummary: memory.handoffSummary,
      }
    : null;

  const prompt = `
Current incident memory (Tensorlake):
${JSON.stringify(context, null, 2) ?? "no incident loaded"}

Analyst question:
${question}

Answer concisely (under 80 words). Reference concrete evidence ids or sources where relevant.
`.trim();

  const answer = await classify(
    "You are Lanaya, an always-on incident response copilot. Ground every answer in the supplied incident memory; do not invent facts not present in the data.",
    prompt
  );

  return NextResponse.json({ answer });
}
