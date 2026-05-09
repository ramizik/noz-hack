import { Sandbox } from "tensorlake";
import type { AgentMemory, MonitoringMemory } from "./types";
import {
  LIVE_INCIDENT_ID,
  PRERECORDED_INCIDENT_ID,
  PRERECORDED_INCIDENT_MEMORY,
} from "./prerecordedIncident";

const MEMORY_DIR = "/memory";
const INCIDENT_IDS = [LIVE_INCIDENT_ID, PRERECORDED_INCIDENT_ID];

async function getMemorySandbox(): Promise<Sandbox> {
  const sandboxId = process.env.TENSORLAKE_MEMORY_SANDBOX_ID;
  if (!sandboxId) throw new Error("TENSORLAKE_MEMORY_SANDBOX_ID not set");
  return Sandbox.connect({ sandboxId });
}

export async function readMemory(incidentId = LIVE_INCIDENT_ID): Promise<AgentMemory | null> {
  try {
    const sb = await getMemorySandbox();
    const bytes = await sb.readFile(`${MEMORY_DIR}/${incidentId}.json`);
    return JSON.parse(new TextDecoder().decode(bytes)) as AgentMemory;
  } catch {
    return null;
  }
}

export async function listAllMemory(): Promise<AgentMemory[]> {
  await ensurePrerecordedIncidentMemory();
  const memories = await Promise.all(INCIDENT_IDS.map((id) => readMemory(id)));
  return memories
    .filter((memory): memory is AgentMemory => Boolean(memory))
    .slice(0, 2);
}

async function ensurePrerecordedIncidentMemory(): Promise<void> {
  const existing = await readMemory(PRERECORDED_INCIDENT_ID);
  if (existing) return;

  try {
    const sb = await getMemorySandbox();
    await sb.writeFile(
      `${MEMORY_DIR}/${PRERECORDED_INCIDENT_ID}.json`,
      Buffer.from(JSON.stringify(PRERECORDED_INCIDENT_MEMORY, null, 2))
    );
  } catch {
    // The dashboard can still show live memory if seeding the demo incident fails.
  }
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

export async function resetDemoMemory(): Promise<void> {
  const sb = await getMemorySandbox();
  await Promise.allSettled([
    sb.deleteFile(`${MEMORY_DIR}/${LIVE_INCIDENT_ID}.json`),
    sb.deleteFile(`${MEMORY_DIR}/monitoring.json`),
    sb.deleteFile(`${MEMORY_DIR}/pending_alert.json`),
  ]);
}
