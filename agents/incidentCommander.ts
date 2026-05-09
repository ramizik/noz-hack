import { readMemory, writeMemory } from "@/lib/tensorlake";
import { searchContext } from "@/lib/nia";
import { classify } from "@/lib/llm";
import { runInvestigator } from "./investigator";
import { runResponder } from "./responder";
import { runComms } from "./comms";
import type { Alert, AgentMemory, Severity } from "@/lib/types";

export async function runIncidentCommander(
  incidentId: string,
  alert: Alert
): Promise<AgentMemory> {
  const prior = await readMemory(incidentId);
  const cycleCount = (prior?.cycleCount ?? 0) + 1;

  const niaResults = await searchContext(
    `${alert.type} ${alert.affectedSystem} incident response runbook data exfiltration`
  );

  const classifyPrompt = prior
    ? `Prior incident context: ${JSON.stringify({ severity: prior.severity, classification: prior.classification, cycleCount: prior.cycleCount })}
New evidence in this cycle: ${JSON.stringify(alert)}
Nia runbook context: ${JSON.stringify(niaResults.slice(0, 2))}
Re-classify severity given prior context and new evidence. Respond with JSON only: {"severity":"critical"|"high"|"medium"|"low","classification":"<incident type>"}`
    : `Alert: ${JSON.stringify(alert)}
Nia runbook context: ${JSON.stringify(niaResults.slice(0, 2))}
Classify severity and incident type. Respond with JSON only: {"severity":"critical"|"high"|"medium"|"low","classification":"<incident type>"}`;

  const classifyRaw = await classify(
    "You are a senior security incident commander. Always respond with valid JSON only, no markdown.",
    classifyPrompt
  );

  const { severity, classification } = JSON.parse(classifyRaw) as {
    severity: Severity;
    classification: string;
  };

  const [tasks, evidence] = await Promise.all([
    runResponder(incidentId, alert, niaResults),
    runInvestigator(incidentId, alert, niaResults),
  ]);

  const state: AgentMemory = {
    incidentId,
    severity,
    classification,
    tasks: [...(prior?.tasks ?? []), ...tasks],
    evidence: [...(prior?.evidence ?? []), ...evidence],
    cycleCount,
    lastCycleAt: new Date().toISOString(),
  };

  if (cycleCount >= 2) {
    state.handoffSummary = await runComms(state, niaResults);
  }

  await writeMemory(incidentId, state);
  return state;
}
