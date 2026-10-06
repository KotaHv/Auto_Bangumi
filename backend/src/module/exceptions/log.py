from datetime import datetime


class LogQueryError(Exception):
    def __init__(self, msg_en: str, msg_zh: str) -> None:
        super().__init__(msg_en)
        self.msg_en = msg_en
        self.msg_zh = msg_zh


class InvalidLogLevel(LogQueryError):
    def __init__(self, level: str) -> None:
        super().__init__(
            f"Unknown log level {level!r}",
            f"未知的日志级别 {level!r}",
        )


class InvalidLogLimit(LogQueryError):
    def __init__(self, limit: int, maximum: int) -> None:
        super().__init__(
            f"limit must be between 1 and {maximum}, got {limit}",
            f"limit 必须在 1 到 {maximum} 之间，收到 {limit}",
        )


class InvalidLogTimeRange(LogQueryError):
    def __init__(self, start: datetime, end: datetime) -> None:
        super().__init__(
            f"start ({start.isoformat()}) must not be after end ({end.isoformat()})",
            f"开始时间 ({start.isoformat()}) 不能晚于结束时间 ({end.isoformat()})",
        )


class MissingTimezone(LogQueryError):
    def __init__(self) -> None:
        super().__init__(
            "timestamp must be timezone-aware",
            "时间戳必须携带时区",
        )
