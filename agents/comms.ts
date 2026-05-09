import { searchContext, type NiaSearchResult } from "@/lib/nia";
import { classify } from "@/lib/llm";
import type { AgentMemory } from "@/lib/types";

export async function runComms(
  memory: AgentMemory,
  niaContext: NiaSearchResult[]
): Promise<string> {
  const escalationDocs = await searchContext(
    "escalation procedure shift handoff summary security incident"
  );

  const prompt = `
Current incident state:
- ID: ${memory.incidentId}
- Severity: ${memory.severity}
- Classification: ${memory.classification}
- Agent cycles completed: ${memory.cycleCount}
- Tasks: ${JSON.stringify(memory.tasks)}
- Evidence: ${JSON.stringify(memory.evidence)}

Escalation procedures from Nia: ${JSON.stringify(escalationDocs.slice(0, 1))}

Write a shift handoff summary for the incoming security team. Include:
- Current severity and what triggered the escalation
- Key evidence found
- Actions already taken
- Recommended immediate next steps
Keep it under 200 words. Plain text, no markdown.
`.trim();

  return classify(
    "You are a security communications specialist writing concise shift handoff summaries.",
    prompt
  );
}
