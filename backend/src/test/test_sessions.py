import time

import pytest
from fastapi import HTTPException, Request, Response
from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel import select

from module.database import Database
from module.database.alembic import upgrade_database
from module.models import AuthSession, User, UserUpdate
from module.security import session as security_session
from module.security.password import get_password_hash
from module.security.session import (
    SESSION_TIMEOUT,
    generate_session_token,
    hash_session_token,
)


def request_for(scheme: str = "http") -> Request:
    return Request(
        {
            "type": "http",
            "asgi": {"version": "3.0"},
            "http_version": "1.1",
            "scheme": scheme,
            "server": ("testserver", 443 if scheme == "https" else 80),
            "client": ("testclient", 1234),
            "root_path": "",
            "path": "/",
            "raw_path": b"/",
            "query_string": b"",
            "headers": [],
            "state": {},
        }
    )


async def add_session(async_engine, raw_token: str, created_at: int, expires_at: int):
    async with Database(async_engine) as db:
        session = await db.sessions.create(
            token_hash=hash_session_token(raw_token),
            created_at=created_at,
            expires_at=expires_at,
        )
        await db.commit()
        return session


@pytest.mark.asyncio
async def test_session_database_round_trip_and_raw_token_is_not_stored(tmp_path):
    async_engine = create_async_engine(
        f"sqlite+aiosqlite:///{tmp_path / 'session.db'}"
    )
    await upgrade_database(async_engine)
    raw_token = generate_session_token()
    now = int(time.time())

    session = await add_session(async_engine, raw_token, now, now + SESSION_TIMEOUT)

    assert session.created_at == now
    assert session.expires_at == now + SESSION_TIMEOUT
    assert session.token_hash == hash_session_token(raw_token)
    assert session.token_hash != raw_token
    async with Database(async_engine) as db:
        found = await db.sessions.find_by_token_hash(session.token_hash)
        assert found is not None
        assert found.token_hash != raw_token
        await db.sessions.delete_by_token_hash(session.token_hash)
        await db.commit()
        assert await db.sessions.find_by_token_hash(session.token_hash) is None

    await async_engine.dispose()


@pytest.mark.asyncio
async def test_login_sets_opaque_cookie_and_persists_idle_deadline(tmp_path, monkeypatch):
    import module.api.auth as auth_module

    async_engine = create_async_engine(
        f"sqlite+aiosqlite:///{tmp_path / 'login.db'}"
    )
    await upgrade_database(async_engine)
    expired_token = generate_session_token()
    async with Database(async_engine) as db:
        db.add(User(username="admin", password=get_password_hash("adminadmin")))
        await db.sessions.create(
            token_hash=hash_session_token(expired_token),
            created_at=0,
            expires_at=1,
        )
        await db.commit()

    monkeypatch.setattr(auth_module, "Database", lambda: Database(async_engine))
    before = int(time.time())
    response = Response()
    result = await auth_module.login(
        request_for(), response, "admin", "adminadmin"
    )
    after = int(time.time())

    assert isinstance(result, dict)
    assert result["status"] is True
    assert set(result) == {"status", "msg_en", "msg_zh"}
    cookie = response.headers["set-cookie"]
    assert "session=" in cookie
    assert "HttpOnly" in cookie
    assert "SameSite=strict" in cookie
    assert "Max-Age=3600" in cookie
    assert "expires=" not in cookie.lower()
    assert "Secure" not in cookie
    raw_token = cookie.split("session=", 1)[1].split(";", 1)[0]
    async with Database(async_engine) as db:
        session = (await db.exec(select(AuthSession))).first()
        assert session is not None
        assert session.token_hash == hash_session_token(raw_token)
        assert session.token_hash not in cookie
        assert await db.sessions.find_by_token_hash(hash_session_token(expired_token)) is None
        assert before <= session.created_at <= after
        assert session.expires_at == session.created_at + SESSION_TIMEOUT

    await async_engine.dispose()


@pytest.mark.asyncio
async def test_login_sets_secure_cookie_on_https(tmp_path, monkeypatch):
    import module.api.auth as auth_module

    async_engine = create_async_engine(
        f"sqlite+aiosqlite:///{tmp_path / 'secure-cookie.db'}"
    )
    await upgrade_database(async_engine)
    async with Database(async_engine) as db:
        db.add(User(username="admin", password=get_password_hash("adminadmin")))
        await db.commit()
    monkeypatch.setattr(auth_module, "Database", lambda: Database(async_engine))

    response = Response()
    await auth_module.login(request_for("https"), response, "admin", "adminadmin")
    assert "Secure" in response.headers["set-cookie"]

    await async_engine.dispose()


@pytest.mark.asyncio
async def test_failed_login_does_not_create_session(tmp_path, monkeypatch):
    import module.api.auth as auth_module

    async_engine = create_async_engine(
        f"sqlite+aiosqlite:///{tmp_path / 'failed-login.db'}"
    )
    await upgrade_database(async_engine)
    async with Database(async_engine) as db:
        db.add(User(username="admin", password=get_password_hash("adminadmin")))
        await db.commit()
    monkeypatch.setattr(auth_module, "Database", lambda: Database(async_engine))

    with pytest.raises(HTTPException) as error:
        await auth_module.login(request_for(), Response(), "admin", "wrong-password")
    assert error.value.status_code == 401

    async with Database(async_engine) as db:
        assert (await db.exec(select(AuthSession))).all() == []

    await async_engine.dispose()


@pytest.mark.asyncio
async def test_valid_request_renews_session_on_every_activity(tmp_path, monkeypatch):
    async_engine = create_async_engine(
        f"sqlite+aiosqlite:///{tmp_path / 'renew.db'}"
    )
    await upgrade_database(async_engine)
    raw_token = generate_session_token()
    await add_session(async_engine, raw_token, 1000, 1000 + SESSION_TIMEOUT)
    monkeypatch.setattr(security_session.time, "time", lambda: 4500)
    monkeypatch.setattr(security_session, "Database", lambda: Database(async_engine))

    await security_session.require_session(request_for(), raw_token)

    async with Database(async_engine) as db:
        session = await db.sessions.find_by_token_hash(hash_session_token(raw_token))
        assert session is not None
        assert session.expires_at == 4500 + SESSION_TIMEOUT

    await async_engine.dispose()


@pytest.mark.asyncio
async def test_repeated_activity_survives_original_login_deadline(tmp_path, monkeypatch):
    async_engine = create_async_engine(
        f"sqlite+aiosqlite:///{tmp_path / 'sliding.db'}"
    )
    await upgrade_database(async_engine)
    raw_token = generate_session_token()
    await add_session(async_engine, raw_token, 1000, 1000 + SESSION_TIMEOUT)
    monkeypatch.setattr(security_session, "Database", lambda: Database(async_engine))

    for current_time in (4500, 8000):
        monkeypatch.setattr(
            security_session.time, "time", lambda current_time=current_time: current_time
        )
        await security_session.require_session(request_for(), raw_token)

    async with Database(async_engine) as db:
        session = await db.sessions.find_by_token_hash(hash_session_token(raw_token))
        assert session is not None
        assert session.expires_at == 8000 + SESSION_TIMEOUT

    await async_engine.dispose()


@pytest.mark.asyncio
async def test_expired_session_is_deleted_and_rejected(tmp_path, monkeypatch):
    async_engine = create_async_engine(
        f"sqlite+aiosqlite:///{tmp_path / 'expired.db'}"
    )
    await upgrade_database(async_engine)
    raw_token = generate_session_token()
    await add_session(async_engine, raw_token, 1000, 2000)
    monkeypatch.setattr(security_session.time, "time", lambda: 2000)
    monkeypatch.setattr(security_session, "Database", lambda: Database(async_engine))

    with pytest.raises(HTTPException) as error:
        await security_session.require_session(request_for(), raw_token)
    assert error.value.status_code == 401

    async with Database(async_engine) as db:
        assert await db.sessions.find_by_token_hash(hash_session_token(raw_token)) is None

    await async_engine.dispose()


@pytest.mark.asyncio
async def test_session_survives_new_database_engine_context(tmp_path, monkeypatch):
    database_path = tmp_path / "restart.db"
    first_engine = create_async_engine(f"sqlite+aiosqlite:///{database_path}")
    await upgrade_database(first_engine)
    raw_token = generate_session_token()
    await add_session(first_engine, raw_token, 1000, 1000 + SESSION_TIMEOUT)
    await first_engine.dispose()

    second_engine = create_async_engine(f"sqlite+aiosqlite:///{database_path}")
    monkeypatch.setattr(security_session.time, "time", lambda: 1500)
    monkeypatch.setattr(security_session, "Database", lambda: Database(second_engine))
    await security_session.require_session(request_for(), raw_token)

    async with Database(second_engine) as db:
        session = await db.sessions.find_by_token_hash(hash_session_token(raw_token))
        assert session is not None
        assert session.expires_at == 1500 + SESSION_TIMEOUT

    await second_engine.dispose()


@pytest.mark.asyncio
async def test_logout_is_idempotent_and_only_deletes_current_session(tmp_path, monkeypatch):
    import module.api.auth as auth_module

    async_engine = create_async_engine(
        f"sqlite+aiosqlite:///{tmp_path / 'logout.db'}"
    )
    await upgrade_database(async_engine)
    first_token = generate_session_token()
    second_token = generate_session_token()
    await add_session(async_engine, first_token, 1000, 4600)
    await add_session(async_engine, second_token, 1000, 4600)
    monkeypatch.setattr(auth_module, "Database", lambda: Database(async_engine))

    response = Response()
    result = await auth_module.logout(response, first_token)
    assert result["status"] is True
    assert "session=" in response.headers["set-cookie"]

    async with Database(async_engine) as db:
        assert await db.sessions.find_by_token_hash(hash_session_token(first_token)) is None
        assert await db.sessions.find_by_token_hash(hash_session_token(second_token)) is not None

    second_response = Response()
    await auth_module.logout(second_response, first_token)
    assert "session=" in second_response.headers["set-cookie"]

    await async_engine.dispose()


@pytest.mark.asyncio
async def test_username_change_keeps_sessions(tmp_path):
    async_engine = create_async_engine(
        f"sqlite+aiosqlite:///{tmp_path / 'username.db'}"
    )
    await upgrade_database(async_engine)
    raw_token = generate_session_token()
    async with Database(async_engine) as db:
        db.add(User(username="admin", password="hashed-password"))
        await db.commit()
    await add_session(async_engine, raw_token, 1000, 4600)
    async with Database(async_engine) as db:
        await db.user.update_user(UserUpdate(username="changed"))
        await db.commit()

    async with Database(async_engine) as db:
        assert await db.sessions.find_by_token_hash(hash_session_token(raw_token))

    await async_engine.dispose()


@pytest.mark.asyncio
async def test_password_change_revokes_all_sessions_and_clears_cookie(
    tmp_path, monkeypatch
):
    import module.api.auth as auth_module

    async_engine = create_async_engine(
        f"sqlite+aiosqlite:///{tmp_path / 'password.db'}"
    )
    await upgrade_database(async_engine)
    first_token = generate_session_token()
    second_token = generate_session_token()
    async with Database(async_engine) as db:
        db.add(User(username="admin", password="hashed-password"))
        await db.commit()
    await add_session(async_engine, first_token, 1000, 4600)
    await add_session(async_engine, second_token, 1000, 4600)
    monkeypatch.setattr(auth_module, "Database", lambda: Database(async_engine))

    response = Response()
    result = await auth_module.update_user(
        request_for(), response, UserUpdate(password="new-password")
    )
    assert result == {
        "status": True,
        "msg_en": "Account updated successfully.",
        "msg_zh": "账户更新成功。",
    }
    assert "session=" in response.headers["set-cookie"]

    async with Database(async_engine) as db:
        assert (await db.exec(select(AuthSession))).all() == []

    await async_engine.dispose()
