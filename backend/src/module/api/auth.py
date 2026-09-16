import time
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, Form, HTTPException, Request, Response

from module.database import Database
from module.models import APIResponse
from module.models.user import UserUpdate
from module.security.session import (
    SESSION_COOKIE,
    SESSION_TIMEOUT,
    clear_session,
    delete_session,
    generate_session_token,
    hash_session_token,
    require_session,
    set_session,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=APIResponse)
async def login(
    request: Request,
    response: Response,
    username: Annotated[str, Form()],
    password: Annotated[str, Form()],
):
    async with Database() as db:
        user = await db.user.verify_credentials(username, password)
        if user is None:
            raise HTTPException(
                status_code=401,
                detail={
                    "msg_en": "Incorrect username or password.",
                    "msg_zh": "用户名或密码错误。",
                },
            )

        raw_token = generate_session_token()
        now = int(time.time())
        token_hash = hash_session_token(raw_token)
        await db.sessions.delete_expired(now)
        await db.sessions.create(
            token_hash=token_hash,
            created_at=now,
            expires_at=now + SESSION_TIMEOUT,
        )
        await db.commit()
    set_session(response, raw_token, request.url.scheme == "https")
    return {
        "status": True,
        "msg_en": "Login successfully.",
        "msg_zh": "登录成功。",
    }


@router.post("/logout", response_model=APIResponse)
async def logout(
    response: Response,
    session_token: Annotated[str | None, Cookie(alias=SESSION_COOKIE)] = None,
):
    if session_token:
        token_hash = hash_session_token(session_token)
        async with Database() as db:
            await db.sessions.delete_by_token_hash(token_hash)
            await db.commit()
    delete_session(response)
    return {
        "status": True,
        "msg_en": "Logout successfully.",
        "msg_zh": "登出成功。",
    }


@router.post(
    "/update",
    response_model=APIResponse,
    dependencies=[Depends(require_session)],
)
async def update_user(request: Request, response: Response, user_data: UserUpdate):
    async with Database() as db:
        await db.user.update_user(user_data)
        if user_data.password:
            await db.sessions.delete_all()
            delete_session(response)
            clear_session(request)
        await db.commit()
    return {
        "status": True,
        "msg_en": "Account updated successfully.",
        "msg_zh": "账户更新成功。",
    }
