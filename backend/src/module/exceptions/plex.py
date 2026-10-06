from typing import Literal


class PlexError(Exception):
    def __init__(self, message: str = "Plex operation failed") -> None:
        super().__init__(message)


class PlexInputError(PlexError):
    def __init__(self, message: str = "Invalid Plex input") -> None:
        super().__init__(message)


class PlexUpstreamError(PlexError):
    pass


class PlexStaleAddressError(PlexUpstreamError):
    def __init__(self, reason: str = "Plex address may be stale") -> None:
        super().__init__(reason)


class PlexResponseError(PlexUpstreamError):
    def __init__(self) -> None:
        super().__init__("Invalid Plex response")


PlexDiscoveryCode = Literal[
    "plex_unavailable",
    "authorization_expired",
    "server_unreachable",
    "server_unrecognized",
    "server_token_invalid",
    "invalid_response",
    "no_reachable_connection",
]


class PlexDiscoveryError(PlexUpstreamError):
    def __init__(self, code: PlexDiscoveryCode):
        super().__init__(code)
        self.code: PlexDiscoveryCode = code
