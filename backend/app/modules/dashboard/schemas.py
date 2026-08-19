from pydantic import BaseModel


class DashboardStats(BaseModel):
    total_libros: int
    total_estantes: int
    total_colecciones: int
    libros_sin_ubicar: int
