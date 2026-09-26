import hashlib
import secrets

SESSION_TIMEOUT = 7 * 24 * 60 * 60


def generate_session_token() -> str:
    return secrets.token_urlsafe(32)


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
