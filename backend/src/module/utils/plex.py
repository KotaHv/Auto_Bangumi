import re
from pathlib import PurePosixPath, PureWindowsPath
from urllib.parse import urlsplit, urlunsplit

from module.models.plex import PlexResourceConnection


def plex_auth_url(client_identifier: str, code: str) -> str:
    return (
        "https://app.plex.tv/auth#?clientID="
        f"{client_identifier}&code={code}"
        "&context[device][product]=AutoBangumi"
    )


def build_plex_server_url(host: str, port: int, ssl: bool) -> str:
    return f"{'https' if ssl else 'http'}://{host}:{port}"


def loggable_plex_url(url: str) -> str:
    try:
        parsed = urlsplit(url)
    except ValueError:
        return "<invalid-url>"
    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, "", ""))


def _path_parts(path: str) -> tuple[PurePosixPath | PureWindowsPath, str] | None:
    is_windows = bool(re.match(r"^[A-Za-z]:[\\/]", path))
    if is_windows:
        normalized = path.replace("/", "\\").rstrip("\\")
        parts = normalized[3:].split("\\") if len(normalized) > 3 else []
        if any(part in {"", ".", ".."} for part in parts):
            return None
        parsed = PureWindowsPath(normalized)
        if not parsed.is_absolute() or not parsed.drive:
            return None
        return parsed, "windows"
    if not path.startswith("/") or path.startswith("//") or "\\" in path:
        return None
    normalized = path.rstrip("/")
    parts = normalized[1:].split("/") if normalized != "/" else []
    if any(part in {"", ".", ".."} for part in parts):
        return None
    parsed = PurePosixPath(normalized or "/")
    return parsed, "posix"


def map_library_path(
    save_path: str, downloader_path: str, plex_path: str
) -> str | None:
    source_info = _path_parts(save_path)
    root_info = _path_parts(downloader_path)
    destination_info = _path_parts(plex_path)
    if source_info is None or root_info is None or destination_info is None:
        return None
    source, source_flavor = source_info
    root, root_flavor = root_info
    destination, destination_flavor = destination_info
    if source_flavor != root_flavor or source == root or not destination.parts[1:]:
        return None
    try:
        relative = source.relative_to(root)
    except ValueError:
        return None
    if not relative.parts:
        return None
    mapped = (
        PureWindowsPath(destination, *relative.parts)
        if destination_flavor == "windows"
        else PurePosixPath(destination, *relative.parts)
    )
    return str(mapped)


def preferred_local_urls(connections: list[PlexResourceConnection]) -> list[str]:
    buckets: list[list[str]] = [[], [], [], []]
    for connection in connections:
        if not connection.local or connection.relay:
            continue
        index = (0 if connection.protocol == "https" else 2) + (
            1 if connection.ipv6 else 0
        )
        if connection.protocol in {"https", "http"}:
            buckets[index].append(connection.uri)
    return [url for bucket in buckets for url in bucket]
