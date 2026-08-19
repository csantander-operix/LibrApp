"""Aplica `alembic upgrade head` al arrancar el contenedor.

Se ejecuta antes de uvicorn (ver docker-compose.yml). Reintenta unas veces
porque el backend puede arrancar milésimas antes de que Postgres acepte
conexiones, aun con el healthcheck.
"""
import sys
import time

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError

from app.core.config import get_settings

settings = get_settings()


def _esperar_db(max_intentos: int = 20, espera_s: float = 1.5) -> None:
    url = settings.DATABASE_URL
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    engine = create_engine(url)
    for intento in range(1, max_intentos + 1):
        try:
            with engine.connect():
                return
        except OperationalError:
            print(f"[db_migrate] DB no lista (intento {intento}/{max_intentos})…", flush=True)
            time.sleep(espera_s)
    print("[db_migrate] La base nunca estuvo disponible.", file=sys.stderr)
    sys.exit(1)


def main() -> None:
    _esperar_db()
    cfg = Config("alembic.ini")
    command.upgrade(cfg, "head")
    print("[db_migrate] Migraciones aplicadas (head).", flush=True)


if __name__ == "__main__":
    main()
