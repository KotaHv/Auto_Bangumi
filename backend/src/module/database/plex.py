from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from module.models.plex import PlexConnection


class PlexDatabase:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get(self) -> PlexConnection | None:
        return (await self.session.exec(select(PlexConnection))).first()

    def create(self, client_identifier: str) -> PlexConnection:
        connection = PlexConnection(client_identifier=client_identifier)
        self.session.add(connection)
        return connection

    async def update(self, data: PlexConnection) -> None:
        self.session.add(data)
