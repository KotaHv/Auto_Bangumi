from fastapi import Request, Response
from starlette.datastructures import URL
from starlette.middleware.base import RequestResponseEndpoint
from starlette.responses import JSONResponse

API_PREFIX = "/api"
Origin = tuple[str, str, int]


async def enforce_same_origin(
    request: Request, call_next: RequestResponseEndpoint
) -> Response:
    path = request.scope["path"]
    if (path == API_PREFIX or path.startswith(f"{API_PREFIX}/")) and not _passes_origin_check(
        request
    ):
        return JSONResponse(status_code=403, content={"detail": "Forbidden"})
    return await call_next(request)


def _passes_origin_check(request: Request) -> bool:
    request_origin = _request_origin(request)

    origin = request.headers.get("origin")
    if origin is not None:
        return _parse_origin(origin) == request_origin

    referer = request.headers.get("referer")
    if referer is not None:
        return _parse_referer(referer) == request_origin

    fetch_site = request.headers.get("sec-fetch-site")
    if fetch_site is not None:
        return fetch_site.lower() in {"same-origin", "none"}

    return True


def _parse_origin(value: str) -> Origin | None:
    try:
        parsed = URL(value)
    except ValueError:
        return None
    if parsed.path not in {"", "/"} or parsed.query or parsed.fragment:
        return None
    return _origin_from_url(parsed)


def _parse_referer(value: str) -> Origin | None:
    try:
        parsed = URL(value)
    except ValueError:
        return None
    return _origin_from_url(parsed)


def _origin_from_url(parsed: URL) -> Origin | None:
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        return None
    try:
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
    except ValueError:
        return None
    return (parsed.scheme, parsed.hostname, port)


def _request_origin(request: Request) -> Origin | None:
    hostname = request.url.hostname
    if not hostname:
        return None
    return (
        request.url.scheme,
        hostname,
        request.url.port or (443 if request.url.scheme == "https" else 80),
    )
