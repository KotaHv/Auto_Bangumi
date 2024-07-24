def pre_process(text: str) -> str:
    return text.strip().replace("\n", " ").replace("【", "[").replace("】", "]")
