import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from jose import JWTError, jwt

from src.config import settings

_ACCESS_EXPIRE = timedelta(minutes=settings.jwt_access_token_expire_minutes)
_REFRESH_EXPIRE = timedelta(days=settings.jwt_refresh_token_expire_days)


def create_access_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "type": "access",
        "exp": datetime.now(UTC) + _ACCESS_EXPIRE,
        "iat": datetime.now(UTC),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_refresh_token() -> tuple[str, str, datetime]:
    """Return (raw_token, token_hash, expires_at)."""
    raw = secrets.token_urlsafe(48)
    token_hash = hashlib.sha256(raw.encode()).hexdigest()
    expires_at = datetime.now(UTC) + _REFRESH_EXPIRE
    return raw, token_hash, expires_at


def decode_access_token(token: str) -> dict:
    """Decode and validate an access token. Raises JWTError on failure."""
    payload = jwt.decode(
        token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
    )
    if payload.get("type") != "access":
        raise JWTError("Not an access token")
    return payload


def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()
