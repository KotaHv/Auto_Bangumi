import pytest
from pydantic import ValidationError

import module.conf.config as config_module
from module.models.config import Downloader
from module.utils import json_config
from module.utils.atomic_write import atomic_write

VALID_API_KEY = "qbt_" + "A" * 28


def test_config_save_is_atomic_and_leaves_no_temp_files(monkeypatch, tmp_path):
    target = tmp_path / "config.json"
    monkeypatch.setattr(config_module, "CONFIG_PATH", target)

    settings = config_module.Settings()
    payload = settings.model_dump_json(by_alias=True)
    settings.save(payload)

    assert target.read_text(encoding="utf-8") == payload
    assert list(tmp_path.glob("*.tmp")) == []


@pytest.mark.parametrize("value", [None, ""])
def test_downloader_api_key_empty_is_normalized_to_none(value):
    assert Downloader(api_key=value).api_key is None


def test_downloader_api_key_valid():
    assert Downloader(api_key=VALID_API_KEY).api_key == VALID_API_KEY


def test_downloader_api_key_whitespace_is_trimmed():
    assert Downloader(api_key=f"  {VALID_API_KEY}  ").api_key == VALID_API_KEY


@pytest.mark.parametrize(
    "value",
    [
        "qbt_short",
        "qbt_" + "A" * 27,
        "qbt_" + "A" * 29,
        "abc_" + "A" * 28,
        "qbt_" + "A" * 27 + "!",
        "qbt_" + "A" * 28 + "-extra",
    ],
)
def test_downloader_api_key_invalid_raises(value):
    with pytest.raises(ValidationError):
        Downloader(api_key=value)


def test_json_config_save_is_atomic_and_leaves_no_temp_files(tmp_path):
    target = tmp_path / "search_provider.json"
    payload = {"mikan": "https://example.com/%s"}

    json_config.save(target, payload)

    assert json_config.load(target) == payload
    assert list(tmp_path.glob("*.tmp")) == []


def test_atomic_write_writes_content_and_leaves_no_temp_files(tmp_path):
    target = tmp_path / "plain.txt"

    atomic_write(target, lambda f: f.write("hello"))

    assert target.read_text(encoding="utf-8") == "hello"
    assert list(tmp_path.glob("*.tmp")) == []
