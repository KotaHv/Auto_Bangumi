from module.database import Database
from module.service.auth import AuthService


async def ensure_default_user() -> bool:
    async with Database() as db:
        return await AuthService(db).ensure_default_user()
