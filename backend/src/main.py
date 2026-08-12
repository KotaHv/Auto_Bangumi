import os

import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from loguru import logger
from qbittorrentapi.exceptions import (
    APIConnectionError,
    Conflict409Error,
    Forbidden403Error,
    LoginFailed,
    Unauthorized401Error,
)
from requests.exceptions import ConnectionError as RequestsConnectionError

from module.api import v1
from module.conf import VERSION, settings, setup_logger

setup_logger(reset=True)

# Order matters: LoginFailed/Forbidden403Error/etc. all inherit from
# APIConnectionError, so specific subclasses must come first.
ERROR_MESSAGES: tuple[tuple[type[Exception], str, str], ...] = (
    (
        LoginFailed,
        "Failed to log in to the downloader. Check username/password or API key.",
        "下载器登录失败,请检查用户名/密码或 API Key。",
    ),
    (
        Unauthorized401Error,
        "Downloader authentication failed. Check the API key.",
        "下载器认证失败,请检查 API Key。",
    ),
    (
        Forbidden403Error,
        "Downloader refused access (IP may be banned).",
        "下载器拒绝访问(IP 可能被封禁)。",
    ),
    (
        Conflict409Error,
        "Downloader rejected the operation (resource conflict).",
        "下载器拒绝了操作(资源冲突)。",
    ),
    (
        APIConnectionError,
        "Failed to connect to the downloader.",
        "无法连接下载器。",
    ),
    (
        RequestsConnectionError,
        "Network connection failed.",
        "网络连接失败。",
    ),
)


def _downloader_error_handler(msg_en: str, msg_zh: str):
    async def handler(_request: Request, exc: Exception):
        logger.warning("Handled downloader error {}: {}", type(exc).__name__, exc)
        return JSONResponse(
            status_code=406,
            content={"msg_en": msg_en, "msg_zh": msg_zh},
        )

    return handler


def create_app() -> FastAPI:
    app = FastAPI()

    @app.exception_handler(HTTPException)
    async def http_exception_handler(_request: Request, exc: HTTPException):
        if isinstance(exc.detail, dict):
            content = exc.detail
        else:
            content = {"msg_en": str(exc.detail), "msg_zh": str(exc.detail)}
        return JSONResponse(status_code=exc.status_code, content=content)

    for exc_type, msg_en, msg_zh in ERROR_MESSAGES:
        app.add_exception_handler(exc_type, _downloader_error_handler(msg_en, msg_zh))

    # mount routers
    app.include_router(v1, prefix="/api")

    return app


app = create_app()


@app.get("/posters/{path:path}", tags=["posters"])
def posters(path: str):
    return FileResponse(f"data/posters/{path}")


if VERSION != "DEV_VERSION":
    app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")
    app.mount("/images", StaticFiles(directory="dist/images"), name="images")
    # app.mount("/icons", StaticFiles(directory="dist/icons"), name="icons")
    templates = Jinja2Templates(directory="dist")

    @app.get("/{path:path}")
    def html(request: Request, path: str):
        files = os.listdir("dist")
        if path in files:
            return FileResponse(f"dist/{path}")
        else:
            context = {"request": request}
            return templates.TemplateResponse(request, "index.html", context)

else:

    @app.get("/", status_code=302, tags=["html"])
    def index():
        return RedirectResponse("/docs")


if __name__ == "__main__":
    if os.getenv("IPV6"):
        host = "::"
    else:
        host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run(
        app,
        host=host,
        port=settings.program.webui_port,
        log_config=None,
    )
