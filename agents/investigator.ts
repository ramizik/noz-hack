import { searchContext, type NiaSearchResult } from "@/lib/nia";
import { classify } from "@/lib/llm";
import type { Alert, Evidence } from "@/lib/types";

export async function runInvestigator(
  incidentId: string,
  alert: Alert,
  niaContext: NiaSearchResult[]
): Promise<Evidence[]> {
  const priorIncidents = await searchContext(
    `prior incident ${alert.affectedSystem} postmortem similar`
  );

  const prompt = `
Alert: ${JSON.stringify(alert)}
Runbook context from Nia: ${JSON.stringify(niaContext.slice(0, 2))}
Prior incidents from Nia: ${JSON.stringify(priorIncidents.slice(0, 1))}

Identify 2-3 key evidence items to investigate. Respond with a JSON array only:
[{"source":"<where this evidence comes from>","content":"<what the evidence shows>","niaSourceRef":"<nia doc/section reference if applicable>"}]
`.trim();

  const raw = await classify(
    "You are a security investigator. Always respond with valid JSON only, no markdown.",
    prompt
  );

  const items = JSON.parse(raw) as Array<{
    source: string;
    content: string;
    niaSourceRef?: string;
  }>;

  return items.map((item, i) => ({
    id: `${incidentId}-ev-${Date.now()}-${i}`,
    incidentId,
    source: item.source,
    content: item.content,
    niaSourceRef: item.niaSourceRef,
    timestamp: new Date().toISOString(),
  }));
}
