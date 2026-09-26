from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends
from sqlmodel.ext.asyncio.session import AsyncSession

from module.database.factory import session_factory


async def get_database() -> AsyncIterator[AsyncSession]:
    async with session_factory() as db:
        yield db


DatabaseDep = Annotated[AsyncSession, Depends(get_database)]
