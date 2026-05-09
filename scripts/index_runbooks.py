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


def index_document(content: str, metadata: dict) -> str:
    """POST a document to Nia /v2/contexts and return the context_id."""
    api_key = os.environ.get("NIA_API_KEY", "")
    if not api_key:
        raise RuntimeError("NIA_API_KEY not set")
    r = httpx.post(
        f"{NIA_BASE}/contexts",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={"content": content, "metadata": metadata},
        timeout=30,
    )
    r.raise_for_status()
    data = r.json()
    return data.get("contextId") or data.get("context_id") or str(data)


def main() -> None:
    """Index all .md runbooks into Nia and print confirmation."""
    runbooks = sorted(RUNBOOKS_DIR.glob("*.md"))
    if not runbooks:
        print(f"No .md files found in {RUNBOOKS_DIR}", file=sys.stderr)
        sys.exit(1)

    for path in runbooks:
        content = path.read_text(encoding="utf-8")
        metadata = {
            "type": "runbook",
            "title": path.stem,
            "filename": path.name,
            "domain": "cybersecurity",
        }
        try:
            context_id = index_document(content, metadata)
            print(f"[ok] {path.name} → context_id: {context_id}")
        except Exception as exc:
            print(f"[fail] {path.name}: {exc}", file=sys.stderr)


if __name__ == "__main__":
    main()
