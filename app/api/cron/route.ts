import { type NextRequest, NextResponse } from "next/server";

const APP_NAME = "sentinel_agent_cycle";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.TENSORLAKE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "TENSORLAKE_API_KEY not set" }, { status: 500 });
  }

  const res = await fetch(
    `https://api.tensorlake.ai/applications/${APP_NAME}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: "null",
    }
  );

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text, source: "cron" }, { status: res.status });
  }

  const data = await res.json().catch(() => ({}));
  return NextResponse.json({
    status: "triggered",
    source: "vercel-cron",
    schedule: "*/5 * * * *",
    requestId: data.request_id ?? data.id ?? null,
    triggeredAt: new Date().toISOString(),
  });
}
