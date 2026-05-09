"""Knowledge retrieval against the Nia MCP server. No operational state lives here."""

from __future__ import annotations

import os
from typing import Any

from agent.constants import ENV_KEYS, NIA_QUERY_TEMPLATES


class NiaClient:
    def __init__(self, api_key: str | None = None, index_id: str | None = None) -> None:
        self.api_key = api_key or os.environ.get(ENV_KEYS["NIA_API_KEY"], "")
        self.index_id = index_id or os.environ.get(ENV_KEYS["NIA_INDEX_ID"], "")

    async def query(self, template_key: str, **params: Any) -> list[dict[str, Any]]:
        template = NIA_QUERY_TEMPLATES[template_key]
        prompt = template.format(**params)
        # TODO: wire MCP transport
        _ = (self.api_key, self.index_id, prompt)
        return []

    async def fetch_runbook(self, finding_type: str) -> dict[str, Any] | None:
        results = await self.query("RUNBOOK_FOR_FINDING", finding_type=finding_type)
        return results[0] if results else None
