# ============================================================
# MineSafe AI — Auth Schemas
# ============================================================

import uuid
from pydantic import BaseModel, ConfigDict


class UserOut(BaseModel):
    id: uuid.UUID
    username: str
    name: str
    role: str

    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    password: str
    name: str
    role: str = "Safety Officer"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

