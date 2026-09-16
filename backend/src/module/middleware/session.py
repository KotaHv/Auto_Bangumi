from fastapi import Request, Response
from starlette.middleware.base import RequestResponseEndpoint

from module.security.session import SESSION_COOKIE, set_session


async def renew_session(
    request: Request, call_next: RequestResponseEndpoint
) -> Response:
    response = await call_next(request)
    token = getattr(request.state, SESSION_COOKIE, None)
    if isinstance(token, str):
        set_session(response, token, request.url.scheme == "https")
    return response
