import uuid
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.modules.catalogo.models import Zona, Coleccion, Estante, Libro, AnotacionMapa
from app.modules.catalogo.schemas import (
    LibroResponse, EstanteResponse, LibroCreate, LibroUpdate,
    EstanteCreate, EstanteUpdate, ColeccionCreate, ZonaCreate, ZonaUpdate,
    AnotacionResponse, AnotacionCreate,
)
from app.shared.exceptions import NotFoundError, ConflictError


def _to_estante_response(e: Estante, total_libros: int = 0) -> EstanteResponse:
    return EstanteResponse(
        id=e.id, codigo=e.codigo, etiqueta=e.etiqueta, zona_id=e.zona_id,
        pos_x=float(e.pos_x), pos_y=float(e.pos_y),
        ancho=float(e.ancho), alto=float(e.alto), color=e.color,
        total_libros=total_libros,
    )


# ─── Lectura ──────────────────────────────────────────────────────────────────

def listar_zonas(db: Session) -> list[Zona]:
    return db.query(Zona).order_by(Zona.orden, Zona.nombre).all()


def listar_colecciones(db: Session) -> list[Coleccion]:
    return db.query(Coleccion).order_by(Coleccion.nombre).all()


def listar_estantes(db: Session) -> list[EstanteResponse]:
    # Conteo de libros por estante en una sola query (para RN-08 en la UI).
    conteos = dict(
        db.query(Libro.estante_id, func.count(Libro.id))
        .filter(Libro.estante_id.isnot(None))
        .group_by(Libro.estante_id)
        .all()
    )
    estantes = db.query(Estante).order_by(Estante.codigo).all()
    return [_to_estante_response(e, conteos.get(e.id, 0)) for e in estantes]


def _to_libro_response(lb: Libro) -> LibroResponse:
    return LibroResponse(
        id=lb.id, isbn=lb.isbn, titulo=lb.titulo, autor=lb.autor,
        editorial=lb.editorial, precio=lb.precio,
        coleccion_id=lb.coleccion_id, estante_id=lb.estante_id,
        estante_codigo=lb.estante.codigo if lb.estante else None,
        coleccion_nombre=lb.coleccion.nombre if lb.coleccion else None,
    )


def listar_libros(
    db: Session,
    q: str | None = None,
    coleccion_id=None,
    estante_id=None,
    sin_ubicar: bool | None = None,
) -> list[LibroResponse]:
    """Listado con filtros (RF-06). Búsqueda case-insensitive por título/autor/ISBN (CU-01)."""
    query = db.query(Libro).options(selectinload(Libro.estante), selectinload(Libro.coleccion))
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            Libro.titulo.ilike(like) | Libro.autor.ilike(like) | Libro.isbn.ilike(like)
        )
    if coleccion_id:
        query = query.filter(Libro.coleccion_id == coleccion_id)
    if estante_id:
        query = query.filter(Libro.estante_id == estante_id)
    if sin_ubicar is True:
        query = query.filter(Libro.estante_id.is_(None))
    return [_to_libro_response(lb) for lb in query.order_by(Libro.titulo).all()]


# ─── Escritura: Libro ─────────────────────────────────────────────────────────

def _validar_isbn_unico(db: Session, isbn: str | None, excluir_id: uuid.UUID | None = None) -> None:
    """RN-01: no puede haber dos libros con el mismo ISBN."""
    if not isbn:
        return
    query = db.query(Libro).filter(Libro.isbn == isbn)
    if excluir_id:
        query = query.filter(Libro.id != excluir_id)
    if query.first():
        raise ConflictError(f"Ya existe un libro con el ISBN {isbn}")


def _validar_fk(db: Session, coleccion_id, estante_id) -> None:
    if coleccion_id and not db.get(Coleccion, coleccion_id):
        raise NotFoundError("La colección indicada no existe")
    if estante_id and not db.get(Estante, estante_id):
        raise NotFoundError("El estante indicado no existe")


def obtener_libro(db: Session, libro_id: uuid.UUID) -> Libro:
    lb = db.get(Libro, libro_id)
    if not lb:
        raise NotFoundError("Libro no encontrado")
    return lb


def crear_libro(db: Session, data: LibroCreate) -> LibroResponse:
    _validar_isbn_unico(db, data.isbn)
    _validar_fk(db, data.coleccion_id, data.estante_id)
    lb = Libro(**data.model_dump())
    db.add(lb)
    db.commit()
    db.refresh(lb)
    return _to_libro_response(lb)


def actualizar_libro(db: Session, libro_id: uuid.UUID, data: LibroUpdate) -> LibroResponse:
    lb = obtener_libro(db, libro_id)
    cambios = data.model_dump(exclude_unset=True)
    if "isbn" in cambios:
        _validar_isbn_unico(db, cambios["isbn"], excluir_id=libro_id)
    _validar_fk(db, cambios.get("coleccion_id"), cambios.get("estante_id"))
    for campo, valor in cambios.items():
        setattr(lb, campo, valor)
    db.commit()
    db.refresh(lb)
    return _to_libro_response(lb)


def actualizar_precio(db: Session, libro_id: uuid.UUID, precio) -> LibroResponse:
    """RF-09 / HU-03: actualiza solo el precio sin tocar el resto (RN-06)."""
    lb = obtener_libro(db, libro_id)
    lb.precio = precio
    db.commit()
    db.refresh(lb)
    return _to_libro_response(lb)


def eliminar_libro(db: Session, libro_id: uuid.UUID) -> None:
    lb = obtener_libro(db, libro_id)
    db.delete(lb)
    db.commit()


# ─── Escritura: Estante ───────────────────────────────────────────────────────

def _validar_codigo_estante(db: Session, codigo: str, zona_id, excluir_id=None) -> None:
    """RN-04: el código de estante es único dentro de una misma zona."""
    query = db.query(Estante).filter(Estante.codigo == codigo, Estante.zona_id == zona_id)
    if excluir_id:
        query = query.filter(Estante.id != excluir_id)
    if query.first():
        raise ConflictError(f"Ya existe un estante '{codigo}' en esa zona")


def obtener_estante(db: Session, estante_id: uuid.UUID) -> Estante:
    e = db.get(Estante, estante_id)
    if not e:
        raise NotFoundError("Estante no encontrado")
    return e


def crear_estante(db: Session, data: EstanteCreate) -> EstanteResponse:
    if data.zona_id and not db.get(Zona, data.zona_id):
        raise NotFoundError("La zona indicada no existe")
    _validar_codigo_estante(db, data.codigo, data.zona_id)
    e = Estante(**data.model_dump())
    db.add(e)
    db.commit()
    db.refresh(e)
    return _to_estante_response(e, 0)


def actualizar_estante(db: Session, estante_id: uuid.UUID, data: EstanteUpdate) -> EstanteResponse:
    e = obtener_estante(db, estante_id)
    cambios = data.model_dump(exclude_unset=True)
    nuevo_codigo = cambios.get("codigo", e.codigo)
    nueva_zona = cambios.get("zona_id", e.zona_id)
    if "zona_id" in cambios and cambios["zona_id"] and not db.get(Zona, cambios["zona_id"]):
        raise NotFoundError("La zona indicada no existe")
    if "codigo" in cambios or "zona_id" in cambios:
        _validar_codigo_estante(db, nuevo_codigo, nueva_zona, excluir_id=estante_id)
    for campo, valor in cambios.items():
        setattr(e, campo, valor)
    db.commit()
    db.refresh(e)
    total = db.query(func.count(Libro.id)).filter(Libro.estante_id == e.id).scalar() or 0
    return _to_estante_response(e, total)


def actualizar_posiciones(db: Session, posiciones) -> int:
    """Guarda en lote la geometría (y color) de los estantes editados en el mapa
    (drag & drop / resize — RF-10 / CU-05). Devuelve cuántos se actualizaron."""
    actualizados = 0
    for pos in posiciones:
        e = db.get(Estante, pos.id)
        if not e:
            continue
        e.pos_x = pos.pos_x
        e.pos_y = pos.pos_y
        if pos.ancho is not None:
            e.ancho = pos.ancho
        if pos.alto is not None:
            e.alto = pos.alto
        # color viene siempre en el payload; None limpia el color (vuelve al de zona).
        e.color = pos.color
        actualizados += 1
    db.commit()
    return actualizados


# ─── Mapa: anotaciones (flechas / textos) ─────────────────────────────────────

def _to_anotacion_response(a: AnotacionMapa) -> AnotacionResponse:
    return AnotacionResponse(
        id=a.id, zona_id=a.zona_id, tipo=a.tipo, texto=a.texto,
        pos_x=float(a.pos_x), pos_y=float(a.pos_y),
        ancho=float(a.ancho), alto=float(a.alto),
        rotacion=float(a.rotacion), color=a.color,
    )


def listar_anotaciones(db: Session) -> list[AnotacionResponse]:
    filas = db.query(AnotacionMapa).order_by(AnotacionMapa.created_at).all()
    return [_to_anotacion_response(a) for a in filas]


def crear_anotacion(db: Session, data: AnotacionCreate) -> AnotacionResponse:
    if data.zona_id and not db.get(Zona, data.zona_id):
        raise NotFoundError("La zona indicada no existe")
    a = AnotacionMapa(**data.model_dump())
    db.add(a)
    db.commit()
    db.refresh(a)
    return _to_anotacion_response(a)


def obtener_anotacion(db: Session, anotacion_id: uuid.UUID) -> AnotacionMapa:
    a = db.get(AnotacionMapa, anotacion_id)
    if not a:
        raise NotFoundError("Anotación no encontrada")
    return a


def actualizar_anotaciones(db: Session, anotaciones) -> int:
    """Guarda en lote texto/geometría/rotación/color de las anotaciones editadas."""
    actualizados = 0
    for item in anotaciones:
        a = db.get(AnotacionMapa, item.id)
        if not a:
            continue
        a.texto = item.texto
        a.pos_x = item.pos_x
        a.pos_y = item.pos_y
        a.ancho = item.ancho
        a.alto = item.alto
        a.rotacion = item.rotacion
        a.color = item.color
        actualizados += 1
    db.commit()
    return actualizados


def eliminar_anotacion(db: Session, anotacion_id: uuid.UUID) -> None:
    a = obtener_anotacion(db, anotacion_id)
    db.delete(a)
    db.commit()


def eliminar_estante(db: Session, estante_id: uuid.UUID) -> None:
    """RN-08: no se puede eliminar un estante con libros asignados."""
    e = obtener_estante(db, estante_id)
    total = db.query(func.count(Libro.id)).filter(Libro.estante_id == e.id).scalar() or 0
    if total > 0:
        raise ConflictError(
            f"El estante '{e.codigo}' tiene {total} libro(s) asignado(s). "
            "Reasignalos o dejalos 'Sin ubicar' antes de eliminarlo."
        )
    db.delete(e)
    db.commit()


# ─── Escritura: Colección ─────────────────────────────────────────────────────

# ─── Escritura: Zona (RF-11) ──────────────────────────────────────────────────

def obtener_zona(db: Session, zona_id: uuid.UUID) -> Zona:
    z = db.get(Zona, zona_id)
    if not z:
        raise NotFoundError("Zona no encontrada")
    return z


def crear_zona(db: Session, data: ZonaCreate) -> Zona:
    existe = db.query(Zona).filter(func.lower(Zona.nombre) == data.nombre.lower()).first()
    if existe:
        raise ConflictError(f"Ya existe la zona '{data.nombre}'")
    z = Zona(nombre=data.nombre, orden=data.orden)
    db.add(z)
    db.commit()
    db.refresh(z)
    return z


def actualizar_zona(db: Session, zona_id: uuid.UUID, data: ZonaUpdate) -> Zona:
    z = obtener_zona(db, zona_id)
    cambios = data.model_dump(exclude_unset=True)
    if "nombre" in cambios:
        dup = (
            db.query(Zona)
            .filter(func.lower(Zona.nombre) == cambios["nombre"].lower(), Zona.id != zona_id)
            .first()
        )
        if dup:
            raise ConflictError(f"Ya existe la zona '{cambios['nombre']}'")
    for campo, valor in cambios.items():
        setattr(z, campo, valor)
    db.commit()
    db.refresh(z)
    return z


def eliminar_zona(db: Session, zona_id: uuid.UUID) -> None:
    """No se puede eliminar una zona con estantes (mismo criterio que RN-08)."""
    z = obtener_zona(db, zona_id)
    total = db.query(func.count(Estante.id)).filter(Estante.zona_id == z.id).scalar() or 0
    if total > 0:
        raise ConflictError(
            f"La zona '{z.nombre}' tiene {total} estante(s). "
            "Movelos a otra zona antes de eliminarla."
        )
    db.delete(z)
    db.commit()


# ─── Escritura: Colección (RN-10) ─────────────────────────────────────────────

def crear_coleccion(db: Session, data: ColeccionCreate) -> Coleccion:
    existe = db.query(Coleccion).filter(func.lower(Coleccion.nombre) == data.nombre.lower()).first()
    if existe:
        raise ConflictError(f"Ya existe la colección '{data.nombre}'")
    col = Coleccion(nombre=data.nombre, descripcion=data.descripcion)
    db.add(col)
    db.commit()
    db.refresh(col)
    return col
