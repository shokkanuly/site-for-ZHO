import asyncio
import json
from typing import Dict, List, Set, Optional
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.event import Event
from app.models.chat import ChatMessage
from app.schemas.chat import ChatMessageResponse
from app.services.tg_auth import verify_telegram_data
from app.services.redis_client import redis_client

router = APIRouter(prefix="/events", tags=["chat"])

# WebSocket Room Connection Manager with Redis Pub/Sub background tasks
class ChatConnectionManager:
    def __init__(self):
        # Maps event_id -> list of active WebSocket connections
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        # Maps event_id -> Redis Pub/Sub listener task
        self.redis_tasks: Dict[int, asyncio.Task] = {}

    async def connect(self, event_id: int, websocket: WebSocket):
        await websocket.accept()
        if event_id not in self.active_connections:
            self.active_connections[event_id] = set()
            # Start background Redis Pub/Sub listener for this event room
            self.redis_tasks[event_id] = asyncio.create_task(
                self._redis_pubsub_listener(event_id)
            )
        self.active_connections[event_id].add(websocket)

    async def disconnect(self, event_id: int, websocket: WebSocket):
        if event_id in self.active_connections:
            self.active_connections[event_id].discard(websocket)
            if not self.active_connections[event_id]:
                # No more users in this chatroom, clean up
                self.active_connections.pop(event_id)
                task = self.redis_tasks.pop(event_id, None)
                if task:
                    task.cancel()

    async def broadcast_to_local_room(self, event_id: int, message_data: dict):
        """Sends message to all WebSockets connected to this specific server instance."""
        if event_id in self.active_connections:
            disconnected_sockets = set()
            for connection in self.active_connections[event_id]:
                try:
                    await connection.send_json(message_data)
                except Exception:
                    disconnected_sockets.add(connection)
            
            for ws in disconnected_sockets:
                await self.disconnect(event_id, ws)

    async def _redis_pubsub_listener(self, event_id: int):
        """Listens to Redis Pub/Sub channel for this event room and broadcasts locally."""
        pubsub = redis_client.pubsub()
        channel_name = f"event_chat:{event_id}"
        await pubsub.subscribe(channel_name)
        
        try:
            while True:
                # Read messages from Redis subscription
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if message and message["type"] == "message":
                    payload = json.loads(message["data"])
                    await self.broadcast_to_local_room(event_id, payload)
                await asyncio.sleep(0.1)
        except asyncio.CancelledError:
            await pubsub.unsubscribe(channel_name)
            await pubsub.close()
        except Exception as e:
            # Re-subscribe on error
            await asyncio.sleep(1.0)
            self.redis_tasks[event_id] = asyncio.create_task(
                self._redis_pubsub_listener(event_id)
            )

manager = ChatConnectionManager()


@router.get("/{event_id}/messages", response_model=List[ChatMessageResponse])
async def get_chat_messages(
    event_id: int,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """Retrieves historical messages for a specific event room."""
    # Check if event exists
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    stmt = (
        select(ChatMessage)
        .where(ChatMessage.event_id == event_id)
        .order_by(ChatMessage.created_at.asc())
        .limit(limit)
        .options(selectinload(ChatMessage.user))
    )
    result = await db.execute(stmt)
    messages = result.scalars().all()
    return messages


@router.websocket("/{event_id}/chat")
async def websocket_chat_endpoint(
    websocket: WebSocket,
    event_id: int,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """
    WebSocket coordinate coordination chat room.
    WebSockets authenticate by providing Telegram initialization data in the `token` parameter.
    """
    user_data = verify_telegram_data(token)
    if not user_data:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Check/Create User on the fly to support quick access
    user_id = user_data["id"]
    user = await db.get(User, user_id)
    if not user:
        user = User(
            id=user_id,
            username=user_data.get("username"),
            first_name=user_data.get("first_name", "Volunteer"),
            last_name=user_data.get("last_name"),
            role="volunteer"
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    # Check if event exists
    event = await db.get(Event, event_id)
    if not event:
        await websocket.close(code=3000, reason="Event not found")
        return

    await manager.connect(event_id, websocket)

    try:
        # Keep connection open and read messages
        while True:
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
                msg_text = payload.get("message", "").strip()
            except Exception:
                msg_text = data.strip()

            if not msg_text:
                continue

            # Save message to database
            chat_msg = ChatMessage(
                event_id=event_id,
                user_id=user.id,
                message=msg_text,
                created_at=datetime.now(timezone.utc)
            )
            db.add(chat_msg)
            await db.commit()
            await db.refresh(chat_msg)

            # Publish message payload to Redis Pub/Sub for all workers to broadcast
            broadcast_payload = {
                "id": chat_msg.id,
                "event_id": event_id,
                "user_id": user.id,
                "message": msg_text,
                "created_at": chat_msg.created_at.isoformat(),
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "role": user.role,
                    "points": user.points
                }
            }
            channel_name = f"event_chat:{event_id}"
            await redis_client.publish(channel_name, json.dumps(broadcast_payload))

    except WebSocketDisconnect:
        await manager.disconnect(event_id, websocket)
    except Exception:
        await manager.disconnect(event_id, websocket)
        await websocket.close()
