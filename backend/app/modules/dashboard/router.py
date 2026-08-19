from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.modules.auth.models import Usuario
from app.modules.dashboard import service
from app.modules.dashboard.schemas import DashboardStats

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("", response_model=DashboardStats)
def stats(db: Session = Depends(get_db), _: Usuario = Depends(get_current_user)):
    """KPIs del panel admin. Requiere login (primera vista tras el acceso)."""
    return service.obtener_stats(db)
