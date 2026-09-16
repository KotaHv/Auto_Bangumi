from sqlmodel import col, delete, select
from sqlmodel.ext.asyncio.session import AsyncSession

from module.models import AuthSession


class SessionDatabase:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(
        self,
        token_hash: str,
        created_at: int,
        expires_at: int,
    ) -> AuthSession:
        session = AuthSession(
            token_hash=token_hash,
            created_at=created_at,
            expires_at=expires_at,
        )
        self.session.add(session)
        return session

    async def find_by_token_hash(self, token_hash: str) -> AuthSession | None:
        return (
            await self.session.exec(
                select(AuthSession).where(col(AuthSession.token_hash) == token_hash)
            )
        ).first()

    async def delete(self, session: AuthSession) -> None:
        await self.session.delete(session)

    async def delete_by_token_hash(self, token_hash: str) -> None:
        await self.session.exec(
            delete(AuthSession).where(col(AuthSession.token_hash) == token_hash)
        )

    async def delete_expired(self, now: int) -> None:
        await self.session.exec(
            delete(AuthSession).where(col(AuthSession.expires_at) <= now)
        )

    async def delete_all(self) -> None:
        await self.session.exec(delete(AuthSession))
