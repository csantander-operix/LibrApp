from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import create_access_token
from app.modules.auth.models import Usuario
from app.modules.auth.schemas import LoginRequest, TokenResponse, UsuarioResponse
from app.modules.auth.service import autenticar

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    """CU-02: valida credenciales y devuelve el JWT + datos del usuario."""
    user = autenticar(db, data.username, data.password)
    token = create_access_token(subject=user.username, extra={"rol": user.rol.value})
    return TokenResponse(access_token=token, usuario=UsuarioResponse.model_validate(user))


@router.get("/me", response_model=UsuarioResponse)
def me(user: Usuario = Depends(get_current_user)):
    """Devuelve el usuario del token (para rehidratar la sesión en el frontend)."""
    return user
