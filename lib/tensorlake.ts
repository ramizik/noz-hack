import { SandboxClient } from "tensorlake";
import type { AgentMemory } from "./types";

const SANDBOX_NAME = "sentinelops-memory";

function client(): SandboxClient {
  return SandboxClient.forCloud({
    apiKey: process.env.TENSORLAKE_API_KEY,
  });
}

async function memorySandbox() {
  const c = client();

  // Use pre-provisioned sandbox ID if set — skips list() lookup
  const sandboxId = process.env.TENSORLAKE_SANDBOX_ID;
  if (sandboxId) {
    const sb = c.connect(sandboxId);
    await sb.run("mkdir -p /memory").catch(() => null);
    return sb;
  }

  // Fallback: find or create by name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sandboxes = (await c.list()) as any[];
  const existing = sandboxes.find((s) => s.name === SANDBOX_NAME);

  if (existing) {
    const sb = c.connect(existing.id);
    if (existing.status === "Suspended") await sb.resume();
    return sb;
  }

  const sb = await c.createAndConnect({ startupTimeout: 60 });
  await sb.update({ name: SANDBOX_NAME });
  await sb.run("mkdir -p /memory");
  return sb;
}

export async function readMemory(incidentId: string): Promise<AgentMemory | null> {
  try {
    const sb = await memorySandbox();
    const bytes = await sb.readFile(`/memory/${incidentId}.json`);
    return JSON.parse(new TextDecoder().decode(bytes)) as AgentMemory;
  } catch {
    return null;
  }
}

export async function writeMemory(
  incidentId: string,
  state: AgentMemory
): Promise<void> {
  const sb = await memorySandbox();
  await sb.writeFile(
    `/memory/${incidentId}.json`,
    new TextEncoder().encode(JSON.stringify(state, null, 2))
  );
}

export async function listAllMemory(): Promise<AgentMemory[]> {
  try {
    const sb = await memorySandbox();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dir = (await sb.listDirectory("/memory")) as any;
    const entries: string[] = (dir.entries ?? dir.files ?? [])
      .map((e: any) => e.name ?? e)
      .filter((name: string) => name.endsWith(".json"));

    const results: AgentMemory[] = [];
    for (const name of entries) {
      try {
        const bytes = await sb.readFile(`/memory/${name}`);
        results.push(JSON.parse(new TextDecoder().decode(bytes)) as AgentMemory);
      } catch {
        // skip corrupt files
      }
    }
    return results;
  } catch {
    return [];
  }
}
