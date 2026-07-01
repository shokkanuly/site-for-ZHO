from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.event import Event, EventRegistration
from app.schemas.event import EventCreate, EventResponse, EventRegistrationResponse
from app.services.tg_auth import get_current_tg_user

router = APIRouter(prefix="/events", tags=["events"])

@router.get("", response_model=List[EventResponse])
async def list_events(
    status_filter: Optional[str] = "active",
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    List all volunteer events filtered by status and optionally by category.
    """
    query_conditions = [Event.status == status_filter]
    if category and category != "all":
        query_conditions.append(Event.category == category)
        
    stmt = (
        select(Event)
        .where(and_(*query_conditions))
        .order_by(Event.event_date.asc())
        .options(selectinload(Event.organizer))
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=EventResponse, status_code=201)
async def create_event(
    event_data: EventCreate,
    tg_user: dict = Depends(get_current_tg_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new volunteer event. The user who creates it becomes the organizer.
    """
    # Ensure organizer is registered in database
    user_id = tg_user["id"]
    organizer = await db.get(User, user_id)
    if not organizer:
        organizer = User(
            id=user_id,
            username=tg_user.get("username"),
            first_name=tg_user.get("first_name", "Organizer"),
            last_name=tg_user.get("last_name"),
            role="organizer" # Set organizer role
        )
        db.add(organizer)
        await db.commit()
        await db.refresh(organizer)
    elif organizer.role != "organizer":
        # Automatically elevate to organizer if they create an event
        organizer.role = "organizer"
        await db.commit()
        await db.refresh(organizer)

    new_event = Event(
        title=event_data.title,
        description=event_data.description,
        organizer_id=organizer.id,
        latitude=event_data.latitude,
        longitude=event_data.longitude,
        address=event_data.address,
        event_date=event_data.event_date,
        category=event_data.category,
        points_reward=event_data.points_reward,
        status="active"
    )
    
    db.add(new_event)
    await db.commit()
    await db.refresh(new_event)
    
    # Reload with organizer relation
    stmt = select(Event).where(Event.id == new_event.id).options(selectinload(Event.organizer))
    res = await db.execute(stmt)
    return res.scalar_one()


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(
    event_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed information about an event.
    """
    stmt = select(Event).where(Event.id == event_id).options(selectinload(Event.organizer))
    result = await db.execute(stmt)
    event = result.scalar_one_or_none()
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.post("/{event_id}/register", response_model=EventRegistrationResponse)
async def register_for_event(
    event_id: int,
    tg_user: dict = Depends(get_current_tg_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Register the current Telegram user for an event.
    """
    user_id = tg_user["id"]
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    if event.status != "active":
        raise HTTPException(status_code=400, detail="Cannot register for an inactive event")

    # Get or create user
    user = await db.get(User, user_id)
    if not user:
        user = User(
            id=user_id,
            username=tg_user.get("username"),
            first_name=tg_user.get("first_name", "Volunteer"),
            last_name=tg_user.get("last_name"),
            role="volunteer"
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    # Check if already registered
    stmt = select(EventRegistration).where(
        and_(
            EventRegistration.event_id == event_id,
            EventRegistration.user_id == user_id
        )
    )
    existing_reg = (await db.execute(stmt)).scalar_one_or_none()
    if existing_reg:
        raise HTTPException(status_code=400, detail="Already registered for this event")

    registration = EventRegistration(
        event_id=event_id,
        user_id=user_id,
        status="joined"
    )
    db.add(registration)
    await db.commit()
    await db.refresh(registration)

    # Return registration with relationships
    stmt = (
        select(EventRegistration)
        .where(EventRegistration.id == registration.id)
        .options(selectinload(EventRegistration.event), selectinload(EventRegistration.user))
    )
    res = await db.execute(stmt)
    return res.scalar_one()


@router.delete("/{event_id}/register")
async def cancel_event_registration(
    event_id: int,
    tg_user: dict = Depends(get_current_tg_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Cancel registration for a volunteer event.
    """
    user_id = tg_user["id"]
    stmt = select(EventRegistration).where(
        and_(
            EventRegistration.event_id == event_id,
            EventRegistration.user_id == user_id
        )
    )
    reg = (await db.execute(stmt)).scalar_one_or_none()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")

    await db.delete(reg)
    await db.commit()
    return {"status": "cancelled"}


@router.post("/{event_id}/complete/{volunteer_id}", response_model=EventRegistrationResponse)
async def mark_registration_complete(
    event_id: int,
    volunteer_id: int,
    tg_user: dict = Depends(get_current_tg_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Organizer confirms that a volunteer participated in the event.
    Awards the event's point bounty to the volunteer.
    """
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    # Security: Verify the caller is the organizer of the event
    if event.organizer_id != tg_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the event organizer can mark volunteer registrations complete"
        )

    stmt = select(EventRegistration).where(
        and_(
            EventRegistration.event_id == event_id,
            EventRegistration.user_id == volunteer_id
        )
    ).options(selectinload(EventRegistration.user))
    
    reg = (await db.execute(stmt)).scalar_one_or_none()
    if not reg:
        raise HTTPException(status_code=404, detail="Volunteer registration not found")

    if reg.status == "completed":
        raise HTTPException(status_code=400, detail="Registration already marked completed")

    # Update registration status and award points
    reg.status = "completed"
    reg.user.points += event.points_reward
    
    await db.commit()
    await db.refresh(reg)

    # Return refreshed registration
    stmt = (
        select(EventRegistration)
        .where(EventRegistration.id == reg.id)
        .options(selectinload(EventRegistration.event), selectinload(EventRegistration.user))
    )
    res = await db.execute(stmt)
    return res.scalar_one()


@router.get("/{event_id}/volunteers", response_model=List[EventRegistrationResponse])
async def list_event_volunteers(
    event_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    List all volunteer registrations for a specific event.
    """
    stmt = (
        select(EventRegistration)
        .where(EventRegistration.event_id == event_id)
        .options(selectinload(EventRegistration.user))
    )
    result = await db.execute(stmt)
    return result.scalars().all()
