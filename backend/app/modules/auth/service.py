from sqlalchemy.orm import Session

from app.core.security import verify_password
from app.modules.auth.models import Usuario
from app.shared.exceptions import UnauthorizedError


def autenticar(db: Session, username: str, password: str) -> Usuario:
    """Valida credenciales (RF-08 / CU-02). Mensaje genérico a propósito: no
    revela si el usuario existe o si falló la contraseña."""
    user = db.query(Usuario).filter(Usuario.username == username).first()
    if user is None or not verify_password(password, user.password_hash):
        raise UnauthorizedError("Usuario o contraseña incorrectos")
    if not user.activo:
        raise UnauthorizedError("La cuenta está deshabilitada")
    return user
