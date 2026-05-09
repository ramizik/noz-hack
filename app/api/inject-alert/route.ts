import { NextResponse } from "next/server";
import { writeAlertFlag } from "@/lib/tensorlake";
import { SEED_ALERTS } from "@/lib/seedAlerts";

const APP_NAME = "sentinel_agent_cycle";

export const maxDuration = 30;

export async function POST() {
  const apiKey = process.env.TENSORLAKE_API_KEY;
  const sandboxId = process.env.TENSORLAKE_MEMORY_SANDBOX_ID;
  if (!apiKey || !sandboxId) {
    return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
  }

  const alert = { ...SEED_ALERTS[0], timestamp: new Date().toISOString() };

  await writeAlertFlag(alert);

  const res = await fetch(`https://api.tensorlake.ai/applications/${APP_NAME}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: "null",
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text }, { status: res.status });
  }

  const data = await res.json().catch(() => ({}));
  return NextResponse.json({ status: "injected", requestId: data.request_id ?? null });
}
