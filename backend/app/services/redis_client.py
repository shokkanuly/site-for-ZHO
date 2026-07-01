import socket
import asyncio
import json
import redis.asyncio as aioredis
from app.config import settings

def is_redis_running(host: str = "localhost", port: int = 6379) -> bool:
    try:
        s = socket.create_connection((host, port), timeout=0.2)
        s.close()
        return True
    except Exception:
        return False

# In-memory Mock Redis Pub/Sub client implementation for local fallback
class MockPubSub:
    def __init__(self, channels_map):
        self.channels_map = channels_map
        self.queue = asyncio.Queue()
        self.subscribed_channels = []

    async def subscribe(self, channel_name):
        self.subscribed_channels.append(channel_name)
        if channel_name not in self.channels_map:
            self.channels_map[channel_name] = set()
        self.channels_map[channel_name].add(self)

    async def unsubscribe(self, channel_name):
        if channel_name in self.subscribed_channels:
            self.subscribed_channels.remove(channel_name)
        if channel_name in self.channels_map:
            self.channels_map[channel_name].discard(self)

    async def get_message(self, ignore_subscribe_messages=True, timeout=1.0):
        try:
            msg = await asyncio.wait_for(self.queue.get(), timeout=timeout)
            return {"type": "message", "data": msg}
        except asyncio.TimeoutError:
            return None

    async def close(self):
        for ch in list(self.subscribed_channels):
            await self.unsubscribe(ch)

class MockRedis:
    def __init__(self):
        self.channels_map = {} # channel_name -> set of MockPubSub

    async def ping(self):
        return True

    def pubsub(self):
        return MockPubSub(self.channels_map)

    async def publish(self, channel_name, data):
        if channel_name in self.channels_map:
            for ps in self.channels_map[channel_name]:
                await ps.queue.put(data)
        return 1

# Setup client
if "localhost" in settings.REDIS_URL and not is_redis_running():
    print("⚠️ Local Redis service not found. Falling back to in-memory MockRedis simulator.")
    redis_client = MockRedis()
else:
    # Initialize async Redis client with automatic connection pooling
    redis_client = aioredis.from_url(
        settings.REDIS_URL,
        decode_responses=True,
        max_connections=20
    )

async def check_redis_connection() -> bool:
    """Utility helper to verify Redis connectivity."""
    try:
        await redis_client.ping()
        return True
    except Exception:
        return False

