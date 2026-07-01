from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse, UserCreate
from app.services.tg_auth import get_current_tg_user, verify_telegram_data

router = APIRouter(prefix="/auth", tags=["auth"])

import random

@router.post("/login", response_model=UserResponse)
async def login_or_register(
    payload: Dict[str, str], # Expects {"username": "...", "first_name": "..."}
    db: AsyncSession = Depends(get_db)
):
    """
    Login or register a volunteer using their username.
    """
    username = payload.get("username", "").strip().lower()
    first_name = payload.get("first_name", "").strip()

    if not username:
        raise HTTPException(status_code=400, detail="Username is required")

    # Clean username prefix if user typed '@'
    if username.startswith("@"):
        username = username[1:]

    # Check if user already exists by username
    stmt = select(User).where(User.username == username)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        if not first_name:
            raise HTTPException(status_code=400, detail="First name is required to register a new account")

        # Generate a unique integer ID
        while True:
            new_id = random.randint(100000, 999999)
            existing = await db.get(User, new_id)
            if not existing:
                user_id = new_id
                break

        user = User(
            id=user_id,
            username=username,
            first_name=first_name,
            role="volunteer",
            points=0
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    else:
        # If user exists and first_name was sent, update it
        if first_name:
            user.first_name = first_name
            await db.commit()
            await db.refresh(user)

    return user

@router.get("/me", response_model=UserResponse)
async def get_me(
    tg_user: dict = Depends(get_current_tg_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve the current logged-in user profile, synchronized with Telegram authentication.
    """
    user = await db.get(User, tg_user["id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.get("/leaderboard", response_model=List[UserResponse])
async def get_leaderboard(
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    """
    Get top volunteers by points reward (gamification aspect).
    """
    stmt = select(User).order_by(desc(User.points)).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()
