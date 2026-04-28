from datetime import datetime, timedelta, timezone
import re

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def validate_password_strength(password: str) -> str:
    normalized = password.strip()

    if len(normalized) < 8:
        raise ValueError("A senha deve ter pelo menos 8 caracteres.")

    if not re.search(r"[A-Z]", normalized):
        raise ValueError("A senha deve conter pelo menos uma letra maiuscula.")

    if not re.search(r"[a-z]", normalized):
        raise ValueError("A senha deve conter pelo menos uma letra minuscula.")

    if not re.search(r"\d", normalized):
        raise ValueError("A senha deve conter pelo menos um numero.")

    if not re.search(r"[^A-Za-z0-9]", normalized):
        raise ValueError("A senha deve conter pelo menos um caractere especial.")

    return normalized


def create_access_token(subject: str, expires_delta: timedelta | None = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.access_token_expire_minutes
        )

    to_encode = {
        "sub": subject,
        "exp": expire,
    }

    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
