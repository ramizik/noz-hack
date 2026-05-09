import { NextResponse } from "next/server";

const APP_NAME = "sentinel_agent_cycle";

export async function POST() {
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
      },
      body: "null",
    }
  );

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text }, { status: res.status });
  }

  const data = await res.json().catch(() => ({}));
  return NextResponse.json({ status: "triggered", requestId: data.request_id ?? data.id ?? null });
}
