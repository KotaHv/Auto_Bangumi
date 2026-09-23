from collections.abc import Iterator
from datetime import UTC, datetime, timedelta, timezone
from pathlib import Path

import pytest

from module.database.log import DEFAULT_LIMIT, MAX_LIMIT, LogDatabase
from module.exceptions import (
    InvalidLogLevel,
    InvalidLogLimit,
    InvalidLogTimeRange,
    LogQueryError,
    MissingTimezone,
)
from module.models.log import LogEntry
from module.utils.log_time import from_microseconds, to_microseconds

BASE = datetime(2026, 1, 1, 12, 0, 0, tzinfo=UTC)


@pytest.fixture
def logs(tmp_path: Path) -> Iterator[LogDatabase]:
    database = LogDatabase(path=tmp_path / "logs.db")
    try:
        yield database
    finally:
        database.dispose()


def add(
    database: LogDatabase,
    *,
    level_no: int,
    message: str,
    module: str = "module.test",
    offset: int = 0,
) -> int:
    entry = LogEntry(
        timestamp=to_microseconds(BASE) + offset,
        level_no=level_no,
        message=message,
        module=module,
        function="function",
        line=1,
    )
    database.add(entry)
    return entry.id or 0


def seed(database: LogDatabase) -> None:
    add(database, level_no=10, message="debug line", module="module.debug")
    add(database, level_no=20, message="info line", module="module.info")
    add(database, level_no=30, message="warning line", module="module.db.rss")
    add(database, level_no=40, message="error line", module="module.db.rss")
    add(database, level_no=50, message="critical line", module="module.core")


def test_empty_database_returns_empty_page(logs: LogDatabase):
    page = logs.query_logs()

    assert page.items == []
    assert page.next_cursor is None
    assert page.has_more is False


def test_latest_logs_empty_database_returns_empty_list(logs: LogDatabase):
    assert logs.query_latest_logs() == []


def test_latest_logs_returns_newest_window_oldest_first(logs: LogDatabase):
    ids = [add(logs, level_no=20, message=f"line {index}") for index in range(105)]

    items = logs.query_latest_logs()

    assert len(items) == DEFAULT_LIMIT
    assert [item.id for item in items] == ids[-DEFAULT_LIMIT:]


def test_logs_after_cursor_returns_incremental_batches_in_order(logs: LogDatabase):
    ids = [add(logs, level_no=20, message=f"line {index}") for index in range(5)]

    first = logs.query_logs_after(last_id=ids[0], limit=2)
    second = logs.query_logs_after(last_id=first.next_cursor or 0, limit=2)

    assert [item.id for item in first.items] == ids[1:3]
    assert first.has_more is True
    assert first.next_cursor == ids[2]
    assert [item.id for item in second.items] == ids[3:]
    assert second.has_more is False
    assert second.next_cursor is None


def test_latest_and_incremental_queries_share_exact_filters(logs: LogDatabase):
    ids = [
        add(logs, level_no=20, message="target", module="module.rss", offset=4_000_000),
        add(logs, level_no=40, message="target", module="module.rss", offset=5_000_000),
        add(
            logs, level_no=40, message="target", module="module.other", offset=6_000_000
        ),
        add(logs, level_no=40, message="other", module="module.rss", offset=7_000_000),
        add(logs, level_no=40, message="target", module="module.rss", offset=8_000_000),
    ]
    filters = {
        "level": "ERROR",
        "start": BASE + timedelta(seconds=4),
        "end": BASE + timedelta(seconds=9),
        "module": "rss",
        "query": "target",
    }

    initial = logs.query_latest_logs(**filters)
    incremental = logs.query_logs_after(last_id=ids[1], **filters)

    assert [item.id for item in initial] == [ids[1], ids[4]]
    assert [item.id for item in incremental.items] == [ids[4]]


def test_logs_after_reads_backlog_without_gaps(logs: LogDatabase):
    expected = [
        add(logs, level_no=20, message=f"line {index}")
        for index in range(MAX_LIMIT * 2 + 5)
    ]

    collected: list[int] = []
    cursor = 0
    while True:
        page = logs.query_logs_after(last_id=cursor)
        collected.extend(item.id for item in page.items)
        if not page.has_more:
            break
        assert page.next_cursor is not None
        cursor = page.next_cursor

    assert collected == expected


def test_items_are_ordered_newest_first(logs: LogDatabase):

    seed(logs)

    page = logs.query_logs()

    assert [item.level for item in page.items] == [
        "CRITICAL",
        "ERROR",
        "WARNING",
        "INFO",
        "DEBUG",
    ]
    assert page.has_more is False
    assert page.next_cursor is None


def test_next_cursor_is_only_set_when_more_pages_exist(logs: LogDatabase):
    for index in range(3):
        add(logs, level_no=20, message=f"line {index}")

    exhausted = logs.query_logs(limit=3)
    assert exhausted.has_more is False
    assert exhausted.next_cursor is None

    paged = logs.query_logs(limit=2)
    assert paged.has_more is True
    assert paged.next_cursor == paged.items[-1].id


def test_level_filter_is_exact_and_excludes_higher_levels(logs: LogDatabase):
    seed(logs)

    warnings = logs.query_logs(level="WARNING")

    assert [item.message for item in warnings.items] == ["warning line"]
    assert [item.level for item in warnings.items] == ["WARNING"]

    errors = logs.query_logs(level="ERROR")
    assert [item.level for item in errors.items] == ["ERROR"]


def test_level_filter_applies_before_limit(logs: LogDatabase):
    for index in range(5):
        add(logs, level_no=40, message=f"error {index}")
    for index in range(10):
        add(logs, level_no=20, message=f"info {index}")

    page = logs.query_logs(level="ERROR", limit=3)

    assert [item.message for item in page.items] == ["error 4", "error 3", "error 2"]
    assert page.has_more is True

    rest = logs.query_logs(level="ERROR", limit=3, before_id=page.next_cursor)
    assert [item.message for item in rest.items] == ["error 1", "error 0"]
    assert rest.has_more is False


def test_cursor_pagination_has_no_gaps_or_duplicates(logs: LogDatabase):
    expected = [add(logs, level_no=20, message=f"line {i}") for i in range(10)]

    collected: list[int] = []
    cursor = None
    while True:
        page = logs.query_logs(limit=3, before_id=cursor)
        collected.extend(item.id for item in page.items)
        if not page.has_more:
            break
        cursor = page.next_cursor

    assert collected == list(reversed(expected))
    assert len(collected) == len(set(collected))


def test_same_timestamp_is_ordered_by_id(logs: LogDatabase):
    ids = [add(logs, level_no=20, message=f"same {i}") for i in range(4)]

    page = logs.query_logs()

    assert [item.id for item in page.items] == list(reversed(ids))


def test_start_and_end_filter_timestamps(logs: LogDatabase):
    add(logs, level_no=20, message="old", offset=0)
    add(logs, level_no=20, message="middle", offset=5_000_000)
    add(logs, level_no=20, message="new", offset=10_000_000)

    start = BASE + timedelta(seconds=5)
    end = BASE + timedelta(seconds=5)

    assert [item.message for item in logs.query_logs(start=start).items] == [
        "new",
        "middle",
    ]
    # `end` is exclusive: the record exactly at `end` is not included.
    assert [item.message for item in logs.query_logs(end=end).items] == ["old"]
    assert [item.message for item in logs.query_logs(start=start, end=end).items] == []


def test_end_bound_is_exclusive(logs: LogDatabase):
    add(logs, level_no=20, message="at end", offset=5_000_000)
    add(logs, level_no=20, message="just before", offset=4_999_999)
    add(logs, level_no=20, message="after", offset=5_000_001)

    end = BASE + timedelta(seconds=5)
    page = logs.query_logs(end=end)

    assert [item.message for item in page.items] == ["just before"]


def test_naive_datetime_is_rejected(logs: LogDatabase):
    for naive in (BASE.replace(tzinfo=None),):
        with pytest.raises(MissingTimezone) as excinfo:
            logs.query_logs(start=naive)
        assert excinfo.value.msg_en == "timestamp must be timezone-aware"
        assert excinfo.value.msg_zh == "时间戳必须携带时区"
        with pytest.raises(MissingTimezone):
            logs.query_logs(end=naive)


def test_non_utc_aware_datetime_is_converted_to_utc(logs: LogDatabase):
    add(logs, level_no=20, message="utc stored")

    offset_zone = timezone(timedelta(hours=8))
    local_start = BASE.astimezone(offset_zone)

    page = logs.query_logs(start=local_start)

    assert [item.message for item in page.items] == ["utc stored"]


def test_module_and_query_filters_use_contains(logs: LogDatabase):
    seed(logs)

    assert [item.message for item in logs.query_logs(module="db.rss").items] == [
        "error line",
        "warning line",
    ]
    assert [item.message for item in logs.query_logs(query="line").items] == [
        "critical line",
        "error line",
        "warning line",
        "info line",
        "debug line",
    ]


def test_combined_filters(logs: LogDatabase):
    seed(logs)

    page = logs.query_logs(level="ERROR", module="rss", query="line")

    assert [item.message for item in page.items] == ["error line"]


def test_empty_string_filters_are_ignored(logs: LogDatabase):
    seed(logs)

    page = logs.query_logs(module="", query="")

    assert len(page.items) == 5


def test_wildcard_characters_are_matched_literally(logs: LogDatabase):
    add(logs, level_no=20, message="100% done")
    add(logs, level_no=20, message="100 done")
    add(logs, level_no=20, message="under_score")
    add(logs, level_no=20, message="underXscore")

    assert [item.message for item in logs.query_logs(query="100%").items] == [
        "100% done"
    ]
    assert [item.message for item in logs.query_logs(query="under_").items] == [
        "under_score"
    ]


def test_limit_outside_supported_range_is_rejected(logs: LogDatabase):
    with pytest.raises(InvalidLogLimit) as excinfo:
        logs.query_logs(limit=0)
    assert excinfo.value.msg_en == "limit must be between 1 and 500, got 0"
    assert excinfo.value.msg_zh == "limit 必须在 1 到 500 之间，收到 0"

    with pytest.raises(InvalidLogLimit):
        logs.query_logs(limit=MAX_LIMIT + 1)


def test_limit_accepts_the_supported_bounds(logs: LogDatabase):
    for index in range(MAX_LIMIT + 5):
        add(logs, level_no=20, message=f"line {index}")

    assert len(logs.query_logs(limit=1).items) == 1
    assert len(logs.query_logs(limit=MAX_LIMIT).items) == MAX_LIMIT
    assert len(logs.query_logs().items) == DEFAULT_LIMIT


def test_reversed_time_range_is_rejected(logs: LogDatabase):
    with pytest.raises(InvalidLogTimeRange) as excinfo:
        logs.query_logs(
            start=BASE + timedelta(seconds=1),
            end=BASE,
        )
    assert excinfo.value.msg_en == (
        "start (2026-01-01T12:00:01+00:00) must not be after end "
        "(2026-01-01T12:00:00+00:00)"
    )
    assert excinfo.value.msg_zh == (
        "开始时间 (2026-01-01T12:00:01+00:00) 不能晚于结束时间 "
        "(2026-01-01T12:00:00+00:00)"
    )


def test_timestamp_is_iso8601_with_timezone(logs: LogDatabase):
    add(logs, level_no=20, message="stamped")

    item = logs.query_logs().items[0]

    parsed = datetime.fromisoformat(item.timestamp)
    assert parsed.tzinfo is not None
    assert parsed == BASE


def test_record_exposes_all_structured_fields(logs: LogDatabase):
    add(logs, level_no=40, message="boom", module="module.db.rss")

    item = logs.query_logs().items[0]

    assert item.level == "ERROR"
    assert item.message == "boom"
    assert item.module == "module.db.rss"
    assert item.function == "function"
    assert item.line == 1
    assert item.exception is None


def test_unknown_level_name_is_rejected(logs: LogDatabase):
    with pytest.raises(InvalidLogLevel) as excinfo:
        logs.query_logs(level="NOT_A_LEVEL")
    assert excinfo.value.msg_en == "Unknown log level 'NOT_A_LEVEL'"
    assert excinfo.value.msg_zh == "未知的日志级别 'NOT_A_LEVEL'"

    with pytest.raises(InvalidLogLevel):
        logs.query_logs(level="warning")


def test_all_query_errors_share_a_base_class():
    assert issubclass(InvalidLogLevel, LogQueryError)
    assert issubclass(InvalidLogLimit, LogQueryError)
    assert issubclass(InvalidLogTimeRange, LogQueryError)
    assert issubclass(MissingTimezone, LogQueryError)
    assert not issubclass(LogQueryError, ValueError)


def test_microsecond_round_trip_is_exact_at_float_precision_boundary():
    for value in (0, 1, 999_999, 1_000_000, 2**53 - 1, 2**53, 2**53 + 1):
        assert to_microseconds(from_microseconds(value)) == value


def test_microsecond_round_trip_survives_full_date_range():
    for year in (1970, 2000, 2026, 2100):
        stamp = to_microseconds(datetime(year, 6, 15, 12, 34, 56, 789012, tzinfo=UTC))
        assert to_microseconds(from_microseconds(stamp)) == stamp
