"""Thin wrapper around the Tensorlake SDK for sandbox execution + durable memory."""

from __future__ import annotations

import os
from typing import Any

from agent.constants import ENV_KEYS


class TensorlakeClient:
    def __init__(self, api_key: str | None = None, project_id: str | None = None) -> None:
        self.api_key = api_key or os.environ.get(ENV_KEYS["TENSORLAKE_API_KEY"], "")
        self.project_id = project_id or os.environ.get(ENV_KEYS["TENSORLAKE_PROJECT_ID"], "")

    async def run_sandboxed(self, code: str, inputs: dict[str, Any]) -> dict[str, Any]:
        # TODO: integrate Tensorlake sandbox SDK
        _ = (self.api_key, self.project_id, code, inputs)
        return {"status": "stub"}
