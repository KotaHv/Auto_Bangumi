from module.database.factory import session_factory
from module.service.auth import AuthService


async def ensure_default_user() -> bool:
    async with session_factory() as db:
        return await AuthService(db).ensure_default_user()
