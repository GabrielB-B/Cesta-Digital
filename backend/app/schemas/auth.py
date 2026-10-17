from pydantic import BaseModel, EmailStr


class LoginResponse(BaseModel):
    user_id: int
    name: str
    login_name: str
    email: EmailStr
    roles: list[str]


class CurrentUserResponse(BaseModel):
    id: int
    name: str
    login_name: str
    email: EmailStr
    is_active: bool
    roles: list[str]


class PasswordRecoveryRequest(BaseModel):
    email: EmailStr


class PasswordRecoveryResponse(BaseModel):
    message: str
