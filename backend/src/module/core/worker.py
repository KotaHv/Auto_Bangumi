import asyncio
from collections.abc import Callable, Coroutine
from contextlib import suppress
from typing import Any


class WorkerGroup:
    """Run a set of worker coroutines in a task group until stopped."""

    def __init__(self):
        self._task: asyncio.Task | None = None

    async def _run(self, workers: list[Callable[[], Coroutine[Any, Any, None]]]):
        async with asyncio.TaskGroup() as tg:
            for worker in workers:
                tg.create_task(worker())
            # Keep the group alive until the driver task is cancelled.
            await asyncio.Future()

    def start(self, workers: list[Callable[[], Coroutine[Any, Any, None]]]):
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self._run(workers))

    async def stop(self):
        if self._task is not None and not self._task.done():
            self._task.cancel()
            with suppress(asyncio.CancelledError):
                await self._task
            self._task = None

    @property
    def is_running(self) -> bool:
        return self._task is not None and not self._task.done()
