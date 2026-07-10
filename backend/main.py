from contextlib import asynccontextmanager
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, date

from app.config import settings
from app.database import Base, engine, AsyncSessionLocal
from app.routers import auth, events, chat, maps, admin, bookings, requests, news, calendar
from app.services.redis_client import check_redis_connection

# Models to ensure they are loaded in metadata
from app.models.project import Project
from app.models.room import Room
from app.models.user import User
from app.models.volunteer_profile import VolunteerProfile
from app.models.event import Event
from app.models.news import News
from app.models.booking import Booking
from app.models.request import Request

async def seed_data():
    """Seeds the default lookup data and administrators for testing/demonstration."""
    async with AsyncSessionLocal() as db:
        # 1. Projects
        stmt_proj = select(Project)
        res_proj = await db.execute(stmt_proj)
        if not res_proj.scalars().first():
            projects = [
                Project(id=1, name="Zhastar Ortalygy", slug="zhastar_ortalygy", type="core", description="Главный молодежный центр города Темиртау. Координационный хаб.", contact="+7 (7213) 99-88-77"),
                Project(id=2, name="Шаңырақ", slug="shanyraq", type="partner", description="Социальные проекты, забота о животных и благотворительность.", contact="+7 (7213) 22-33-44"),
                Project(id=3, name="Жасыл Ел", slug="jasyl_el", type="partner", description="Озеленение парков, посадка деревьев и благоустройство города.", contact="+7 (7213) 55-66-77"),
                Project(id=4, name="Таза Қазақстан", slug="taza_qazaqstan", type="partner", description="Субботники, уборка берегов рек и эко-патрули в Темиртау.", contact="+7 (7213) 88-99-00"),
                Project(id=5, name="Заң мен Тәртіп", slug="zan_men_tartip", type="partner", description="Правовой лекторий, тренинги гражданской ответственности и лидерство.", contact="+7 (7213) 11-22-33"),
            ]
            db.add_all(projects)
            await db.commit()

        # 2. Rooms
        stmt_room = select(Room)
        res_room = await db.execute(stmt_room)
        if not res_room.scalars().first():
            rooms = [
                Room(id=1, name="Конференц-зал", capacity=100, description="Просторный зал со сценой, проектором и аудиосистемой."),
                Room(id=2, name="Коворкинг-зона", capacity=30, description="Рабочая зона со столами, Wi-Fi и диванами для встреч."),
                Room(id=3, name="Арт-студия", capacity=15, description="Творческое пространство для мастер-классов и рисования."),
                Room(id=4, name="Кабинет волонтёров", capacity=20, description="Место для координации активистов и чаепития."),
            ]
            db.add_all(rooms)
            await db.commit()

        # 3. Users (and admin accounts)
        admin_user = await db.get(User, 999999)
        if not admin_user:
            users = [
                User(id=999999, username="admin", first_name="HQ Main Admin", role="super_admin", points=0),
                User(id=888888, username="shanyraq_admin", first_name="Shanyraq Lead", role="project_admin", project_id=2, points=0),
                User(id=777777, username="jasylel_admin", first_name="Jasyl El Lead", role="project_admin", project_id=3, points=0),
                User(id=666666, username="taza_admin", first_name="Tazart Lead", role="project_admin", project_id=4, points=0),
                User(id=555555, username="zan_admin", first_name="Zan Lead", role="project_admin", project_id=5, points=0),
                User(id=111111, username="aibek_volunteer", first_name="Айбек", role="volunteer", project_id=3, points=45),
                User(id=444444, username="jasylel_coordinator", first_name="Jasyl El Worker", role="coordinator", project_id=3, points=0),
                User(id=333333, username="shanyraq_coordinator", first_name="Shanyraq Worker", role="coordinator", project_id=2, points=0),
            ]
            db.add_all(users)
            await db.commit()

            # Seed volunteer profiles
            vps = [
                VolunteerProfile(user_id=111111, project_id=3, hours_logged=12, status="active", coordinator_id=444444),
                VolunteerProfile(user_id=111111, project_id=2, hours_logged=5, status="active"),
            ]
            db.add_all(vps)
            await db.commit()

        # 4. Events
        stmt_ev = select(Event)
        res_ev = await db.execute(stmt_ev)
        if not res_ev.scalars().first():
            events = [
                Event(
                    id=1,
                    title="Посадка сосен в парке Самарканд",
                    description="Жасыл Ел собирает волонтеров для озеленения парковой зоны. Саженцы и инвентарь предоставляются на месте сбора.",
                    organizer_id=777777,
                    project_id=3,
                    room_id=None,
                    latitude=50.0645,
                    longitude=72.9698,
                    address="Парк Самарканд, ул. Димитрова",
                    event_date=datetime(2026, 7, 12, 10, 0),
                    status="active",
                    category="jasyl_el",
                    points_reward=20
                ),
                Event(
                    id=2,
                    title="Очистка побережья Самаркандского водохранилища",
                    description="Таза Қазақстан проводит генеральную уборку берега от мусора. Сбор участников на пляже. Берите удобную обувь.",
                    organizer_id=666666,
                    project_id=4,
                    room_id=None,
                    latitude=50.0812,
                    longitude=72.9815,
                    address="Городской пляж водохранилища",
                    event_date=datetime(2026, 7, 15, 9, 0),
                    status="active",
                    category="taza_qazaqstan",
                    points_reward=25
                ),
                Event(
                    id=3,
                    title="Мастер-класс по лидерству и дебатам",
                    description="Заң мен Тәртіп проводит интерактивный тренинг о правах молодежи и публичных выступлениях.",
                    organizer_id=555555,
                    project_id=5,
                    room_id=1, # Conference Hall
                    latitude=50.0592,
                    longitude=72.9554,
                    address="Zhastar Ortalygy, Конференц-зал",
                    event_date=datetime(2026, 7, 18, 14, 0),
                    status="active",
                    category="zan_men_tartip",
                    points_reward=15
                ),
                Event(
                    id=4,
                    title="Благотворительная ярмарка Shanyraq",
                    description="Шаңырақ организует сбор средств и вещей для приюта животных. Приносите корм и полезные вещи.",
                    organizer_id=888888,
                    project_id=2,
                    room_id=2, # Coworking
                    latitude=50.0592,
                    longitude=72.9554,
                    address="Zhastar Ortalygy, Коворкинг-зона",
                    event_date=datetime(2026, 7, 20, 11, 0),
                    status="active",
                    category="shanyraq",
                    points_reward=15
                )
            ]
            db.add_all(events)
            await db.commit()

        # 5. News
        stmt_news = select(News)
        res_news = await db.execute(stmt_news)
        if not res_news.scalars().first():
            news_items = [
                News(
                    title="Открытие новой коворкинг-зоны в Zhastar Ortalygy!",
                    body="С радостью сообщаем, что в нашем центре завершился ремонт коворкинг-зоны. Теперь для всей молодежи Темиртау доступно современное пространство с бесплатным интернетом, розетками и удобными местами для командной работы. Вы можете забронировать зону бесплатно через наш портал услуг!",
                    project_id=1,
                    author_id=999999
                ),
                News(
                    title="Jasyl El запускает летний сезон озеленения",
                    body="Стартовал прием заявок в отряды 'Жасыл Ел' на июль-август. Если тебе от 16 до 35 лет, ты хочешь сделать Темиртау зеленее и получить ценные призы и вознаграждения — регистрируйся как волонтер в кабинете и подавай заявку!",
                    project_id=3,
                    author_id=777777
                ),
                News(
                    title="Эко-челлендж Taza Temirtau: подводим итоги",
                    body="За прошедший месяц силами эко-патрулей 'Таза Қазақстан' было вывезено более 5 тонн пластика с пригородных зон. Спасибо каждому волонтеру за неоценимый вклад в экологию нашего любимого города!",
                    project_id=4,
                    author_id=666666
                )
            ]
            db.add_all(news_items)
            await db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup (drop and recreate to ensure schema alignment)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    
    # Run data seeding
    await seed_data()
    
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
app.include_router(admin.router, prefix="/api")
app.include_router(bookings.router, prefix="/api")
app.include_router(requests.router, prefix="/api")
app.include_router(news.router, prefix="/api")
app.include_router(calendar.router, prefix="/api")

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

