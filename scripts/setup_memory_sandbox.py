#!/usr/bin/env python3
"""One-time setup: create the named memory sandbox and print its ID for .env."""

import asyncio
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


async def main() -> None:
    print(f"Creating named sandbox '{SANDBOX_NAME}'...")
    sb = await AsyncSandbox.create(name=SANDBOX_NAME)
    sandbox_id = sb.sandbox_id

    print("Creating /memory directory...")
    result = await sb.run("mkdir", ["-p", MEMORY_DIR])
    if result.stdout:
        print(result.stdout)

    print(f"\n✓ Sandbox ready: {sandbox_id}")
    print(f"\nAdd this to .env:")
    print(f"TENSORLAKE_MEMORY_SANDBOX_ID={sandbox_id}")


if __name__ == "__main__":
    asyncio.run(main())
