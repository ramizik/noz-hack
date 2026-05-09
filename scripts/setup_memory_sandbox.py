#!/usr/bin/env python3
"""One-time setup: create the named memory sandbox, seed normal_logs.json."""

import asyncio
import json
import sys
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / ".env")
except ImportError:
    pass

from tensorlake.sandbox import AsyncSandbox

SANDBOX_NAME = "sentinelops-memory"
MEMORY_DIR = "/memory"

NORMAL_LOGS = [
    {"source": "DNS", "message": "Query: prod-api.corp.local → 10.0.1.12 (3ms)"},
    {"source": "HTTPS", "message": "GET api.internal:8080/health → 200 OK (11ms)"},
    {"source": "LDAP", "message": "Auth: svc-monitor@corp.local → ACCEPTED"},
    {"source": "FW", "message": "Outbound traffic within policy — no anomalies"},
    {"source": "IDS", "message": "No signatures matched in monitoring window"},
    {"source": "KERBEROS", "message": "TGT issued: svc-backup@CORP.LOCAL TTL=8h"},
    {"source": "NTP", "message": "Sync: time.corp.local drift=+2ms"},
    {"source": "SIEM", "message": "All correlation rules nominal — 0 alerts"},
]


async def main() -> None:
    import os
    sandbox_id = os.environ.get("TENSORLAKE_MEMORY_SANDBOX_ID")

    if sandbox_id:
        print(f"Connecting to existing sandbox '{sandbox_id}'...")
        sb = await AsyncSandbox.connect(sandbox_id)
    else:
        print(f"Creating named sandbox '{SANDBOX_NAME}'...")
        sb = await AsyncSandbox.create(name=SANDBOX_NAME)
        sandbox_id = sb.sandbox_id
        print(f"\nAdd this to .env:")
        print(f"TENSORLAKE_MEMORY_SANDBOX_ID={sandbox_id}")

    print("Creating /memory directory...")
    await sb.run("mkdir", ["-p", MEMORY_DIR])

    print("Seeding normal_logs.json...")
    await sb.write_file(
        f"{MEMORY_DIR}/normal_logs.json",
        json.dumps(NORMAL_LOGS, indent=2).encode("utf-8"),
    )

    print(f"\n✓ Sandbox ready: {sandbox_id}")


if __name__ == "__main__":
    asyncio.run(main())
