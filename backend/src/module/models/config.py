from os.path import expandvars
from typing import Annotated

from pydantic import AfterValidator, BaseModel, Field

ExpandedString = Annotated[str, AfterValidator(lambda x: expandvars(x))]


class Program(BaseModel):
    rss_time: int = Field(900, description="Sleep time")
    rename_time: int = Field(60, description="Rename times in one loop")
    webui_port: int = Field(7892, description="WebUI port")


class Downloader(BaseModel):
    type: str = Field("qbittorrent", description="Downloader type")
    host: ExpandedString = Field("172.17.0.1:8080", description="Downloader host")
    username: ExpandedString = Field("admin", description="Downloader username")
    password: ExpandedString = Field("adminadmin", description="Downloader password")
    path: str = Field("/downloads/Bangumi", description="Downloader path")
    ssl: bool = Field(False, description="Downloader ssl")


class RSSParser(BaseModel):
    enable: bool = Field(True, description="Enable RSS parser")
    filter: list[str] = Field(["720", r"\d+-\d"], description="Filter")
    language: str = "zh"


class BangumiManage(BaseModel):
    enable: bool = Field(True, description="Enable bangumi manage")
    eps_complete: bool = Field(False, description="Enable eps complete")
    rename_method: str = Field("pn", description="Rename method")
    group_tag: bool = Field(False, description="Enable group tag")
    remove_bad_torrent: bool = Field(False, description="Remove bad torrent")
    retain_latest_media_version: bool = Field(
        False, description="Remove older versions and keep only the latest version"
    )


class Log(BaseModel):
    debug_enable: bool = Field(False, description="Enable debug")


class Proxy(BaseModel):
    enable: bool = Field(False, description="Enable proxy")
    type: str = Field("http", description="Proxy type")
    host: str = Field("", description="Proxy host")
    port: int = Field(0, description="Proxy port")
    username: ExpandedString = Field("", description="Proxy username")
    password: ExpandedString = Field("", description="Proxy password")


class Notification(BaseModel):
    enable: bool = Field(False, description="Enable notification")
    type: str = Field("telegram", description="Notification type")
    token: ExpandedString = Field("", description="Notification token")
    chat_id: ExpandedString = Field("", description="Notification chat id")


class ExperimentalOpenAI(BaseModel):
    enable: bool = Field(False, description="Enable experimental OpenAI")
    api_key: str = Field("", description="OpenAI api key")
    base_url: Annotated[
        str,
        AfterValidator(
            lambda x: (
                "https://api.openai.com/v1" if x == "https://api.openai.com/" else x
            )
        ),
    ] = Field("https://api.openai.com/v1", description="OpenAI api base url")
    model: str = Field("gpt-4o-mini", description="OpenAI model")


class Config(BaseModel):
    program: Program = Program()
    downloader: Downloader = Downloader()
    rss_parser: RSSParser = RSSParser()
    bangumi_manage: BangumiManage = BangumiManage()
    log: Log = Log()
    proxy: Proxy = Proxy()
    notification: Notification = Notification()
    experimental_openai: ExperimentalOpenAI = ExperimentalOpenAI()
