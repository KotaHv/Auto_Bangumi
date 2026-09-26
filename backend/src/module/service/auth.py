import asyncio
import time

from sqlmodel.ext.asyncio.session import AsyncSession

from module.database.session import SessionDatabase
from module.database.user import UserDatabase
from module.models.user import User, UserUpdate
from module.security.password import get_password_hash
from module.security.token import (
    SESSION_TIMEOUT,
    generate_session_token,
    hash_session_token,
)


class AuthService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.user = UserDatabase(session)
        self.sessions = SessionDatabase(session)

    async def ensure_default_user(self) -> bool:
        try:
            user_exists = await self.user.user_exists()
        except Exception:
            await self.user.merge_old_user()
            user_exists = await self.user.user_exists()

        if not user_exists:
            self.user.add_user(
                User(
                    username="admin",
                    password=await asyncio.to_thread(get_password_hash, "adminadmin"),
                )
            )
        await self.session.commit()
        return not user_exists

    async def login(self, username: str, password: str) -> str | None:
        user = await self.user.verify_credentials(username, password)
        if user is None:
            return None

        raw_token = generate_session_token()
        now = int(time.time())
        await self.sessions.delete_expired(now)
        await self.sessions.create(
            token_hash=hash_session_token(raw_token),
            created_at=now,
            expires_at=now + SESSION_TIMEOUT,
        )
        await self.session.commit()
        return raw_token

    async def validate_session(self, raw_token: str) -> bool:
        auth_session = await self.sessions.find_by_token_hash(
            hash_session_token(raw_token)
        )
        if auth_session is None:
            return False

        now = int(time.time())
        if auth_session.expires_at <= now:
            await self.sessions.delete(auth_session)
            await self.session.commit()
            return False

        auth_session.expires_at = now + SESSION_TIMEOUT
        await self.session.commit()
        return True

    async def logout(self, raw_token: str | None) -> None:
        if raw_token:
            await self.sessions.delete_by_token_hash(hash_session_token(raw_token))
            await self.session.commit()

    async def update_user(self, user_data: UserUpdate) -> None:
        await self.user.update_user(user_data)
        if user_data.password:
            await self.sessions.delete_all()
        await self.session.commit()
