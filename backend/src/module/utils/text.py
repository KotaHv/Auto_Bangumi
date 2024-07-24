import re


def pre_process(text: str) -> str:
    return text.strip().replace("\n", " ").replace("【", "[").replace("】", "]")


outside_braces_pattern = re.compile(r"\{.*?\}", re.DOTALL)


def remove_outside_braces(text: str) -> str:
    match = outside_braces_pattern.search(text)
    if match:
        return match.group(0)
    return ""
