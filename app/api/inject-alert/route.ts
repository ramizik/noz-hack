import { type NextRequest, NextResponse } from "next/server";
import { writeAlertFlag } from "@/lib/tensorlake";
import { SEED_ALERTS } from "@/lib/seedAlerts";

const APP_NAME = "sentinel_agent_cycle";

export const maxDuration = 30;

async function fireSlack(alert: typeof SEED_ALERTS[0]): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;
  const detectedAt = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `🚨 SentinelOps — Incident Detected: ${alert.affectedSystem}`,
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: "🚨 SentinelOps — Incident Detected", emoji: true },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Affected System:*\n\`${alert.affectedSystem}\`` },
            { type: "mrkdwn", text: `*Type:*\n${alert.type.replace(/_/g, " ")}` },
            { type: "mrkdwn", text: `*Detected At:*\n${detectedAt}` },
            { type: "mrkdwn", text: `*Agent:*\nsentinel_agent_cycle → responding` },
          ],
        },
        {
          type: "section",
          text: { type: "mrkdwn", text: `*Details:* ${alert.details}` },
        },
        {
          type: "context",
          elements: [{ type: "mrkdwn", text: "⚙️ Containment agent triggered · Nia playbook loaded · TensorLake memory updated" }],
        },
      ],
    }),
  }).catch(() => {});
}

export async function POST(_req: NextRequest) {
  const apiKey = process.env.TENSORLAKE_API_KEY;
  const sandboxId = process.env.TENSORLAKE_MEMORY_SANDBOX_ID;
  if (!apiKey || !sandboxId) {
    return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
  }

  const alert = { ...SEED_ALERTS[0], timestamp: new Date().toISOString() };

  await Promise.all([
    writeAlertFlag(alert),
    fireSlack(alert),
  ]);

  const res = await fetch(`https://api.tensorlake.ai/applications/${APP_NAME}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
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
