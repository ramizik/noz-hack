import { NextResponse } from "next/server";
import { resetDemoMemory } from "@/lib/tensorlake";

export const maxDuration = 30;

export async function POST() {
  await resetDemoMemory();
  return NextResponse.json({ status: "reset" });
}
