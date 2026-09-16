import asyncio

from sqlalchemy import text
from sqlmodel import SQLModel, select
from sqlmodel.ext.asyncio.session import AsyncSession

from module.models.user import User, UserUpdate
from module.security.password import get_password_hash, verify_password


class UserDatabase:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def verify_credentials(self, username: str, password: str) -> User | None:
        user = (
            await self.session.exec(select(User).where(User.username == username))
        ).first()
        if user is None or not password:
            return None
        if not await asyncio.to_thread(verify_password, password, user.password):
            return None
        return user

    async def update_user(self, update_user: UserUpdate) -> User:
        user = (await self.session.exec(select(User))).first()
        if user is None:
            raise RuntimeError("Default user is missing")
        if update_user.username:
            user.username = update_user.username
        if update_user.password:
            user.password = await asyncio.to_thread(
                get_password_hash, update_user.password
            )
        return user

    async def merge_old_user(self):
        # get old data
        statement = """
        SELECT * FROM user
        """
        # sqlmodel exec() overloads don't accept TextClause, but it works at runtime
        result = (
            (
                await self.session.exec(text(statement))  # type: ignore[reportCallIssue, reportArgumentType]
            )
            .mappings()
            .first()
        )
        if not result:
            return
        # add new data
        user = User(username=result["username"], password=result["password"])
        # Drop old table
        statement = """
        DROP TABLE user
        """
        # sqlmodel exec() overloads don't accept TextClause, but it works at runtime
        await self.session.exec(text(statement))  # type: ignore[reportCallIssue, reportArgumentType]
        # Recreate the user table from the SQLModel metadata instead of
        # hardcoding DDL that can drift from the model definition.
        await self.session.run_sync(
            lambda sync_session: SQLModel.metadata.create_all(sync_session.get_bind())
        )
        self.session.add(user)
        await self.session.commit()

    async def ensure_default_user(self) -> bool:
        # Check if user exists
        statement = select(User)
        try:
            result = (await self.session.exec(statement)).all()
        except Exception:
            await self.merge_old_user()
            result = (await self.session.exec(statement)).all()
        if len(result) != 0:
            return False
        # Add default user
        user = User(
            username="admin",
            password=await asyncio.to_thread(get_password_hash, "adminadmin"),
        )
        self.session.add(user)
        await self.session.commit()
        return True
