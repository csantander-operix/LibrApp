"""Dependencias de autenticación/autorización.

- get_current_user: valida el Bearer token y devuelve el Usuario.
- require_admin:     exige rol admin (operaciones de escritura — RN-05).
"""
from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.modules.auth.models import Usuario, RolEnum
from app.shared.exceptions import UnauthorizedError, ForbiddenError

# auto_error=False: manejamos nosotros el 401 con mensaje en español.
_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> Usuario:
    if creds is None or not creds.credentials:
        raise UnauthorizedError("Falta el token de autenticación")
    try:
        payload = decode_access_token(creds.credentials)
    except JWTError:
        raise UnauthorizedError("Token inválido o expirado")

    username = payload.get("sub")
    if not username:
        raise UnauthorizedError("Token sin sujeto")

    user = db.query(Usuario).filter(Usuario.username == username).first()
    if user is None or not user.activo:
        raise UnauthorizedError("Usuario inexistente o deshabilitado")
    return user


def require_admin(user: Usuario = Depends(get_current_user)) -> Usuario:
    if user.rol != RolEnum.admin:
        raise ForbiddenError("Se requiere rol administrador")
    return user
