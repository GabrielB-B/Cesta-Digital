from pydantic import BaseModel, EmailStr


class Token(BaseModel):
    access_token: str
    token_type: str


class LoginResponse(Token):
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
