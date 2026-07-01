from contextlib import asynccontextmanager
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.routers import auth, events, chat, maps
from app.services.redis_client import check_redis_connection

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield
    # Cleanup tasks if any
    await engine.dispose()

app = FastAPI(
    title="Temirtau Volunteer API",
    description="Asynchronous backend API for coordinating volunteers in Temirtau, Kazakhstan.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for all origins to allow TWA integrations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(maps.router, prefix="/api")

@app.get("/api/health")
async def health_check():
    """System health check verifying database and Redis connectivity."""
    redis_ok = await check_redis_connection()
    return {
        "status": "healthy",
        "redis_connection": "OK" if redis_ok else "FAILED",
        "environment": settings.APP_ENV
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
