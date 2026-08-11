from os.path import expandvars
from typing import Annotated

from pydantic import AfterValidator, BaseModel, Field

ExpandedString = Annotated[str, AfterValidator(lambda x: expandvars(x))]


class Program(BaseModel):
    rss_time: Annotated[int, Field(description="Sleep time")] = 900
    rename_time: Annotated[int, Field(description="Rename times in one loop")] = 60
    webui_port: Annotated[int, Field(description="WebUI port")] = 7892


class Downloader(BaseModel):
    host: Annotated[ExpandedString, Field(description="Downloader host")] = (
        "172.17.0.1:8080"
    )
    username: Annotated[ExpandedString, Field(description="Downloader username")] = (
        "admin"
    )
    password: Annotated[ExpandedString, Field(description="Downloader password")] = (
        "adminadmin"
    )
    path: Annotated[str, Field(description="Downloader path")] = "/downloads/Bangumi"
    ssl: Annotated[bool, Field(description="Downloader ssl")] = False


class RSSParser(BaseModel):
    enable: Annotated[bool, Field(description="Enable RSS parser")] = True
    filter: Annotated[list[str], Field(description="Filter")] = [
        "720",
        r"\d+-\d",
    ]
    language: str = "zh"


class BangumiManage(BaseModel):
    enable: Annotated[bool, Field(description="Enable bangumi manage")] = True
    eps_complete: Annotated[bool, Field(description="Enable eps complete")] = False
    rename_method: Annotated[str, Field(description="Rename method")] = "pn"
    group_tag: Annotated[bool, Field(description="Enable group tag")] = False
    remove_bad_torrent: Annotated[bool, Field(description="Remove bad torrent")] = False
    retain_latest_media_version: Annotated[
        bool,
        Field(description="Remove older versions and keep only the latest version"),
    ] = False


class Log(BaseModel):
    debug_enable: Annotated[bool, Field(description="Enable debug")] = False


class Proxy(BaseModel):
    enable: Annotated[bool, Field(description="Enable proxy")] = False
    type: Annotated[str, Field(description="Proxy type")] = "http"
    host: Annotated[str, Field(description="Proxy host")] = ""
    port: Annotated[int, Field(description="Proxy port")] = 0
    username: Annotated[ExpandedString, Field(description="Proxy username")] = ""
    password: Annotated[ExpandedString, Field(description="Proxy password")] = ""


class Notification(BaseModel):
    enable: Annotated[bool, Field(description="Enable notification")] = False
    type: Annotated[str, Field(description="Notification type")] = "telegram"
    token: Annotated[ExpandedString, Field(description="Notification token")] = ""
    chat_id: Annotated[ExpandedString, Field(description="Notification chat id")] = ""


class ExperimentalOpenAI(BaseModel):
    enable: Annotated[bool, Field(description="Enable experimental OpenAI")] = False
    api_key: Annotated[str, Field(description="OpenAI api key")] = ""
    base_url: Annotated[
        str,
        AfterValidator(
            lambda x: (
                "https://api.openai.com/v1" if x == "https://api.openai.com/" else x
            )
        ),
        Field(description="OpenAI api base url"),
    ] = "https://api.openai.com/v1"
    model: Annotated[str, Field(description="OpenAI model")] = "gpt-5.6-luna"


class Config(BaseModel):
    program: Program = Program()
    downloader: Downloader = Downloader()
    rss_parser: RSSParser = RSSParser()
    bangumi_manage: BangumiManage = BangumiManage()
    log: Log = Log()
    proxy: Proxy = Proxy()
    notification: Notification = Notification()
    experimental_openai: ExperimentalOpenAI = ExperimentalOpenAI()
