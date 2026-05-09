import { searchContext, type NiaSearchResult } from "@/lib/nia";
import { classify } from "@/lib/llm";
import type { Alert, Task } from "@/lib/types";

export async function runResponder(
  incidentId: string,
  alert: Alert,
  niaContext: NiaSearchResult[]
): Promise<Task[]> {
  const containmentDocs = await searchContext(
    `containment isolation procedure ${alert.affectedSystem}`
  );

  const prompt = `
Alert: ${JSON.stringify(alert)}
Containment procedures from Nia: ${JSON.stringify(containmentDocs.slice(0, 2))}
General runbook context: ${JSON.stringify(niaContext.slice(0, 1))}

Generate exactly 3 response tasks. Respond with a JSON array only:
[{"type":"contain"|"investigate"|"communicate"|"escalate","assignedTo":"<team or role>","description":"<specific action>"}]
`.trim();

  const raw = await classify(
    "You are a security responder. Always respond with valid JSON only, no markdown.",
    prompt
  );

  const items = JSON.parse(raw) as Array<{
    type: Task["type"];
    assignedTo: string;
    description: string;
  }>;

  return items.map((item, i) => ({
    id: `${incidentId}-task-${Date.now()}-${i}`,
    incidentId,
    type: item.type,
    assignedTo: item.assignedTo,
    status: "pending" as const,
    description: item.description,
  }));
}
