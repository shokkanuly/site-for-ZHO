from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.event import Event
from app.models.booking import Booking

router = APIRouter(prefix="/calendar", tags=["calendar"])

@router.get("", response_model=List[Dict[str, Any]])
async def get_calendar(db: AsyncSession = Depends(get_db)):
    """
    Compile a unified schedule aggregating all active events 
    and approved room bookings in Zhastar Ortalygy.
    """
    calendar_items = []

    # 1. Fetch active events
    stmt_events = (
        select(Event)
        .where(Event.status == "active")
        .options(selectinload(Event.project), selectinload(Event.room))
    )
    result_events = await db.execute(stmt_events)
    events = result_events.scalars().all()

    for ev in events:
        # Extract date and time
        ev_date = ev.event_date.date()
        ev_time = ev.event_date.time().strftime("%H:%M")
        
        # Approximate time_end (say 2 hours later)
        from datetime import datetime, timedelta
        dt_end = ev.event_date + timedelta(hours=2)
        ev_time_end = dt_end.time().strftime("%H:%M")

        calendar_items.append({
            "type": "event",
            "id": ev.id,
            "title": ev.title,
            "description": ev.description,
            "date": ev_date.isoformat(),
            "time_start": ev_time,
            "time_end": ev_time_end,
            "category": ev.category, # e.g. jasyl_el, shanyraq, etc.
            "project_name": ev.project.name if ev.project else "Общий",
            "room_name": ev.room.name if ev.room else ev.address,
        })

    # 2. Fetch approved bookings
    stmt_bookings = (
        select(Booking)
        .where(Booking.status == "approved")
        .options(selectinload(Booking.room), selectinload(Booking.user))
    )
    result_bookings = await db.execute(stmt_bookings)
    bookings = result_bookings.scalars().all()

    for bk in bookings:
        calendar_items.append({
            "type": "booking",
            "id": bk.id,
            "title": f"Занято: {bk.room.name}",
            "description": f"Бронь одобрена для: {bk.user.first_name}",
            "date": bk.date.isoformat(),
            "time_start": bk.time_start,
            "time_end": bk.time_end,
            "category": "booking",
            "project_name": "Жастар орталығы",
            "room_name": bk.room.name
        })

    # Sort items chronologically
    calendar_items.sort(key=lambda x: (x["date"], x["time_start"]))
    return calendar_items
