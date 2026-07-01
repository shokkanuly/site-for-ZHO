import json
import urllib.parse
from typing import Dict, Any, Optional
from fastapi import HTTPException, Header, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User

def verify_telegram_data(init_data: str) -> Optional[Dict[str, Any]]:
    """
    Standalone validation helper for WebSockets connection tokens.
    Accepts raw user ID as an integer, or URL-encoded JSON string representing the user.
    """
    if not init_data:
        return None

    try:
        # Check if it is a raw user ID integer
        user_id = int(init_data)
        return {
            "id": user_id,
            "first_name": f"Volunteer_{user_id}",
            "username": f"volunteer_{user_id}"
        }
    except ValueError:
        # Check if it is a JSON serialized user string
        try:
            parsed = json.loads(urllib.parse.unquote(init_data))
            if isinstance(parsed, dict) and "id" in parsed:
                return parsed
        except Exception:
            pass
    return None

async def get_current_tg_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    FastAPI dependency to extract and verify the User from the Authorization header.
    Expects format: Bearer <user_id>
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header. Expected Bearer <user_id>."
        )
    
    try:
        user_id_str = authorization.split(" ", 1)[1]
        user_id = int(user_id_str)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization token format."
        )
        
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found in system."
        )
        
    return {
        "id": user.id,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role,
        "points": user.points
    }
