"""Agent entrypoint. Plan -> execute -> reflect -> recover loop."""

from __future__ import annotations

import asyncio

from agent.constants import CYCLE_INTERVALS, MEMORY_KEYS
from agent.services import MemoryClient, NiaClient, TensorlakeClient


async def cycle(memory: MemoryClient, nia: NiaClient, tensorlake: TensorlakeClient) -> None:
    # TODO: poll alerts, plan response, execute via Tensorlake, write memory
    await memory.put(MEMORY_KEYS["AGENT_HEALTH"], {"status": "ok"})
    _ = (nia, tensorlake)


async def main() -> None:
    tensorlake = TensorlakeClient()
    memory = MemoryClient(tensorlake)
    nia = NiaClient()

    while True:
        try:
            await cycle(memory, nia, tensorlake)
        except Exception:
            # TODO: structured error logging + escalation
            pass
        await asyncio.sleep(CYCLE_INTERVALS["POLL_SECONDS"])


if __name__ == "__main__":
    asyncio.run(main())
