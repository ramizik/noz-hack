#!/usr/bin/env python3
"""One-time script: index all runbooks from data/runbooks/ into Nia."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import httpx
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")
load_dotenv(Path(__file__).parent.parent / ".env.local")

NIA_BASE = "https://apigcp.trynia.ai/v2"
RUNBOOKS_DIR = Path(__file__).parent.parent / "data" / "runbooks"


def nia_api_key() -> str:
    """Return the configured Nia API key."""
    api_key = os.environ.get("NIA_API_KEY", "")
    if not api_key:
        raise RuntimeError("NIA_API_KEY not set")
    return api_key


def check_auth() -> None:
    """Fail fast if the configured Nia API key is invalid."""
    r = httpx.get(
        f"{NIA_BASE}/contexts/semantic-search",
        headers={"Authorization": f"Bearer {nia_api_key()}"},
        params={"q": "sentinelops auth check", "limit": 1},
        timeout=30,
    )
    if r.status_code == 401:
        raise RuntimeError("NIA_API_KEY was rejected by Nia. Check .env before indexing.")
    r.raise_for_status()


def index_document(title: str, summary: str, content: str, tags: list[str]) -> str:
    """POST a runbook to Nia /v2/contexts and return the response id."""
    payload = {
        "title": title,
        "summary": summary,
        "content": content,
        "agent_source": "sentinelops",
        "tags": tags,
        "memory_type": "procedural",
    }
    headers = {
        "Authorization": f"Bearer {nia_api_key()}",
        "Content-Type": "application/json",
    }

    last_exc: Exception | None = None
    for _ in range(2):
        try:
            r = httpx.post(
                f"{NIA_BASE}/contexts",
                headers=headers,
                json=payload,
                timeout=90,
            )
            break
        except httpx.ReadTimeout as exc:
            last_exc = exc
    else:
        raise last_exc or RuntimeError("Nia index request timed out")

    r.raise_for_status()
    data = r.json()
    return data.get("id") or data.get("contextId") or str(data)


def make_summary(filename: str) -> str:
    """Generate a short summary string from the runbook filename."""
    name = filename.replace("_", " ").replace(".md", "")
    return f"Cybersecurity incident response runbook: {name}"


def main() -> None:
    """Index all .md runbooks into Nia and print confirmation."""
    check_auth()

    runbooks = sorted(RUNBOOKS_DIR.glob("*.md"))
    if not runbooks:
        print(f"No .md files found in {RUNBOOKS_DIR}", file=sys.stderr)
        sys.exit(1)

    for path in runbooks:
        content = path.read_text(encoding="utf-8")
        title = path.stem.replace("_", " ").title()
        summary = make_summary(path.name)
        tags = ["runbook", "cybersecurity", path.stem]
        try:
            result_id = index_document(title, summary, content, tags)
            print(f"[ok] {path.name} -> id: {result_id}")
        except Exception as exc:
            print(f"[fail] {path.name}: {exc}", file=sys.stderr)


if __name__ == "__main__":
    main()
