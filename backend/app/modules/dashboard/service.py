from sqlalchemy.orm import Session

from app.modules.catalogo.models import Coleccion, Estante, Libro
from app.modules.dashboard.schemas import DashboardStats


def obtener_stats(db: Session) -> DashboardStats:
    return DashboardStats(
        total_libros=db.query(Libro).count(),
        total_estantes=db.query(Estante).count(),
        total_colecciones=db.query(Coleccion).count(),
        libros_sin_ubicar=db.query(Libro).filter(Libro.estante_id.is_(None)).count(),
    )
