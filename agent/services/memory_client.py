"""Operational state in Tensorlake durable memory. Knowledge does NOT belong here."""

from __future__ import annotations

from typing import Any

from agent.constants import MEMORY_KEYS


class MemoryClient:
    def __init__(self, tensorlake) -> None:  # type: ignore[no-untyped-def]
        self._tl = tensorlake

    async def get(self, key: str) -> Any:
        # TODO: integrate Tensorlake SDK get
        _ = (self._tl, key)
        return None

    async def put(self, key: str, value: Any) -> None:
        # TODO: integrate Tensorlake SDK put
        _ = (self._tl, key, value)

    async def save_incident(self, incident_id: str, data: dict[str, Any]) -> None:
        await self.put(MEMORY_KEYS["INCIDENT_PREFIX"] + incident_id, data)

    async def get_incident(self, incident_id: str) -> dict[str, Any] | None:
        return await self.get(MEMORY_KEYS["INCIDENT_PREFIX"] + incident_id)
