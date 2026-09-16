import hashlib
import secrets
import time
from typing import Annotated

from fastapi import Cookie, HTTPException, Request
from starlette.responses import Response

from module.database import Database

SESSION_COOKIE = "session"
SESSION_TIMEOUT = 3600


def generate_session_token() -> str:
    return secrets.token_urlsafe(32)


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def set_session(response: Response, token: str, secure: bool) -> None:
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        max_age=SESSION_TIMEOUT,
        path="/",
        secure=secure,
        httponly=True,
        samesite="strict",
    )


def delete_session(response: Response) -> None:
    response.delete_cookie(key=SESSION_COOKIE, path="/")


def clear_session(request: Request) -> None:
    request.state.__setattr__(SESSION_COOKIE, None)


async def require_session(
    request: Request,
    session_token: Annotated[str | None, Cookie(alias=SESSION_COOKIE)] = None,
) -> None:
    if not session_token:
        raise unauthorized()

    token_hash = hash_session_token(session_token)
    async with Database() as db:
        auth_session = await db.sessions.find_by_token_hash(token_hash)
        if auth_session is None:
            raise unauthorized()

        now = int(time.time())
        if auth_session.expires_at <= now:
            await db.sessions.delete(auth_session)
            await db.commit()
            raise unauthorized()

        auth_session.expires_at = now + SESSION_TIMEOUT
        await db.commit()

    request.state.__setattr__(SESSION_COOKIE, session_token)


def unauthorized() -> HTTPException:
    return HTTPException(status_code=401, detail="Unauthorized")
