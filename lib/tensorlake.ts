import { SandboxClient } from "tensorlake";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Alert } from "./types";
import type { AgentMemory } from "./types";

const SANDBOX_NAME = "sentinelops-memory";
const MEMORY_DIR = "/memory";
const WORKDIR = "/workspace/sentinelops";
const PYTHON_AGENT_PATH = `${WORKDIR}/incident_agent.py`;
const PYTHON_COMMAND =
  'PY="$(command -v python3 || command -v python)" && exec "$PY" "$PYTHON_AGENT_PATH" --incident-id "$INCIDENT_ID" --event "$EVENT_PATH" --memory-dir "$MEMORY_DIR"';

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
    await prepareSandboxFs(sb);
    return sb;
  }

  // Fallback: find or create by name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sandboxes = (await c.list()) as any[];
  const existing = sandboxes.find((s) => s.name === SANDBOX_NAME);

  if (existing) {
    const sb = c.connect(existing.sandboxId ?? existing.id);
    if (String(existing.status).toLowerCase() === "suspended") {
      await sb.resume();
    }
    await prepareSandboxFs(sb);
    return sb;
  }

  const sb = await c.createAndConnect({ startupTimeout: 60 });
  await sb.update({ name: SANDBOX_NAME });
  await prepareSandboxFs(sb);
  return sb;
}

export async function readMemory(incidentId: string): Promise<AgentMemory | null> {
  try {
    const sb = await memorySandbox();
    const bytes = await sb.readFile(`${MEMORY_DIR}/${incidentId}.json`);
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
    `${MEMORY_DIR}/${incidentId}.json`,
    new TextEncoder().encode(JSON.stringify(state, null, 2))
  );
}

export async function runPythonIncidentCycle(
  incidentId: string,
  alert: Alert
): Promise<AgentMemory> {
  const sb = await memorySandbox();
  await installPythonAgent(sb);

  const eventPath = `${WORKDIR}/${alert.id}-${Date.now()}.json`;
  await sb.writeFile(
    eventPath,
    new TextEncoder().encode(JSON.stringify(alert, null, 2))
  );

  const result = await sb.run("/bin/bash", {
    args: ["-lc", PYTHON_COMMAND],
    env: {
      EVENT_PATH: eventPath,
      INCIDENT_ID: incidentId,
      MEMORY_DIR,
      PYTHON_AGENT_PATH,
      NIA_API_KEY: process.env.NIA_API_KEY ?? "",
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
    },
    timeout: 300,
  });

  if (result.exitCode !== 0) {
    throw new Error(`Tensorlake Python agent failed: ${result.stderr}`);
  }

  return JSON.parse(result.stdout) as AgentMemory;
}

export async function listAllMemory(): Promise<AgentMemory[]> {
  try {
    const sb = await memorySandbox();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dir = (await sb.listDirectory(MEMORY_DIR)) as any;
    const entries: string[] = (dir.entries ?? dir.files ?? [])
      .map((e: any) => e.name ?? e)
      .filter((name: string) => name.endsWith(".json"));

    const results: AgentMemory[] = [];
    for (const name of entries) {
      try {
        const bytes = await sb.readFile(`${MEMORY_DIR}/${name}`);
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

async function installPythonAgent(sb: Awaited<ReturnType<typeof memorySandbox>>): Promise<void> {
  const source = await readFile(
    path.join(process.cwd(), "agents", "python", "incident_agent.py")
  );
  await sb.writeFile(PYTHON_AGENT_PATH, source);
  await sb.run("/bin/bash", {
    args: ["-lc", "pip install --quiet --disable-pip-version-check httpx openai"],
    timeout: 120,
  });
}

async function prepareSandboxFs(
  sb: Awaited<ReturnType<typeof memorySandbox>>
): Promise<void> {
  await sb.run("/bin/bash", {
    args: ["-lc", 'mkdir -p "$MEMORY_DIR" "$WORKDIR"'],
    env: { MEMORY_DIR, WORKDIR },
  });
}
