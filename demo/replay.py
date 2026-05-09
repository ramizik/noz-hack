"""Replay seeded GuardDuty findings into the webhook for the live demo."""

from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path

import httpx

from agent.constants import ENV_KEYS

SEED_DIR = Path(os.environ.get("DEMO_SEED_DIR", "demo/seed/alerts"))
WEBHOOK_URL = os.environ.get(
    ENV_KEYS["MOCK_ALERT_WEBHOOK_URL"], "http://localhost:3000/api/webhooks/guardduty"
)


async def post_finding(client: httpx.AsyncClient, path: Path) -> None:
    payload = json.loads(path.read_text(encoding="utf-8"))
    resp = await client.post(WEBHOOK_URL, json=payload, timeout=10.0)
    print(f"-> {path.name}: {resp.status_code}")


async def main(filenames: list[str]) -> None:
    files = (
        [SEED_DIR / name for name in filenames]
        if filenames
        else sorted(SEED_DIR.glob("*.json"))
    )
    async with httpx.AsyncClient() as client:
        for f in files:
            await post_finding(client, f)
            await asyncio.sleep(0.5)


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1:]))
