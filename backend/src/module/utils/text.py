import re

checksum_pattern = re.compile(
    r"\[[A-F0-9]{8}\](?=\.(mkv|mp4|MKV|MP4|ass|srt|ASS|SRT)$)"
)


def remove_checksum(text: str) -> str:
    return checksum_pattern.sub("", text).strip()


def pre_process(text: str) -> str:
    return remove_checksum(
        text.strip().replace("\n", " ").replace("【", "[").replace("】", "]")
    )


outside_braces_pattern = re.compile(r"\{.*?\}", re.DOTALL)


def remove_outside_braces(text: str) -> str:
    match = outside_braces_pattern.search(text)
    if match:
        return match.group(0)
    return ""
