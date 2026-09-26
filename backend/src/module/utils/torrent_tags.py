import re

RENAME_TAG = "ab-rename"
OFFSET_TAG_PREFIX = "ab-offset="
_OFFSET_TAG_PATTERN = re.compile(r"^ab-offset=(-?[0-9]+)$")


def format_offset_tag(offset: int) -> str | None:
    if offset == 0:
        return None
    return f"{OFFSET_TAG_PREFIX}{offset}"


def parse_offset_tag(tags: str) -> int | None:
    for tag in tags.split(","):
        match = _OFFSET_TAG_PATTERN.fullmatch(tag.strip())
        if match:
            return int(match.group(1))
    return None
