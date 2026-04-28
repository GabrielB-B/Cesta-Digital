from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator

from app.core.security import validate_password_strength


class RoleOptionResponse(BaseModel):
    id: int
    name: str
    description: str | None


class UserAdminBase(BaseModel):
    name: str
    email: EmailStr
    is_active: bool = True
    roles: list[str]

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("O nome do usuÃ¡rio Ã© obrigatÃ³rio.")
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
            raise ValueError("Selecione pelo menos um perfil para o usuÃ¡rio.")

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
    email: EmailStr
    is_active: bool
    roles: list[str]
    last_login_at: datetime | None
    created_at: datetime
    updated_at: datetime
