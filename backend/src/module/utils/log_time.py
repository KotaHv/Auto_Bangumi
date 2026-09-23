import calendar
from datetime import UTC, datetime

from module.exceptions import MissingTimezone


def to_microseconds(value: datetime) -> int:
    if value.tzinfo is None:
        raise MissingTimezone()
    utc_value = value.astimezone(UTC)
    return calendar.timegm(utc_value.utctimetuple()) * 1_000_000 + utc_value.microsecond


def from_microseconds(value: int) -> datetime:
    seconds, microseconds = divmod(value, 1_000_000)
    return datetime.fromtimestamp(seconds, tz=UTC).replace(microsecond=microseconds)
