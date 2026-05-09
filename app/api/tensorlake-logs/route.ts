import { type NextRequest, NextResponse } from "next/server";
import type { TensorlakeLogEntry, TensorlakeLogsResponse } from "@/lib/types";

const APP_NAME = process.env.TENSORLAKE_APPLICATION_NAME ?? "sentinel_agent_cycle";
const CONSOLE_URL = "https://cloud.tensorlake.ai";
const LEVEL_LABELS: Record<number, TensorlakeLogEntry["level"]> = {
  1: "trace",
  2: "debug",
  3: "info",
  4: "warning",
  5: "error",
};

export const maxDuration = 30;

type RawTensorlakeLog = {
  timestamp?: number | string;
  uuid?: string;
  namespace?: string;
  application?: string;
  body?: string;
  level?: number;
  logAttributes?: string | Record<string, unknown> | null;
  requestId?: string;
  request_id?: string;
  function?: string;
  functionName?: string;
  function_name?: string;
  functionRunId?: string;
  function_run_id?: string;
};

export async function GET(req: NextRequest) {
  const apiKey = process.env.TENSORLAKE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "TENSORLAKE_API_KEY not set" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const tail = clampNumber(searchParams.get("tail"), 1, 200, 80);
  const requestId = searchParams.get("requestId");
  const nextToken = searchParams.get("nextToken");

  const upstreamParams = new URLSearchParams();
  upstreamParams.set("tail", String(tail));
  if (requestId) upstreamParams.set("requestId", requestId);
  if (nextToken) upstreamParams.set("nextToken", nextToken);

  const res = await fetch(
    `https://api.tensorlake.ai/applications/${APP_NAME}/logs?${upstreamParams.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text }, { status: res.status });
  }

  const data = (await res.json().catch(() => ({}))) as {
    logs?: RawTensorlakeLog[];
    nextToken?: string | null;
  };

  const response: TensorlakeLogsResponse = {
    logs: (data.logs ?? []).map(normalizeLog).sort((a, b) => (
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )),
    nextToken: data.nextToken ?? null,
    fetchedAt: new Date().toISOString(),
    consoleUrl: CONSOLE_URL,
  };

  return NextResponse.json(response);
}

function clampNumber(value: string | null, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function normalizeLog(log: RawTensorlakeLog): TensorlakeLogEntry {
  const attributes = parseAttributes(log.logAttributes);
  const levelNumber = typeof log.level === "number" ? log.level : null;
  const timestamp = normalizeTimestamp(log.timestamp);

  return {
    id: log.uuid ?? `${timestamp}-${String(log.body ?? "").slice(0, 40)}`,
    timestamp,
    level: levelNumber ? LEVEL_LABELS[levelNumber] ?? "unknown" : "unknown",
    levelNumber,
    body: String(log.body ?? ""),
    application: log.application ?? null,
    namespace: log.namespace ?? null,
    requestId: log.requestId ?? log.request_id ?? stringAttr(attributes, "request_id") ?? null,
    functionName:
      log.function ??
      log.functionName ??
      log.function_name ??
      stringAttr(attributes, "function") ??
      null,
    functionRunId:
      log.functionRunId ??
      log.function_run_id ??
      stringAttr(attributes, "function_run_id") ??
      null,
    attributes,
  };
}

function parseAttributes(
  value: RawTensorlakeLog["logAttributes"]
): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function stringAttr(attrs: Record<string, unknown> | null, key: string): string | null {
  const value = attrs?.[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function normalizeTimestamp(value: RawTensorlakeLog["timestamp"]): string {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return new Date().toISOString();

  // Tensorlake log examples use nanoseconds. Accept millis/seconds defensively.
  const millis = raw > 1_000_000_000_000_000
    ? Math.floor(raw / 1_000_000)
    : raw > 1_000_000_000_000
    ? raw
    : raw * 1000;

  return new Date(millis).toISOString();
}
