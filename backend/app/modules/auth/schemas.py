import uuid
from pydantic import BaseModel, ConfigDict
from app.modules.auth.models import RolEnum


class LoginRequest(BaseModel):
    username: str
    password: str


class UsuarioResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    nombre: str | None
    rol: RolEnum


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioResponse
