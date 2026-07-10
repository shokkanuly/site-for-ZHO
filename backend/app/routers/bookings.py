from typing import List, Optional
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
import random

from app.database import get_db
from app.models.user import User
from app.models.room import Room
from app.models.booking import Booking
from app.schemas.room import RoomResponse
from app.schemas.booking import BookingCreate, BookingResponse
from app.services.tg_auth import get_current_tg_user

router = APIRouter(prefix="/bookings", tags=["bookings"])

@router.get("/rooms", response_model=List[RoomResponse])
async def list_rooms(db: AsyncSession = Depends(get_db)):
    """List all available rooms inside Zhastar Ortalygy building."""
    stmt = select(Room).order_by(Room.name.asc())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("", response_model=BookingResponse, status_code=201)
async def create_booking(
    payload: BookingCreate,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Submit a room booking request.
    If the client is authenticated (Authorization header), use their account.
    If the client is anonymous and supplies guest details, auto-register them as a community_user.
    """
    user_id = None
    
    # 1. Try to get authenticated user
    if authorization and authorization.startswith("Bearer "):
        try:
            val = authorization.split(" ", 1)[1]
            user_id = int(val)
            user = await db.get(User, user_id)
            if not user:
                raise HTTPException(status_code=401, detail="User not found")
        except ValueError:
            pass

    # 2. If not authenticated, try auto-registering using guest details
    if not user_id:
        if not payload.guest_name or not payload.guest_phone:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required or guest details (name, phone) must be provided."
            )
        
        # Look up existing user by phone
        phone_clean = payload.guest_phone.strip()
        stmt = select(User).where(User.phone == phone_clean)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            # Create a community user
            while True:
                new_id = random.randint(100000, 999999)
                existing = await db.get(User, new_id)
                if not existing:
                    user_id = new_id
                    break
            
            # Username from name
            uname = payload.guest_name.lower().replace(" ", "_")[:20] + str(random.randint(10, 99))
            user = User(
                id=user_id,
                username=uname,
                first_name=payload.guest_name,
                phone=phone_clean,
                age=payload.guest_age,
                role="community_user",
                points=0
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        else:
            user_id = user.id

    # 3. Verify room exists
    room = await db.get(Room, payload.room_id)
    if not room:
        raise HTTPException(status_code=444, detail="Room not found")

    # 4. Check double booking for the same room, date, and overlapping times
    # (In a simple implementation, we check if there's any approved booking overlapping)
    # Since it's a booking proposal, we let them create it, but project admin will approve/reject it.
    
    new_booking = Booking(
        room_id=payload.room_id,
        requested_by=user_id,
        event_id=payload.event_id,
        date=payload.date,
        time_start=payload.time_start,
        time_end=payload.time_end,
        status="pending"
    )
    db.add(new_booking)
    await db.commit()
    await db.refresh(new_booking)
    
    # Reload with relations
    from sqlalchemy.orm import selectinload
    stmt = (
        select(Booking)
        .where(Booking.id == new_booking.id)
        .options(selectinload(Booking.room), selectinload(Booking.user))
    )
    res = await db.execute(stmt)
    return res.scalar_one()

@router.get("/my", response_model=List[BookingResponse])
async def list_my_bookings(
    tg_user: dict = Depends(get_current_tg_user),
    db: AsyncSession = Depends(get_db)
):
    """List bookings requested by the current user."""
    from sqlalchemy.orm import selectinload
    stmt = (
        select(Booking)
        .where(Booking.requested_by == tg_user["id"])
        .order_by(Booking.created_at.desc())
        .options(selectinload(Booking.room), selectinload(Booking.user))
    )
    result = await db.execute(stmt)
    return result.scalars().all()

