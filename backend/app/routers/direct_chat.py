"""
Direct Chat Router — Real-time WebSocket chat for internal staff communication.

Rooms:
  - room_key="leaders"      → All project_admin users (leader channel)
  - room_key="project_N"    → Per-project channel: project_admin + all coordinators of project N

WebSocket endpoint: /api/chat/ws/{room_key}?user_id=XXX
REST endpoints:
  GET /api/chat/rooms          → list available rooms for caller
  GET /api/chat/{room_key}/messages  → history
"""
import asyncio
import json
from typing import Dict, List, Set, Optional
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, HTTPException, Header
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.direct_chat import DirectChatRoom, DirectChatMessage

router = APIRouter(prefix="/chat", tags=["direct_chat"])


# ─── WebSocket Connection Manager ───────────────────────────────────────────

class DirectChatManager:
    def __init__(self):
        # room_key -> set of (websocket, user_id) tuples
        self.rooms: Dict[str, Set[WebSocket]] = {}
        self.ws_user: Dict[WebSocket, int] = {}  # ws -> user_id

    async def connect(self, room_key: str, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if room_key not in self.rooms:
            self.rooms[room_key] = set()
        self.rooms[room_key].add(websocket)
        self.ws_user[websocket] = user_id

    async def disconnect(self, room_key: str, websocket: WebSocket):
        if room_key in self.rooms:
            self.rooms[room_key].discard(websocket)
        self.ws_user.pop(websocket, None)

    async def broadcast(self, room_key: str, payload: dict, exclude_ws: WebSocket = None):
        if room_key not in self.rooms:
            return
        dead = set()
        for ws in self.rooms[room_key]:
            if ws is exclude_ws:
                continue
            try:
                await ws.send_json(payload)
            except Exception:
                dead.add(ws)
        for ws in dead:
            await self.disconnect(room_key, ws)

    async def send_to_all(self, room_key: str, payload: dict):
        """Broadcast including the sender."""
        await self.broadcast(room_key, payload, exclude_ws=None)


manager = DirectChatManager()


# ─── Helper: get or create room ──────────────────────────────────────────────

async def get_or_create_room(room_key: str, db: AsyncSession) -> DirectChatRoom:
    stmt = select(DirectChatRoom).where(DirectChatRoom.room_key == room_key)
    res = await db.execute(stmt)
    room = res.scalar_one_or_none()
    if not room:
        name_map = {
            "leaders": "🏆 Канал руководителей",
            "project_2": "💛 Шаңырақ — Руководитель + Координаторы",
            "project_3": "🌲 Жасыл Ел — Руководитель + Координаторы",
            "project_4": "🧹 Таза Қазақстан — Руководитель + Координаторы",
            "project_5": "🛡️ Заң мен Тәртіп — Руководитель + Координаторы",
            "project_1": "🏢 Zhastar HQ — Руководитель + Координаторы",
        }
        room = DirectChatRoom(
            room_key=room_key,
            name=name_map.get(room_key, f"Канал {room_key}")
        )
        db.add(room)
        await db.commit()
        await db.refresh(room)
    return room


async def get_caller(authorization: Optional[str], user_id_query: Optional[int], db: AsyncSession) -> Optional[User]:
    """Extract caller from Authorization header or user_id query param."""
    uid = None
    if authorization and authorization.startswith("Bearer "):
        try:
            uid = int(authorization.split(" ", 1)[1])
        except ValueError:
            pass
    if uid is None and user_id_query:
        uid = user_id_query
    if uid is None:
        return None
    return await db.get(User, uid)


def allowed_rooms_for(user: User) -> List[str]:
    """Return room keys this user may access."""
    rooms = []
    if user.role == "super_admin":
        rooms.append("leaders")
        for pid in [1, 2, 3, 4, 5]:
            rooms.append(f"project_{pid}")
    elif user.role == "project_admin":
        rooms.append("leaders")
        if user.project_id:
            rooms.append(f"project_{user.project_id}")
    elif user.role == "coordinator":
        if user.project_id:
            rooms.append(f"project_{user.project_id}")
    return rooms


# ─── REST Endpoints ──────────────────────────────────────────────────────────

@router.get("/rooms")
async def list_rooms(
    authorization: Optional[str] = Header(None),
    user_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Return the list of chat rooms available to the caller."""
    user = await get_caller(authorization, user_id, db)
    if not user or user.role not in ["super_admin", "project_admin", "coordinator"]:
        raise HTTPException(status_code=403, detail="Staff access only")

    keys = allowed_rooms_for(user)
    result = []
    for key in keys:
        room = await get_or_create_room(key, db)
        # Count unread (simplified: just return last message)
        stmt = (
            select(DirectChatMessage)
            .where(DirectChatMessage.room_id == room.id)
            .order_by(DirectChatMessage.created_at.desc())
            .limit(1)
            .options(selectinload(DirectChatMessage.sender))
        )
        last_msg_result = await db.execute(stmt)
        last_msg = last_msg_result.scalar_one_or_none()
        result.append({
            "room_key": room.room_key,
            "name": room.name,
            "last_message": {
                "text": last_msg.message if last_msg else None,
                "sender": last_msg.sender.first_name if last_msg else None,
                "at": last_msg.created_at.isoformat() if last_msg else None
            } if last_msg else None
        })
    return result


@router.get("/{room_key}/messages")
async def get_room_messages(
    room_key: str,
    limit: int = 100,
    authorization: Optional[str] = Header(None),
    user_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Return chat history for a room."""
    user = await get_caller(authorization, user_id, db)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    if room_key not in allowed_rooms_for(user):
        raise HTTPException(status_code=403, detail="Access denied to this chat room")

    room = await get_or_create_room(room_key, db)
    stmt = (
        select(DirectChatMessage)
        .where(DirectChatMessage.room_id == room.id)
        .order_by(DirectChatMessage.created_at.asc())
        .limit(limit)
        .options(selectinload(DirectChatMessage.sender))
    )
    result = await db.execute(stmt)
    messages = result.scalars().all()
    return [
        {
            "id": m.id,
            "room_key": room_key,
            "sender_id": m.sender_id,
            "sender_name": m.sender.first_name if m.sender else "Unknown",
            "sender_role": m.sender.role if m.sender else "unknown",
            "message": m.message,
            "created_at": m.created_at.isoformat()
        }
        for m in messages
    ]


# ─── WebSocket ───────────────────────────────────────────────────────────────

@router.websocket("/ws/{room_key}")
async def websocket_direct_chat(
    websocket: WebSocket,
    room_key: str,
    user_id: int = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """
    WebSocket direct chat room.
    Connect: ws://host/api/chat/ws/{room_key}?user_id={id}
    """
    user = await db.get(User, user_id)
    if not user or user.role not in ["super_admin", "project_admin", "coordinator"]:
        await websocket.close(code=4003, reason="Staff access only")
        return

    if room_key not in allowed_rooms_for(user):
        await websocket.close(code=4004, reason="Access denied to this room")
        return

    room = await get_or_create_room(room_key, db)
    await manager.connect(room_key, websocket, user.id)

    # Send join notification to room
    await manager.broadcast(room_key, {
        "type": "system",
        "message": f"{user.first_name} вошёл в чат",
        "at": datetime.now(timezone.utc).isoformat()
    }, exclude_ws=websocket)

    try:
        while True:
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
                msg_text = payload.get("message", "").strip()
            except Exception:
                msg_text = data.strip()

            if not msg_text:
                continue

            # Save to DB
            chat_msg = DirectChatMessage(
                room_id=room.id,
                sender_id=user.id,
                message=msg_text,
                created_at=datetime.now(timezone.utc).replace(tzinfo=None)
            )
            db.add(chat_msg)
            await db.commit()
            await db.refresh(chat_msg)

            # Broadcast to all in room
            broadcast_payload = {
                "type": "message",
                "id": chat_msg.id,
                "room_key": room_key,
                "sender_id": user.id,
                "sender_name": user.first_name,
                "sender_role": user.role,
                "message": msg_text,
                "created_at": chat_msg.created_at.isoformat()
            }
            await manager.send_to_all(room_key, broadcast_payload)

    except WebSocketDisconnect:
        await manager.disconnect(room_key, websocket)
        await manager.broadcast(room_key, {
            "type": "system",
            "message": f"{user.first_name} покинул чат",
            "at": datetime.now(timezone.utc).isoformat()
        })
    except Exception:
        await manager.disconnect(room_key, websocket)
