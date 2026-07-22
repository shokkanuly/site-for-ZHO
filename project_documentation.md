# ZHASTAR Temirtau — Full Project Documentation

> Volunteer management platform for the Жастар орталығы (Youth Center) of Temirtau.
> Built with **FastAPI** (Python) backend + **React** frontend.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND  React + Vite · http://localhost:5173             │
│  Single Page App — no routing library, hash-based routing   │
├─────────────────────────────────────────────────────────────┤
│  BACKEND   FastAPI (async) · http://localhost:8000          │
│  PostgreSQL · SQLAlchemy (async) · WebSocket (websockets)   │
├─────────────────────────────────────────────────────────────┤
│  DATABASE  PostgreSQL (via docker-compose or local)         │
│  Tables: users, projects, events, event_participants,       │
│          volunteer_profiles, coordinators, bookings,        │
│          requests, news, rooms, direct_chat_messages        │
└─────────────────────────────────────────────────────────────┘
```

---

## 📂 Project Structure

```
zhaz/
├── backend/
│   ├── main.py                    ← FastAPI app entry point
│   ├── app/
│   │   ├── database.py            ← Async SQLAlchemy engine
│   │   ├── models/
│   │   │   ├── user.py            ← User model
│   │   │   ├── project.py         ← Project model
│   │   │   ├── event.py           ← Event + EventParticipant
│   │   │   ├── volunteer.py       ← VolunteerProfile
│   │   │   ├── booking.py         ← Room bookings
│   │   │   ├── request.py         ← Incoming requests/proposals
│   │   │   ├── news.py            ← News articles
│   │   │   ├── room.py            ← Physical rooms (booking)
│   │   │   └── direct_chat.py     ← Chat rooms + messages
│   │   ├── routers/
│   │   │   ├── auth.py            ← Login, user creation
│   │   │   ├── events.py          ← CRUD events + registration
│   │   │   ├── admin.py           ← All admin-level endpoints
│   │   │   ├── requests.py        ← Submit / view / update requests
│   │   │   ├── bookings.py        ← Room booking
│   │   │   ├── news.py            ← News publishing
│   │   │   ├── calendar.py        ← Calendar view endpoint
│   │   │   └── direct_chat.py     ← WebSocket chat rooms
│   │   └── schemas/               ← Pydantic schemas for all models
├── frontend/
│   ├── src/
│   │   ├── App.jsx                ← Main app (2600+ lines, all logic)
│   │   ├── index.css              ← Global design system / CSS vars
│   │   ├── components/
│   │   │   ├── ChatPanel.jsx      ← Real-time staff chat (WebSocket)
│   │   │   ├── RequestDetailModal.jsx ← Request info modal (React Portal)
│   │   │   ├── MapWidget.jsx      ← Leaflet.js map
│   │   │   └── ChatWindow.jsx     ← Legacy (unused)
│   │   └── utils/
│   │       └── i18n.js            ← RU/KZ translation strings
└── docker-compose.yml             ← PostgreSQL + pgAdmin
```

---

## 👥 User Roles

| Role | Login path | What they can do |
|---|---|---|
| `super_admin` | `/admin` | Full control: create leaders, see all data, manage all requests, all events, all bookings |
| `project_admin` | `/leader` | Manage their project: create events, manage coordinators & volunteers, see their requests |
| `coordinator` | `/coordinator` | See their project's volunteers, mark attendance, see requests, chat |
| `community_user` | Auto-created | Submit requests/bookings as guest or logged in user |

---

## 🏢 Projects (Directions)

| ID | Name | Color |
|---|---|---|
| 1 | Zhastar HQ (бас кеңсе) | #0f172a |
| 2 | Шаңырақ | #d97706 |
| 3 | Жасыл Ел | #059669 |
| 4 | Таза Қазақстан | #2563eb |
| 5 | Заң мен Тәртіп | #7c3aed |

Each project has: 1 leader (`project_admin`) → N coordinators → N volunteers per coordinator.

---

## 🔗 URLs

### Public Portal
| URL | Description |
|---|---|
| `http://localhost:5173/` | Landing page with hero, projects, news |
| `#home` | Events list + map |
| `#calendar` | Calendar view of events |
| `#services` | Services: room booking + request submission |
| `#volunteer` | Volunteer cabinet / login |

### Staff Dashboards
| URL | Access |
|---|---|
| `http://localhost:5173/#/admin` or `/admin` | super_admin only |
| `http://localhost:5173/#/leader` or `/leader` | project_admin only |
| `http://localhost:5173/#/coordinator` | coordinator only |

### Backend API
| URL | Description |
|---|---|
| `http://localhost:8000` | FastAPI root |
| `http://localhost:8000/docs` | Swagger UI (all endpoints) |
| `http://localhost:8000/api/events` | Events CRUD |
| `http://localhost:8000/api/requests` | Submit / list requests |
| `http://localhost:8000/api/bookings` | Room bookings |
| `http://localhost:8000/api/admin/*` | Admin-only endpoints |
| `http://localhost:8000/api/news` | News |
| `http://localhost:8000/api/chat/rooms` | Chat room list |
| `ws://localhost:8000/api/chat/ws/{room_key}` | WebSocket chat |

---

## 💬 Chat System

### Architecture
- **Transport**: WebSocket (`websockets` Python library)
- **Persistence**: Messages saved to `direct_chat_messages` table in PostgreSQL
- **In-memory**: `DirectChatManager` stores active WS connections per room

### Chat Rooms

| Room Key | Name | Access |
|---|---|---|
| `leaders` | 🏆 Канал руководителей | `super_admin` + ALL `project_admin` |
| `project_1` | 🏢 Zhastar HQ | `super_admin` + leader of proj 1 + its coordinators |
| `project_2` | 💛 Шаңырақ | leader + coordinators of Шаңырақ |
| `project_3` | 🌲 Жасыл Ел | leader + coordinators of Жасыл Ел |
| `project_4` | 🧹 Таза Қазақстан | leader + coordinators |
| `project_5` | 🛡️ Заң мен Тәртіп | leader + coordinators |

### Connecting
```
ws://localhost:8000/api/chat/ws/{room_key}?user_id={userId}
```

### Message format (broadcast JSON)
```json
{
  "type": "message",
  "id": 42,
  "room_key": "leaders",
  "sender_id": 5,
  "sender_name": "Асель",
  "sender_role": "project_admin",
  "message": "Привет всем!",
  "created_at": "2026-07-10T14:33:00"
}
```

---

## ✉️ Request System

Any visitor (guest or logged-in) can submit a request. It goes to:
- The leader of the chosen project (`target_project_id`)
- Optionally to HQ (no target project)

### Request types
- `event_host` — Заявка на проведение мероприятия
- `help` — Запрос помощи / волонтёров
- `official_letter` — Официальное письмо / обращение
- `other` — Другое

### Request lifecycle
```
Guest submits → status: "pending"
  → Leader / Admin reviews (click row → detail modal)
  → Leader writes reply → mark "resolved" or "rejected"
  → Guest receives status update
```

### Guest auto-registration
When a non-logged-in visitor submits a request or booking, the system **automatically creates** a `community_user` account for them using their phone number, logging them in silently.

---

## 🗓️ Event System

### Creating events
- **super_admin**: can create events for any project from Events tab
- **project_admin (leader)**: creates events for their own project via `handleCreateEventDirect` → `POST /api/events` (NOT through request queue)
- **Public guests**: submit a request via the public "Оставить заявку" form (goes to the request queue)

### Attending events
- Logged-in `community_user` clicks "Зарегистрироваться"
- After attending, coordinator marks them as "completed" → they earn **points**
- Points tracked in `VolunteerProfile.hours_logged`

---

## 🏢 Room Booking
- Physical rooms listed under the `rooms` table
- Anyone (guest or user) can book via Services tab
- Admin sees all bookings in the `super_admin` Bookings tab

---

## 📊 Dashboards

### Super Admin (`/admin`)
- **Stats bar**: requests · bookings · volunteers · leaders · events · projects
- **Обращения** tab: all requests from all projects, clickable rows → Request Detail Modal
- **Бронирования** tab: all room bookings
- **Все волонтёры** tab: cross-project volunteer list with hours
- **Руководители** tab: clickable leader rows → 3-column detail panel showing:
  - Leader info header (colored per project)
  - Coordinator count / Volunteer count / Pending requests count
  - Coordinator list
  - Recent requests for that project
- **Мероприятия** tab: all events across all projects
- **Chat**: floating 💬 button → multi-room panel (leaders + all project channels)

### Project Leader (`/leader`)
- **Stats bar**: requests · coordinators · volunteers · project name
- **Обращения**: their project's requests → clickable → detail modal + resolve/reject
- **Координаторы**: add coordinator + list
- **Волонтёры**: add volunteer (assign to coordinator) + list with hours
- **Новости**: publish project news
- **Мероприятия**: create events directly (publishes immediately) + list
- **Chat**: leaders channel + own project channel

### Coordinator (`/coordinator`)
- **Stats**: volunteers · events · pending requests · total hours logged
- **Волонтёры**: add volunteers, see their skills/contact/hours
- **Отметки участия**: select an event → mark which volunteers attended → logs hours
- **Заявки**: project requests → accept/reject + click for detail modal
- **Chat**: own project channel only

---

## 🔐 Authentication

- No JWT — simple numeric User ID as Bearer token (`Authorization: Bearer {userId}`)
- Role is stored in the DB, checked server-side on every privileged request
- Super admin hardcoded ID: `999999` (always valid, seeded in `main.py`)
- Login: enter username (or phone) → backend looks up user and returns their record

---

## 🌐 Bilingual Support

The UI supports **Russian** and **Kazakh** via `src/utils/i18n.js`.
Language toggle button in the top header saves preference to `localStorage`.

---

## 🐳 Running Locally

### 1. Start database
```bash
docker-compose up -d   # starts PostgreSQL on port 5432
```

### 2. Start backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python main.py          # runs on http://localhost:8000
```

### 3. Start frontend
```bash
cd frontend
npm install
npm run dev             # runs on http://localhost:5173
```

### 4. Seed accounts (auto-seeded on backend start)
| Username | Role | Project |
|---|---|---|
| `super_admin` (ID 999999) | super_admin | HQ |
| `shanyraq_leader` | project_admin | Шаңырақ |
| `jasylel_leader` | project_admin | Жасыл Ел |
| `taza_leader` | project_admin | Таза Қазақстан |
| `zan_leader` | project_admin | Заң мен Тәртіп |

---

## ✅ Feature Checklist

| Feature | Status |
|---|---|
| Public event browsing + calendar | ✅ Done |
| Guest request submission (any visitor) | ✅ Done |
| Guest auto-registration on submit | ✅ Done |
| Room booking (guest + logged in) | ✅ Done |
| Bilingual RU/KZ UI | ✅ Done |
| Super admin full dashboard | ✅ Done |
| Clickable leader detail panel in admin | ✅ Done |
| Request detail modal (all dashboards) | ✅ Done — React Portal |
| Project leader dashboard | ✅ Done |
| Leader creates events directly (not via request queue) | ✅ Fixed |
| Coordinator dashboard + requests tab | ✅ Done |
| Coordinator marks attendance + logs hours | ✅ Done |
| Chat: leaders general channel | ✅ Done (`room_key=leaders`) |
| Chat: leader ↔ coordinator per project | ✅ Done (`room_key=project_N`) |
| Per-room unread badges | ✅ Done |
| Real-time WebSocket (auto-reconnect) | ✅ Done |
| Message persistence in DB | ✅ Done |
| GitHub repo | ✅ `github.com/shokkanuly/site-for-ZHO` |
| DB sequence bug fix | ✅ Done (`reset_sequences()`) |

---

## 🔮 What Could Come Next (future work)

- [ ] JWT authentication (replace numeric Bearer token)
- [ ] Push notifications (browser Notification API on new request/message)
- [ ] Volunteer point leaderboard (public ranking)
- [ ] File/image attachments in chat and requests
- [ ] Export reports (volunteers, hours, events) as CSV/PDF
- [ ] Email/SMS notifications when request is resolved
- [ ] Mobile app (React Native)
- [ ] Custom design templates (user mentioned this)
