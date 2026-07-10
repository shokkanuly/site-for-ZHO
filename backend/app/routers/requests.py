from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
import random

from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.request import Request
from app.schemas.request import RequestCreate, RequestResponse
from app.services.tg_auth import get_current_tg_user

router = APIRouter(prefix="/requests", tags=["requests"])

@router.post("", response_model=RequestResponse, status_code=201)
async def create_request(
    payload: RequestCreate,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Submit a help request, official letter, or other request.
    If authenticated, links to the logged-in user.
    If anonymous, auto-registers them as a community_user.
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

    # 3. If target_project_id is provided, verify it exists
    if payload.target_project_id:
        project = await db.get(Project, payload.target_project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Target project not found")

    new_request = Request(
        requester_id=user_id,
        target_project_id=payload.target_project_id,
        type=payload.type,
        subject=payload.subject,
        description=payload.description,
        status="pending"
    )
    db.add(new_request)
    await db.commit()
    await db.refresh(new_request)
    
    # Reload with relations
    stmt = (
        select(Request)
        .where(Request.id == new_request.id)
        .options(selectinload(Request.requester), selectinload(Request.target_project))
    )
    res = await db.execute(stmt)
    return res.scalar_one()

@router.get("/my", response_model=List[RequestResponse])
async def list_my_requests(
    tg_user: dict = Depends(get_current_tg_user),
    db: AsyncSession = Depends(get_db)
):
    """List requests submitted by the current user."""
    from sqlalchemy.orm import selectinload
    stmt = (
        select(Request)
        .where(Request.requester_id == tg_user["id"])
        .order_by(Request.created_at.desc())
        .options(selectinload(Request.requester), selectinload(Request.target_project))
    )
    result = await db.execute(stmt)
    return result.scalars().all()

