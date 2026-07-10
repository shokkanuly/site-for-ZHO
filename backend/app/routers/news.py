from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.news import News
from app.schemas.news import NewsCreate, NewsResponse
from app.services.tg_auth import get_current_tg_user

router = APIRouter(prefix="/news", tags=["news"])

@router.get("", response_model=List[NewsResponse])
async def list_news(
    project_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    List all news.
    If project_id is provided, returns news specifically for that project.
    Otherwise, returns all news (both center-wide and project-specific).
    """
    if project_id is not None:
        # Show specific project news OR general news (project_id is null)
        stmt = (
            select(News)
            .where(or_(News.project_id == project_id, News.project_id == None))
            .order_by(News.published_at.desc())
            .options(selectinload(News.project), selectinload(News.author))
        )
    else:
        stmt = (
            select(News)
            .order_by(News.published_at.desc())
            .options(selectinload(News.project), selectinload(News.author))
        )
        
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("", response_model=NewsResponse, status_code=201)
async def create_news(
    payload: NewsCreate,
    tg_user: dict = Depends(get_current_tg_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a news article. Requires super_admin or project_admin role.
    Project admins can only publish news associated with their own project.
    """
    user_id = tg_user["id"]
    user = await db.get(User, user_id)
    if not user or user.role not in ["super_admin", "project_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can publish news"
        )

    target_project_id = payload.project_id
    if user.role == "project_admin":
        # Force project_admin to only publish to their assigned project
        target_project_id = user.project_id

    new_news = News(
        project_id=target_project_id,
        title=payload.title,
        body=payload.body,
        author_id=user.id
    )
    
    db.add(new_news)
    await db.commit()
    await db.refresh(new_news)

    # Reload with relations
    stmt = (
        select(News)
        .where(News.id == new_news.id)
        .options(selectinload(News.project), selectinload(News.author))
    )
    res = await db.execute(stmt)
    return res.scalar_one()
