import socket
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.config import settings

def is_postgres_running(host: str = "localhost", port: int = 5432) -> bool:
    try:
        s = socket.create_connection((host, port), timeout=0.2)
        s.close()
        return True
    except Exception:
        return False

# Determine database URL
db_url = settings.DATABASE_URL
if "localhost" in db_url and not is_postgres_running():
    print("⚠️ Local PostgreSQL service not found. Falling back to SQLite file: temirtau_volunteer.db")
    db_url = "sqlite+aiosqlite:///./temirtau_volunteer.db"

# Create async engine with pool configurations
engine = create_async_engine(
    db_url,
    echo=True if settings.APP_ENV == "development" else False,
    future=True,
    # SQLite doesn't support pool_size/max_overflow parameters in the same way, so omit or handle
    **({} if "sqlite" in db_url else {"pool_size": 10, "max_overflow": 20})
)

# Async session maker
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# Declarative Base
Base = declarative_base()

# Async DB session dependency
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

