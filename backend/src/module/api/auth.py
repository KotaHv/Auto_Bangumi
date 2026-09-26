from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, Form, HTTPException, Request, Response

from module.models import APIResponse
from module.models.user import UserUpdate
from module.security.session import (
    SESSION_COOKIE,
    clear_session,
    delete_session,
    require_session,
    set_session,
)
from module.service.auth import AuthService

from .deps import DatabaseDep

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=APIResponse)
async def login(
    request: Request,
    response: Response,
    username: Annotated[str, Form()],
    password: Annotated[str, Form()],
    db: DatabaseDep,
):
    raw_token = await AuthService(db).login(username, password)
    if raw_token is None:
        raise HTTPException(
            status_code=401,
            detail={
                "msg_en": "Incorrect username or password.",
                "msg_zh": "用户名或密码错误。",
            },
        )

    set_session(response, raw_token, request.url.scheme == "https")
    return {
        "status": True,
        "msg_en": "Login successfully.",
        "msg_zh": "登录成功。",
    }


@router.post("/logout", response_model=APIResponse)
async def logout(
    response: Response,
    db: DatabaseDep,
    session_token: Annotated[str | None, Cookie(alias=SESSION_COOKIE)] = None,
):
    await AuthService(db).logout(session_token)
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
async def update_user(
    request: Request, response: Response, user_data: UserUpdate, db: DatabaseDep
):
    await AuthService(db).update_user(user_data)
    if user_data.password:
        delete_session(response)
        clear_session(request)
    return {
        "status": True,
        "msg_en": "Account updated successfully.",
        "msg_zh": "账户更新成功。",
    }
