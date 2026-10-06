from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Annotated, ClassVar, Literal, Self
from uuid import uuid4

from pydantic import BaseModel, JsonValue, StringConstraints, field_validator
from pydantic import Field as PydanticField
from sqlalchemy import BigInteger, Column
from sqlmodel import Field, SQLModel

from module.exceptions import PlexDiscoveryCode, PlexInputError
from module.utils.log_time import to_microseconds


class PinData(BaseModel):
    pin_id: int = PydanticField(validation_alias="id")
    code: str = PydanticField(min_length=1)
    expires_in: int = PydanticField(default=300, validation_alias="expiresIn")

    @field_validator("pin_id")
    @classmethod
    def validate_pin_id(cls, value: int) -> int:
        if value == 0:
            raise ValueError("PIN id must not be zero")
        return value

    @field_validator("expires_in", mode="before")
    @classmethod
    def normalize_expiry(cls, value: JsonValue) -> int:
        if not isinstance(value, int) or isinstance(value, bool):
            return 300
        return min(max(value, 1), 1800)


class PinAuthResponse(BaseModel):
    auth_token: str | None = PydanticField(validation_alias="authToken", repr=False)


class PlexLibraryResponse(BaseModel):
    id: int = PydanticField(gt=0)
    title: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    paths: list[str] = PydanticField(min_length=1)


class PlexResourceConnection(BaseModel):
    uri: str
    protocol: str
    local: bool
    relay: bool
    ipv6: bool = PydanticField(validation_alias="IPv6")


class PlexResource(BaseModel):
    provides: str
    client_identifier: str = PydanticField(validation_alias="clientIdentifier")
    name: str
    access_token: str = PydanticField(
        validation_alias="accessToken", min_length=1, repr=False
    )
    connections: list[PlexResourceConnection]


class PlexDiscoveryResult(BaseModel):
    libraries: list[PlexLibraryResponse]
    server_token: str = PydanticField(repr=False)

    def validate_library_path(self, section_id: int, path: str) -> None:
        if not any(
            library.id == section_id and path in library.paths
            for library in self.libraries
        ):
            raise PlexInputError("Selected Plex location is invalid")


class PlexLibraryDiscovery(PlexDiscoveryResult):
    url: str


class PlexConnectionDiscovery(PlexDiscoveryResult):
    server_identifier: str


@dataclass(frozen=True)
class PlexProbeSuccess:
    url: str
    libraries: list[PlexLibraryResponse]


@dataclass(frozen=True)
class PlexProbeFailure:
    url: str
    code: PlexDiscoveryCode


PlexProbeResult = PlexProbeSuccess | PlexProbeFailure


@dataclass(repr=False)
class PinAttempt:
    pin_id: int
    code: str
    expires_at: float
    status: Literal["pending", "completed"] = "pending"

    @classmethod
    def from_pin(cls, pin: PinData, *, now: float) -> Self:
        return cls(
            pin_id=pin.pin_id,
            code=pin.code,
            expires_at=now + pin.expires_in,
        )

    def is_expired(self, now: float) -> bool:
        return self.status == "pending" and now >= self.expires_at


@dataclass(repr=False)
class PlexAuthState:
    attempt: PinAttempt | None = None


class PlexServerAddress(BaseModel):
    host: str = Field(min_length=1)
    port: int = Field(ge=1, le=65535)
    ssl: bool


class LibrariesRequest(PlexServerAddress):
    pass


class ConnectionUpdate(PlexServerAddress):
    section_id: int
    path: str


class ConnectionEnabledUpdate(BaseModel):
    enabled: bool


class AuthStartResponse(BaseModel):
    auth_url: str


class AuthIdleResponse(BaseModel):
    status: Literal["idle"] = "idle"


class AuthPendingResponse(BaseModel):
    status: Literal["pending"] = "pending"
    auth_url: str


class AuthFinishedResponse(BaseModel):
    status: Literal["completed", "expired"]


type AuthStatusResponse = Annotated[
    AuthIdleResponse | AuthPendingResponse | AuthFinishedResponse,
    PydanticField(discriminator="status"),
]


class PlexConnectionState(BaseModel):
    connected: bool
    account_reauth_required: bool
    enabled: bool
    url: str
    server_identifier: str | None = None
    section_id: int | None
    path: str

    @classmethod
    def from_connection(cls, connection: PlexConnection | None) -> Self:
        if connection is None:
            return cls(
                connected=False,
                account_reauth_required=False,
                enabled=False,
                url="",
                section_id=None,
                path="",
            )
        return cls(
            connected=bool(connection.token),
            account_reauth_required=connection.account_reauth_required,
            enabled=connection.enabled,
            url=connection.url,
            server_identifier=connection.server_identifier,
            section_id=connection.section_id,
            path=connection.path,
        )


class PlexServer(BaseModel):
    id: str
    name: str


class PlexLibrariesResponse(BaseModel):
    url: str
    libraries: list[PlexLibraryResponse]


class PlexRefreshJob(SQLModel, table=True):
    __tablename__: ClassVar[str] = "plexrefreshjob"

    path: str = Field(primary_key=True)
    revision: str = Field(default_factory=lambda: str(uuid4()), nullable=False)
    created_at: int = Field(
        default_factory=lambda: to_microseconds(datetime.now(UTC)),
        sa_column=Column(BigInteger, nullable=False),
    )
    updated_at: int = Field(
        default_factory=lambda: to_microseconds(datetime.now(UTC)),
        sa_column=Column(BigInteger, nullable=False),
    )


class PlexConnection(SQLModel, table=True):
    id: int | None = Field(default=1, primary_key=True)
    client_identifier: str
    token: str | None = Field(default=None, repr=False)
    account_reauth_required: bool = Field(default=False)
    server_token: str | None = Field(default=None, repr=False)
    server_identifier: str | None = None
    url: str = ""
    section_id: int | None = None
    path: str = ""
    enabled: bool = False

    def disconnect(self) -> None:
        self.token = None
        self.account_reauth_required = False
        self.clear_configuration()

    def configure(
        self,
        *,
        url: str,
        section_id: int,
        path: str,
        server_token: str,
        server_identifier: str,
    ) -> bool:
        """Apply settings, enable the connection, and report refresh-relevant changes."""
        configuration_changed = (
            self.url,
            self.section_id,
            self.path,
            self.server_token,
            self.server_identifier,
        ) != (url, section_id, path, server_token, server_identifier)
        self.server_token = server_token
        self.server_identifier = server_identifier
        self.url = url
        self.section_id = section_id
        self.path = path
        self.enabled = True
        return configuration_changed

    def set_enabled(self, enabled: bool) -> None:
        if enabled and not self.is_configured:
            raise PlexInputError("Configure a Plex server and library before enabling")
        self.enabled = enabled

    def apply_server_recovery(self, *, url: str, server_token: str) -> None:
        self.url = url
        self.server_token = server_token

    def clear_configuration(self) -> None:
        self.account_reauth_required = False
        self.server_token = None
        self.server_identifier = None
        self.url = ""
        self.section_id = None
        self.path = ""
        self.enabled = False

    @property
    def is_configured(self) -> bool:
        return bool(
            self.token
            and self.server_token
            and self.url
            and self.section_id is not None
            and self.path
        )

    @property
    def auto_refresh_library_path(self) -> str | None:
        if self.enabled and self.is_configured:
            return self.path
        return None
