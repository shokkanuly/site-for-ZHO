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
async def login(
    payload: Dict[str, str], # Expects {"username": "..."}
    db: AsyncSession = Depends(get_db)
):
    """
    Login a user using their username.
    """
    username = payload.get("username", "").strip().lower()

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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Пользователь не найден. Обратитесь к администратору для создания учетной записи."
        )

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
