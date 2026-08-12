import os
import tempfile
from collections.abc import Callable
from pathlib import Path
from typing import Any, TextIO, cast


def atomic_write(filename: Path | str, writer: Callable[[TextIO], Any]) -> None:
    """Write via a temp file in the same directory, fsync, then atomically replace.

    A crash mid-write can never leave a truncated target file: it is either
    the old complete content or the new complete content.
    """
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(
            "w",
            dir=Path(filename).parent,
            suffix=".tmp",
            encoding="utf-8",
            delete=False,
        ) as f:
            tmp_path = f.name
            writer(cast(TextIO, f))
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_path, filename)
    finally:
        if tmp_path is not None:
            try:
                os.unlink(tmp_path)
            except FileNotFoundError:
                pass
