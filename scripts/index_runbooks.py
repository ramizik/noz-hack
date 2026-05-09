#!/usr/bin/env python3
"""One-time script: index all runbooks from data/runbooks/ into Nia."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import httpx
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env.local")
load_dotenv(Path(__file__).parent.parent / ".env")

NIA_BASE = "https://apigcp.trynia.ai/v2"
RUNBOOKS_DIR = Path(__file__).parent.parent / "data" / "runbooks"


def index_document(title: str, summary: str, content: str, tags: list[str]) -> str:
    """POST a runbook to Nia /v2/contexts and return the response id."""
    api_key = os.environ.get("NIA_API_KEY", "")
    if not api_key:
        raise RuntimeError("NIA_API_KEY not set")
    r = httpx.post(
        f"{NIA_BASE}/contexts",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "title": title,
            "summary": summary,
            "content": content,
            "agent_source": "sentinelops",
            "tags": tags,
            "memory_type": "procedural",
        },
        timeout=30,
    )
    r.raise_for_status()
    data = r.json()
    return data.get("id") or data.get("contextId") or str(data)


def make_summary(filename: str) -> str:
    """Generate a short summary string from the runbook filename."""
    name = filename.replace("_", " ").replace(".md", "")
    return f"Cybersecurity incident response runbook: {name}"


def main() -> None:
    """Index all .md runbooks into Nia and print confirmation."""
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
            print(f"[ok] {path.name}  →  id: {result_id}")
        except Exception as exc:
            print(f"[fail] {path.name}: {exc}", file=sys.stderr)


if __name__ == "__main__":
    main()
