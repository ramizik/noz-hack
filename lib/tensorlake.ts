import { Sandbox } from "tensorlake";
import type { AgentMemory, MonitoringMemory } from "./types";

const MEMORY_DIR = "/memory";
const INCIDENT_ID = "INC-2026-001";

async function getMemorySandbox(): Promise<Sandbox> {
  const sandboxId = process.env.TENSORLAKE_MEMORY_SANDBOX_ID;
  if (!sandboxId) throw new Error("TENSORLAKE_MEMORY_SANDBOX_ID not set");
  return Sandbox.connect({ sandboxId });
}

export async function readMemory(_incidentId?: string): Promise<AgentMemory | null> {
  try {
    const sb = await getMemorySandbox();
    const bytes = await sb.readFile(`${MEMORY_DIR}/${INCIDENT_ID}.json`);
    return JSON.parse(new TextDecoder().decode(bytes)) as AgentMemory;
  } catch {
    return null;
  }
}

export async function listAllMemory(): Promise<AgentMemory[]> {
  const memory = await readMemory();
  return memory ? [memory] : [];
}

export async function readMonitoringMemory(): Promise<MonitoringMemory | null> {
  try {
    const sb = await getMemorySandbox();
    const bytes = await sb.readFile(`${MEMORY_DIR}/monitoring.json`);
    return JSON.parse(new TextDecoder().decode(bytes)) as MonitoringMemory;
  } catch {
    return null;
  }
}

export async function writeAlertFlag(alert: object): Promise<void> {
  const sb = await getMemorySandbox();
  await sb.writeFile(
    `${MEMORY_DIR}/pending_alert.json`,
    Buffer.from(JSON.stringify(alert))
  );
}
