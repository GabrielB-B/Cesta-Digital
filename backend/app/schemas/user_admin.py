from datetime import datetime
import re

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.security import validate_password_strength


class RoleOptionResponse(BaseModel):
    id: int
    name: str
    description: str | None


class UserAdminBase(BaseModel):
    name: str
    login_name: str = Field(min_length=3, max_length=80)
    email: EmailStr
    is_active: bool = True
    roles: list[str]

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("O nome do usuario e obrigatorio.")
        return value

    @field_validator("login_name")
    @classmethod
    def validate_login_name(cls, value: str) -> str:
        value = value.strip().lower()
        if not value:
            raise ValueError("O nome de login e obrigatorio.")
        if not re.fullmatch(r"[a-z0-9._-]{3,80}", value):
            raise ValueError(
                "Use 3 a 80 caracteres no login: letras, numeros, ponto, hifen ou sublinhado."
            )
        return value

    @field_validator("roles")
    @classmethod
    def validate_roles(cls, value: list[str]) -> list[str]:
        normalized_roles: list[str] = []

        for role in value:
            normalized = role.strip().lower()
            if normalized and normalized not in normalized_roles:
                normalized_roles.append(normalized)

        if not normalized_roles:
            raise ValueError("Selecione pelo menos um perfil para o usuario.")

        return normalized_roles


class UserCreate(UserAdminBase):
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return validate_password_strength(value)


class UserUpdate(UserAdminBase):
    pass


class UserPasswordReset(BaseModel):
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        return validate_password_strength(value)


class UserAdminResponse(BaseModel):
    id: int
    name: str
    login_name: str
    email: EmailStr
    is_active: bool
    roles: list[str]
    last_login_at: datetime | None
    created_at: datetime
    updated_at: datetime
