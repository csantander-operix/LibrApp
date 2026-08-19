"""Seed idempotente para desarrollo.

Crea (si no existen):
  - El usuario administrador (credenciales de .env: ADMIN_USERNAME / ADMIN_PASSWORD).
  - Una zona "Planta Baja".
  - Colecciones base (categorías taxonómicas — RN-10).
  - Unos estantes de ejemplo posicionados en el plano.
  - Un puñado de libros reales del inventario Rodolfo Walsh (algunos "Sin ubicar").

Corre en el lifespan del backend (ver app/main.py). Es seguro reejecutarlo:
solo inserta lo que falta.
"""
from decimal import Decimal

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.modules.auth.models import Usuario, RolEnum
from app.modules.catalogo.models import Zona, Coleccion, Estante, Libro, AnotacionMapa

settings = get_settings()


def bootstrap_dev() -> None:
    db = SessionLocal()
    try:
        _seed_admin(db)
        zona = _seed_zona(db)
        colecciones = _seed_colecciones(db)
        estantes = _seed_estantes(db, zona)
        _seed_libros(db, colecciones, estantes)
        _seed_anotaciones(db, zona)
        db.commit()
    finally:
        db.close()


def _seed_admin(db) -> None:
    existe = db.query(Usuario).filter(Usuario.username == settings.ADMIN_USERNAME).first()
    if existe:
        return
    db.add(Usuario(
        username=settings.ADMIN_USERNAME,
        nombre="Administrador",
        password_hash=hash_password(settings.ADMIN_PASSWORD),
        rol=RolEnum.admin,
        activo=True,
    ))
    db.flush()
    print(f"[seed] Usuario admin '{settings.ADMIN_USERNAME}' creado.", flush=True)


def _seed_zona(db) -> Zona:
    zona = db.query(Zona).filter(Zona.nombre == "Planta Baja").first()
    if not zona:
        zona = Zona(nombre="Planta Baja", orden=0)
        db.add(zona)
        db.flush()
    # Segunda zona de ejemplo para demostrar el mapa multi-piso (RF-11). Sin
    # estantes: el admin los agrega desde el editor de mapa.
    if not db.query(Zona).filter(Zona.nombre == "Planta Alta").first():
        db.add(Zona(nombre="Planta Alta", orden=1))
        db.flush()
    return zona


def _seed_colecciones(db) -> dict[str, Coleccion]:
    nombres = ["Humanidades", "Sistemas", "Desarrollo Productivo", "Ciencias Sociales", "Sin colección"]
    out: dict[str, Coleccion] = {}
    for nombre in nombres:
        col = db.query(Coleccion).filter(Coleccion.nombre == nombre).first()
        if not col:
            col = Coleccion(nombre=nombre)
            db.add(col)
            db.flush()
        out[nombre] = col
    return out


def _seed_estantes(db, zona: Zona) -> dict[str, Estante]:
    # (codigo, etiqueta, x, y, ancho, alto, color) en coords relativas del plano (0-100).
    # El color diferencia categorías de un vistazo (RF-01).
    base = [
        ("E1", "Novedades", 10, 10, 18, 12, "#3B82F6"),
        ("E2", "Humanidades", 32, 10, 18, 12, "#22C55E"),
        ("E3", "Sistemas", 54, 10, 18, 12, "#A855F7"),
        ("MESA-CENTRAL", "Mesa central", 30, 40, 30, 18, "#F97316"),
        ("ENTRADA", "Entrada / Kiosko", 10, 72, 20, 12, "#EC4899"),
    ]
    out: dict[str, Estante] = {}
    for codigo, etiqueta, x, y, w, h, color in base:
        est = db.query(Estante).filter(
            Estante.zona_id == zona.id, Estante.codigo == codigo,
        ).first()
        if not est:
            est = Estante(
                codigo=codigo, etiqueta=etiqueta, zona_id=zona.id,
                pos_x=x, pos_y=y, ancho=w, alto=h, color=color,
            )
            db.add(est)
            db.flush()
        out[codigo] = est
    return out


def _seed_anotaciones(db, zona: Zona) -> None:
    """Marcas de referencia sobre el plano (ENTRADA, ESCALERA, VENTANA, flechas)."""
    if db.query(AnotacionMapa).count() > 0:
        return  # ya sembrado
    # (tipo, texto, x, y, ancho, alto, rotacion, color)
    base = [
        ("texto",  "ENTRADA / SALIDA", 4, 60, 18, 6, 0, "#7A1C30"),
        ("flecha", None,               6, 68, 12, 6, 0, "#7A1C30"),
        ("texto",  "ESCALERA",         82, 4, 15, 6, 0, "#64748B"),
        ("texto",  "VENTANAL",         40, 2, 20, 5, 0, "#0EA5E9"),
    ]
    for tipo, texto, x, y, w, h, rot, color in base:
        db.add(AnotacionMapa(
            zona_id=zona.id, tipo=tipo, texto=texto,
            pos_x=x, pos_y=y, ancho=w, alto=h, rotacion=rot, color=color,
        ))
    print("[seed] Anotaciones de mapa de ejemplo cargadas.", flush=True)


def _seed_libros(db, colecciones: dict[str, Coleccion], estantes: dict[str, Estante]) -> None:
    if db.query(Libro).count() > 0:
        return  # ya sembrado
    hum = colecciones["Humanidades"]
    soc = colecciones["Ciencias Sociales"]
    # Datos reales del inventario Rodolfo Walsh (Ciccus). estante None = "Sin ubicar" (RN-07).
    libros = [
        ("978-987-693-770-2", "¡Perón vive!", "Varios", "Ciccus", Decimal("25000.00"), soc, estantes["E1"]),
        ("978-987-693-743-6", "¿De quién es la culpa?", "Varios", "Ciccus", Decimal("18500.00"), soc, estantes["E2"]),
        ("978-987-1599-88-2", "Agua y territorio", "Varios", "Ciccus", Decimal("18500.00"), soc, estantes["E2"]),
        ("978-987-1599-54-7", "América Latina en perspectiva", "Varios", "Ciccus", Decimal("20000.00"), hum, estantes["MESA-CENTRAL"]),
        ("978-987-693-784-9", "Argentina en su laberinto", "Varios", "Ciccus", Decimal("39000.00"), hum, estantes["MESA-CENTRAL"]),
        ("978-987-693-386-5", "Del péndulo al precipicio", "Varios", "Ciccus", Decimal("29500.00"), hum, None),
        ("978-987-6939-30-0", "Educar y gastar en cultura", "Varios", "Ciccus", Decimal("22000.00"), hum, None),
    ]
    for isbn, titulo, autor, editorial, precio, coleccion, estante in libros:
        db.add(Libro(
            isbn=isbn, titulo=titulo, autor=autor, editorial=editorial, precio=precio,
            coleccion_id=coleccion.id if coleccion else None,
            estante_id=estante.id if estante else None,
        ))
    print(f"[seed] {len(libros)} libros de ejemplo cargados.", flush=True)
