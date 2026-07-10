from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_, update
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
import random

from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.volunteer_profile import VolunteerProfile
from app.models.request import Request
from app.models.booking import Booking
from app.models.event import Event
from app.schemas.user import UserResponse
from app.schemas.volunteer_profile import VolunteerProfileResponse, VolunteerProfileCreate
from app.schemas.booking import BookingResponse
from app.schemas.request import RequestResponse, RequestStatusUpdate
from app.schemas.project import ProjectResponse
from app.schemas.event import EventResponse
from app.services.tg_auth import get_current_tg_user

router = APIRouter(prefix="/admin", tags=["admin"])

async def verify_admin_role(tg_user: dict, db: AsyncSession) -> User:
    """Helper to verify caller is either a super_admin, project_admin, or coordinator."""
    user = await db.get(User, tg_user["id"])
    if not user or user.role not in ["super_admin", "project_admin", "coordinator"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Administrator privileges required."
        )
    return user

async def verify_super_admin(tg_user: dict, db: AsyncSession) -> User:
    """Helper to verify caller is a super_admin."""
    user = await db.get(User, tg_user["id"])
    if not user or user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Super Administrator privileges required."
        )
    return user

# ─── PROJECTS ───
@router.get("/projects", response_model=List[ProjectResponse])
async def list_projects(db: AsyncSession = Depends(get_db)):
    """List all sibling/core projects."""
    stmt = select(Project).order_by(Project.id.asc())
    result = await db.execute(stmt)
    return result.scalars().all()

# ─── PROJECT ADMIN CREATION (SUPER ADMIN ONLY) ───
@router.post("/project-admins", response_model=UserResponse, status_code=201)
async def create_project_admin(
    payload: Dict[str, Any], # username, first_name, project_id
    current_user: User = Depends(get_current_tg_user),
    db: AsyncSession = Depends(get_db)
):
    """Super Admin creates a new project_admin account."""
    await verify_super_admin(current_user, db)
    
    username = payload.get("username", "").strip().lower()
    first_name = payload.get("first_name", "").strip()
    project_id = payload.get("project_id")

    if not username or not first_name or not project_id:
        raise HTTPException(status_code=400, detail="username, first_name, and project_id are required")

    # Check project exists
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check username conflicts
    stmt = select(User).where(User.username == username)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    # Generate unique ID
    while True:
        new_id = random.randint(100000, 999999)
        id_conflict = await db.get(User, new_id)
        if not id_conflict:
            uid = new_id
            break

    new_admin = User(
        id=uid,
        username=username,
        first_name=first_name,
        role="project_admin",
        project_id=project_id,
        points=0
    )
    db.add(new_admin)
    await db.commit()
    await db.refresh(new_admin)
    return new_admin

@router.get("/project-admins", response_model=List[UserResponse])
async def list_project_admins(
    current_user: User = Depends(get_current_tg_user),
    db: AsyncSession = Depends(get_db)
):
    """Super Admin gets a list of all project_admin accounts."""
    await verify_super_admin(current_user, db)
    
    stmt = (
        select(User)
        .where(User.role == "project_admin")
        .order_by(User.first_name.asc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/events", response_model=List[EventResponse])
async def list_admin_events(
    current_user: User = Depends(get_current_tg_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all events.
    - Super Admin sees all events.
    - Project Admin sees only events matching their project_id.
    """
    admin = await verify_admin_role(current_user, db)
    
    if admin.role == "super_admin":
        stmt = (
            select(Event)
            .options(selectinload(Event.organizer))
            .order_by(Event.event_date.desc())
        )
    else:
        stmt = (
            select(Event)
            .where(Event.project_id == admin.project_id)
            .options(selectinload(Event.organizer))
            .order_by(Event.event_date.desc())
        )
        
    result = await db.execute(stmt)
    return result.scalars().all()

# ─── VOLUNTEER REGISTRY (SCOPED) ───
@router.post("/volunteers", response_model=VolunteerProfileResponse, status_code=201)
async def create_volunteer(
    payload: VolunteerProfileCreate,
    current_user: User = Depends(get_current_tg_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Project Admin or Super Admin creates a volunteer profile.
    Project Admins can only create profiles inside their own project.
    """
    admin = await verify_admin_role(current_user, db)
    
    # Scoping check for Project Admin & Coordinator
    if admin.role in ["project_admin", "coordinator"] and admin.project_id != payload.project_id:
        raise HTTPException(
            status_code=403,
            detail="You can only create volunteer profiles for your own project."
        )

    # Validate coordinator assignment
    assigned_coord_id = None
    if admin.role == "coordinator":
        assigned_coord_id = admin.id
    elif payload.coordinator_id:
        coord_check = await db.get(User, payload.coordinator_id)
        if not coord_check or coord_check.role != "coordinator":
            raise HTTPException(status_code=400, detail="Assigned coordinator not found or does not have coordinator role")
        if admin.role == "project_admin" and coord_check.project_id != admin.project_id:
            raise HTTPException(status_code=403, detail="Coordinator does not belong to your project")
        assigned_coord_id = payload.coordinator_id

    # 1. Get or create User
    username = payload.username.strip().lower()
    stmt = select(User).where(User.username == username)
    user = (await db.execute(stmt)).scalar_one_or_none()
    
    if not user:
        while True:
            new_id = random.randint(100000, 999999)
            id_conflict = await db.get(User, new_id)
            if not id_conflict:
                uid = new_id
                break
        
        user = User(
            id=uid,
            username=username,
            first_name=payload.first_name,
            phone=payload.phone,
            age=payload.age,
            role="volunteer",
            project_id=payload.project_id,
            points=0
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    else:
        # Check if already has a volunteer profile for this project
        stmt_prof = select(VolunteerProfile).where(
            and_(
                VolunteerProfile.user_id == user.id,
                VolunteerProfile.project_id == payload.project_id
            )
        )
        existing_profile = (await db.execute(stmt_prof)).scalar_one_or_none()
        if existing_profile:
            raise HTTPException(status_code=400, detail="User already has a volunteer profile for this project.")

    # 2. Create Volunteer Profile
    new_profile = VolunteerProfile(
        user_id=user.id,
        project_id=payload.project_id,
        skills=payload.skills,
        hours_logged=0,
        status="active",
        coordinator_id=assigned_coord_id
    )
    db.add(new_profile)
    await db.commit()
    await db.refresh(new_profile)

    # Reload profile with relations
    stmt_full = (
        select(VolunteerProfile)
        .where(VolunteerProfile.id == new_profile.id)
        .options(
            selectinload(VolunteerProfile.user),
            selectinload(VolunteerProfile.project),
            selectinload(VolunteerProfile.coordinator)
        )
    )
    res = await db.execute(stmt_full)
    return res.scalar_one()

@router.get("/volunteers", response_model=List[VolunteerProfileResponse])
async def list_volunteers(
    current_user: User = Depends(get_current_tg_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List volunteer profiles.
    - Super Admins see all profiles.
    - Project Admins see only profiles matching their project_id.
    - Coordinators see only profiles assigned directly to them.
    """
    admin = await verify_admin_role(current_user, db)
    
    if admin.role == "super_admin":
        stmt = (
            select(VolunteerProfile)
            .options(
                selectinload(VolunteerProfile.user),
                selectinload(VolunteerProfile.project),
                selectinload(VolunteerProfile.coordinator)
            )
        )
    elif admin.role == "project_admin":
        stmt = (
            select(VolunteerProfile)
            .where(VolunteerProfile.project_id == admin.project_id)
            .options(
                selectinload(VolunteerProfile.user),
                selectinload(VolunteerProfile.project),
                selectinload(VolunteerProfile.coordinator)
            )
        )
    else: # coordinator role
        if admin.project_id == 2: # Shanyrak coordinators share all volunteers of project 2
            stmt = (
                select(VolunteerProfile)
                .where(VolunteerProfile.project_id == admin.project_id)
                .options(
                    selectinload(VolunteerProfile.user),
                    selectinload(VolunteerProfile.project),
                    selectinload(VolunteerProfile.coordinator)
                )
            )
        else:
            stmt = (
                select(VolunteerProfile)
                .where(and_(
                    VolunteerProfile.project_id == admin.project_id,
                    VolunteerProfile.coordinator_id == admin.id
                ))
                .options(
                    selectinload(VolunteerProfile.user),
                    selectinload(VolunteerProfile.project),
                    selectinload(VolunteerProfile.coordinator)
                )
            )
        
    result = await db.execute(stmt)
    return result.scalars().all()

# ─── REQUESTS / LETTERS (SCOPED) ───
@router.get("/requests", response_model=List[RequestResponse])
async def list_requests(
    current_user: User = Depends(get_current_tg_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List letters/help requests.
    Super Admins see all requests.
    Project Admins see only requests targeted to their project.
    """
    admin = await verify_admin_role(current_user, db)
    
    if admin.role == "super_admin":
        stmt = (
            select(Request)
            .order_by(Request.created_at.desc())
            .options(selectinload(Request.requester), selectinload(Request.target_project))
        )
    else:
        stmt = (
            select(Request)
            .where(Request.target_project_id == admin.project_id)
            .order_by(Request.created_at.desc())
            .options(selectinload(Request.requester), selectinload(Request.target_project))
        )
        
    result = await db.execute(stmt)
    return result.scalars().all()

@router.patch("/requests/{request_id}/status", response_model=RequestResponse)
async def update_request_status(
    request_id: int,
    payload: RequestStatusUpdate,
    current_user: User = Depends(get_current_tg_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update request status or response note.
    Project Admins can only edit requests targeted to their project.
    """
    admin = await verify_admin_role(current_user, db)
    
    req = await db.get(Request, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    if admin.role == "project_admin" and req.target_project_id != admin.project_id:
        raise HTTPException(
            status_code=403,
            detail="You can only process requests directed to your own project."
        )

    req.status = payload.status
    if payload.response is not None:
        req.response = payload.response

    await db.commit()
    
    # Reload with relations
    stmt = (
        select(Request)
        .where(Request.id == request_id)
        .options(selectinload(Request.requester), selectinload(Request.target_project))
    )
    res = await db.execute(stmt)
    return res.scalar_one()

# ─── ROOM BOOKINGS (ADMIN PANEL) ───
@router.get("/bookings", response_model=List[BookingResponse])
async def list_bookings(
    current_user: User = Depends(get_current_tg_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all room bookings.
    Accessible by all admins, showing full room booking requests.
    """
    await verify_admin_role(current_user, db)
    
    stmt = (
        select(Booking)
        .order_by(Booking.date.asc(), Booking.time_start.asc())
        .options(selectinload(Booking.room), selectinload(Booking.user))
    )
    result = await db.execute(stmt)
    return result.scalars().all()

@router.patch("/bookings/{booking_id}/status", response_model=BookingResponse)
async def update_booking_status(
    booking_id: int,
    payload: Dict[str, str], # status = approved / rejected / pending
    current_user: User = Depends(get_current_tg_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Approve or reject a room booking.
    Super Admins can manage all bookings.
    Project Admins from the core project (Zhastar Ortalygy) can also manage bookings.
    """
    admin = await verify_admin_role(current_user, db)
    
    # Scoping: Only super admin or admin of core project (Zhastar Ortalygy - ID 1) can approve room bookings
    if admin.role == "project_admin" and admin.project_id != 1:
         raise HTTPException(
             status_code=403, 
             detail="Only Super Admin or Core Project Admin (Zhastar Ortalygy) can modify building bookings."
         )

    booking = await db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    new_status = payload.get("status")
    if new_status not in ["approved", "rejected", "pending"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    booking.status = new_status
    await db.commit()

    # Reload with relations
    stmt = (
        select(Booking)
        .where(Booking.id == booking_id)
        .options(selectinload(Booking.room), selectinload(Booking.user))
    )
    res = await db.execute(stmt)
    return res.scalar_one()

# ─── COORDINATORS REGISTRY (SCOPED) ───
@router.get("/coordinators", response_model=List[UserResponse])
async def list_coordinators(
    current_user: User = Depends(get_current_tg_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List coordinator accounts.
    - Super Admin sees all coordinators.
    - Project Admin sees only coordinators inside their project.
    """
    admin = await verify_admin_role(current_user, db)
    
    if admin.role == "super_admin":
        stmt = select(User).where(User.role == "coordinator").order_by(User.first_name.asc())
    else:
        stmt = select(User).where(
            and_(User.role == "coordinator", User.project_id == admin.project_id)
        ).order_by(User.first_name.asc())
        
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/coordinators", response_model=UserResponse, status_code=201)
async def create_coordinator(
    payload: Dict[str, Any], # username, first_name, project_id
    current_user: User = Depends(get_current_tg_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new coordinator account.
    - Project Admin can only create coordinators for their own project.
    """
    admin = await verify_admin_role(current_user, db)
    
    username = payload.get("username", "").strip().lower()
    first_name = payload.get("first_name", "").strip()
    project_id = payload.get("project_id")

    if admin.role == "project_admin":
        project_id = admin.project_id

    if not username or not first_name or not project_id:
        raise HTTPException(status_code=400, detail="username, first_name, and project_id are required")

    # Scoping check
    if admin.role == "project_admin" and admin.project_id != project_id:
        raise HTTPException(status_code=403, detail="You can only create coordinators for your own project.")

    # Check username conflicts
    stmt = select(User).where(User.username == username)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    # Generate unique ID
    while True:
        new_id = random.randint(100000, 999999)
        id_conflict = await db.get(User, new_id)
        if not id_conflict:
            uid = new_id
            break

    new_coord = User(
        id=uid,
        username=username,
        first_name=first_name,
        role="coordinator",
        project_id=project_id,
        points=0
    )
    db.add(new_coord)
    await db.commit()
    await db.refresh(new_coord)
    return new_coord

