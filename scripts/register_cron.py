#!/usr/bin/env python3
"""Register a cron schedule for the sentinel_agent_cycle application."""

import json
import os
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / ".env")
except ImportError:
    pass

import httpx

APP_NAME = "sentinel_agent_cycle"
CRON_EXPRESSION = "*/2 * * * *"  # every 2 minutes for demo


def main() -> None:
    api_key = os.environ["TENSORLAKE_API_KEY"]
    base = "https://api.tensorlake.ai/v1/namespaces/default/applications"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    # List existing schedules
    r = httpx.get(f"{base}/{APP_NAME}/cron-schedules", headers=headers, timeout=15)
    schedules = []
    if r.is_success:
        existing = r.json()
        schedules = existing.get("schedules", [])
        print(f"Existing schedules: {json.dumps(existing, indent=2)}")
    else:
        print(f"Could not list schedules: {r.status_code} {r.text}")

    matching = [
        s for s in schedules
        if s.get("enabled", True) and s.get("cron_expression") == CRON_EXPRESSION
    ]
    if matching:
        print(f"OK Cron already registered: {matching[0]['id']}")
        return

    # Register new schedule
    r = httpx.post(
        f"{base}/{APP_NAME}/cron-schedules",
        headers=headers,
        json={"cron_expression": CRON_EXPRESSION},
        timeout=15,
    )
    if r.is_success:
        print(f"OK Cron registered: {r.json()}")
    else:
        print(f"FAIL Cron registration failed: {r.status_code} {r.text}", file=__import__("sys").stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
