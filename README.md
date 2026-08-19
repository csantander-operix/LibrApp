# LibrApp — Librería Rodolfo Walsh (UNLa)

Plataforma web para **localizar libros** en la Librería Rodolfo Walsh de la UNLa:
vincula el catálogo bibliográfico con un **mapa 2D interactivo** de estantes, con
**autoconsulta pública** (sin login) y **panel de administración** (con login JWT).

> Alcance del proyecto: localización y catalogación de ejemplares. **Fuera de
> alcance**: control de stock, facturación y remitos (ver Análisis Funcional).

## Stack

- **Backend:** Python 3.12 · FastAPI · SQLAlchemy 2 · Alembic · PostgreSQL 16 · JWT (bcrypt)
- **Frontend:** React 18 · Vite · TypeScript · Tailwind CSS v4 · TanStack Query · React Router
- **Infra:** Docker Compose (db + backend + frontend)

## Cómo levantarlo

Requisitos: Docker Desktop.

```bash
docker compose up --build
```

Servicios:

| Servicio  | URL                              |
|-----------|----------------------------------|
| Frontend  | http://localhost:5175            |
| Backend   | http://localhost:8000            |
| API docs  | http://localhost:8000/docs       |
| Health    | http://localhost:8000/health     |
| Postgres  | localhost:5434 (usuario/pass `librapp`) |

Al arrancar, el backend aplica las migraciones Alembic y siembra datos de
desarrollo (usuario admin + zona + colecciones + estantes + libros de ejemplo).

### Credenciales de administrador (seed dev)

- **Usuario:** `admin`
- **Contraseña:** `Admin1234!`

(Configurables en `backend/.env` → `ADMIN_USERNAME` / `ADMIN_PASSWORD`.)

## Rutas

- `/` — Consulta pública de autoconsulta (sin login).
- `/login` — Acceso del administrador.
- `/admin` — Dashboard con KPIs del catálogo (requiere sesión).
- `/admin/catalogo` — ABM de libros: alta/edición/baja, precio, filtros y búsqueda (RF-04/RF-06/RF-09).
- `/admin/estantes` — ABM de estantes/secciones (RF-02).
- `/admin/mapa` — Editor de mapa 2D con drag & drop de estantes y gestión de zonas/pisos (RF-01/RF-10/RF-11/CU-05).
- `/admin/importar` — Importación de inventario desde Excel/CSV con previsualización (RF-05/CU-04).

## Estructura

```
LibrApp/
├── docker-compose.yml
├── backend/
│   ├── app/
│   │   ├── core/        # config, database, security, deps
│   │   ├── shared/      # Base/mixins, exceptions
│   │   └── modules/     # auth, catalogo, dashboard
│   ├── alembic/         # migraciones
│   └── scripts/         # db_migrate
└── frontend/
    └── src/
        ├── app/         # App, providers, rutas
        ├── modules/     # auth, dashboard, public
        ├── shared/      # componentes UI, layout, guard
        └── lib/         # axios, utils
```

## Estado actual

✅ **Entrega 1** — Base corriendo end-to-end: login JWT → Dashboard. Modelo de datos
completo (Usuario, Zona, Colección, Estante, Libro) y lectura pública del catálogo.

✅ **Entrega 2** — ABM de catálogo + importador:
- Libros: alta/edición/baja + actualización de precio, con validaciones (ISBN único
  RN-01, obligatorios RN-02). Tabla con búsqueda y filtros por colección/estante/sin-ubicar.
- Estantes: ABM con código único por zona (RN-04) y bloqueo de borrado con libros (RN-08).
- Importador Excel/CSV tolerante a los archivos reales (fila de título, delimitador `;`,
  precios `$ 25.000,00`, columnas faltantes): previsualización (dry-run) → confirmación,
  upsert por ISBN o por título+editorial (idempotente), reporte de creados/actualizados/sin-ubicar.

✅ **Entrega 3** — Mapa interactivo 2D:
- Plano con estantes clicables (RF-01); click en un estante abre el popup con sus libros (RF-03).
- Editor admin con drag & drop para reubicar estantes y guardado en lote (RF-10/CU-05),
  más agregar/eliminar estantes sobre el plano.
- Vista pública: al buscar, los estantes con coincidencias se resaltan en el mapa (RF-13);
  los precios no se muestran en el popup público (P-06).

✅ **Entrega 4** — Múltiples zonas/pisos (RF-11):
- ABM de zonas desde el editor de mapa (crear/renombrar/eliminar), con bloqueo de
  borrado si la zona tiene estantes.
- Selector de zona en el editor y en la vista pública; el mapa se filtra por zona.
- En la búsqueda pública, si las coincidencias están en otro piso, se indica en qué zona.

**Próximas entregas**: vista kiosco full-screen para la entrada de la librería (RF-14, Baja).
