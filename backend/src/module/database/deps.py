from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends

from module.database import Database


async def get_database() -> AsyncIterator[Database]:
    async with Database() as db:
        yield db


DatabaseDep = Annotated[Database, Depends(get_database, scope="function")]
