from typing import Annotated

from fastapi import Cookie, HTTPException, Request
from starlette.responses import Response

from module.database.deps import DatabaseDep
from module.security.token import (
    SESSION_TIMEOUT,
    generate_session_token,
    hash_session_token,
)
from module.service.auth import AuthService

SESSION_COOKIE = "session"

__all__ = [
    "SESSION_COOKIE",
    "SESSION_TIMEOUT",
    "clear_session",
    "delete_session",
    "generate_session_token",
    "hash_session_token",
    "require_session",
    "set_session",
    "unauthorized",
]


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
    db: DatabaseDep,
    session_token: Annotated[str | None, Cookie(alias=SESSION_COOKIE)] = None,
) -> None:
    if not session_token or not await AuthService(db).validate_session(session_token):
        raise unauthorized()

    request.state.__setattr__(SESSION_COOKIE, session_token)


def unauthorized() -> HTTPException:
    return HTTPException(status_code=401, detail="Unauthorized")
