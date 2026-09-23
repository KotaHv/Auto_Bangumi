import importlib
from pathlib import Path
from urllib.parse import unquote

import pytest
from fastapi import HTTPException
from fastapi.responses import FileResponse
from fastapi.testclient import TestClient


def prepare_posters(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.chdir(tmp_path)
    (tmp_path / "config").mkdir()
    (tmp_path / "dist" / "assets").mkdir(parents=True)
    (tmp_path / "dist" / "images").mkdir()
    poster_root = tmp_path / "data" / "posters"
    poster_root.mkdir(parents=True)
    return poster_root, importlib.import_module("main")


def test_serves_existing_nested_poster(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    poster_root, main = prepare_posters(tmp_path, monkeypatch)
    poster = poster_root / "series" / "poster.jpg"
    poster.parent.mkdir()
    poster.write_bytes(b"poster bytes")

    response = TestClient(main.app).get("/posters/series/poster.jpg")

    assert response.status_code == 200
    assert response.content == b"poster bytes"
    assert poster.read_bytes() == b"poster bytes"


def test_serves_poster_with_percent_encoded_looking_name(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
):
    poster_root, main = prepare_posters(tmp_path, monkeypatch)
    encoded_path = "%252e%252e%252fsecret.txt"
    route_path = unquote(encoded_path)
    poster = poster_root / route_path
    poster.write_bytes(b"literal filename")

    response = main.posters(route_path)

    assert isinstance(response, FileResponse)
    assert Path(response.path) == poster
    assert poster.read_bytes() == b"literal filename"


@pytest.mark.parametrize(
    "path",
    [
        "../secret.txt",
        "%2e%2e%2fsecret.txt",
        "%2e%2e/secret.txt",
        "..%2fsecret.txt",
        ".%2e%2fsecret.txt",
    ],
)
def test_rejects_traversal_paths(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, path: str
):
    _, main = prepare_posters(tmp_path, monkeypatch)
    (tmp_path / "data" / "secret.txt").write_text("secret")

    with pytest.raises(HTTPException) as exc_info:
        main.posters(unquote(path))

    assert exc_info.value.status_code == 404


def test_http_rejects_encoded_traversal_path(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
):
    _, main = prepare_posters(tmp_path, monkeypatch)
    secret = tmp_path / "data" / "secret.txt"
    secret.write_text("do not expose this secret")

    poster_route = next(
        route
        for route in main.app.routes
        if getattr(route, "path", None) == "/posters/{path:path}"
    )
    route_paths = []
    route_endpoint = poster_route.dependant.call

    def capture_route_path(path: str):
        route_paths.append(path)
        return route_endpoint(path)

    monkeypatch.setattr(poster_route.dependant, "call", capture_route_path)
    response = TestClient(main.app).get("/posters/%2e%2e%2fsecret.txt")

    assert response.status_code == 404
    assert "do not expose this secret" not in response.text
    assert route_paths == ["../secret.txt"]


def test_rejects_symlink_outside_poster_directory(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
):
    poster_root, main = prepare_posters(tmp_path, monkeypatch)
    secret = tmp_path / "data" / "secret.txt"
    secret.write_text("secret")
    (poster_root / "linked.txt").symlink_to(secret)

    response = TestClient(main.app).get("/posters/linked.txt")

    assert response.status_code == 404
    assert b"secret" not in response.content


def test_rejects_missing_poster(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    _, main = prepare_posters(tmp_path, monkeypatch)

    with pytest.raises(HTTPException) as exc_info:
        main.posters("missing.jpg")

    assert exc_info.value.status_code == 404
