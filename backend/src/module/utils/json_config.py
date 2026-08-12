import json

from .atomic_write import atomic_write


def load(filename):
    with open(filename, encoding="utf-8") as f:
        return json.load(f)


def save(filename, obj):
    atomic_write(
        filename,
        lambda f: json.dump(
            obj, f, indent=4, separators=(",", ": "), ensure_ascii=False
        ),
    )
