from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any

from app.database import get_db
from app.models.event import Event

router = APIRouter(prefix="/maps", tags=["maps"])

# Temirtau central coordinates
TEMIRTAU_CENTER = {
    "latitude": 50.0633,
    "longitude": 72.9644,
    "zoom": 12,
    "bounds": {
        "min_latitude": 50.00,
        "max_latitude": 50.12,
        "min_longitude": 72.85,
        "max_longitude": 73.08
    }
}

@router.get("/config")
async def get_map_config() -> Dict[str, Any]:
    """
    Returns default coordinate configs for centering maps on Temirtau, Kazakhstan.
    """
    return TEMIRTAU_CENTER


@router.get("/markers")
async def get_active_markers(db: AsyncSession = Depends(get_db)) -> List[Dict[str, Any]]:
    """
    Retrieve map marker objects for all active events.
    """
    stmt = select(Event).where(Event.status == "active")
    result = await db.execute(stmt)
    events = result.scalars().all()
    
    markers = []
    for event in events:
        markers.append({
            "id": event.id,
            "title": event.title,
            "latitude": event.latitude,
            "longitude": event.longitude,
            "address": event.address,
            "points_reward": event.points_reward,
            "event_date": event.event_date.isoformat()
        })
        
    return markers
