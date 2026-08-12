import asyncio

from fastapi import HTTPException
from sqlalchemy import text
from sqlmodel import SQLModel, select
from sqlmodel.ext.asyncio.session import AsyncSession

from module.models import ResponseModel
from module.models.user import User, UserUpdate
from module.security.jwt import get_password_hash, verify_password


class UserDatabase:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_user(self, username):
        statement = select(User).where(User.username == username)
        result = (await self.session.exec(statement)).first()
        if not result:
            raise HTTPException(status_code=404, detail="User not found")
        return result

    async def auth_user(self, user: User):
        statement = select(User).where(User.username == user.username)
        result = (await self.session.exec(statement)).first()
        if not user.password:
            return ResponseModel(
                status_code=401,
                status=False,
                msg_en="Incorrect password format",
                msg_zh="密码格式不正确",
            )
        if not result:
            return ResponseModel(
                status_code=401,
                status=False,
                msg_en="User not found",
                msg_zh="用户不存在",
            )
        if not await asyncio.to_thread(verify_password, user.password, result.password):
            return ResponseModel(
                status_code=401,
                status=False,
                msg_en="Incorrect password",
                msg_zh="密码错误",
            )
        return ResponseModel(
            status_code=200, status=True, msg_en="Login successfully", msg_zh="登录成功"
        )

    async def update_user(self, username, update_user: UserUpdate):
        # Update username and password
        statement = select(User).where(User.username == username)
        result = (await self.session.exec(statement)).first()
        if not result:
            raise HTTPException(status_code=404, detail="User not found")
        if update_user.username:
            result.username = update_user.username
        if update_user.password:
            result.password = await asyncio.to_thread(
                get_password_hash, update_user.password
            )
        self.session.add(result)
        await self.session.commit()
        return result

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

    async def add_default_user(self):
        # Check if user exists
        statement = select(User)
        try:
            result = (await self.session.exec(statement)).all()
        except Exception:
            await self.merge_old_user()
            result = (await self.session.exec(statement)).all()
        if len(result) != 0:
            return
        # Add default user
        user = User(
            username="admin",
            password=await asyncio.to_thread(get_password_hash, "adminadmin"),
        )
        self.session.add(user)
        await self.session.commit()
