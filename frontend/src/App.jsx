import React, { useState, useEffect } from "react";
import "./App.css";
import {
  getLoggedInUser,
  setLoggedInUser,
  logout,
  isLoggedIn,
  getAuthHeader,
} from "./utils/auth";
import MapWidget from "./components/MapWidget";
import ChatWindow from "./components/ChatWindow";
import { translations } from "./utils/i18n";

export default function App() {
  const [lang, setLang] = useState("ru");
  const t = translations[lang];

  // Projects Configuration
  const PROJECTS = [
    { id: 1, name: t.srvProjectHQ, slug: "zhastar_ortalygy", color: "var(--c-general)" },
    { id: 2, name: t.catShanyraq, slug: "shanyraq", color: "var(--c-shanyraq)" },
    { id: 3, name: t.catJasyl, slug: "jasyl_el", color: "var(--c-jasyl)" },
    { id: 4, name: t.catTaza, slug: "taza_qazaqstan", color: "var(--c-taza)" },
    { id: 5, name: t.catZan, slug: "zan_men_tartip", color: "var(--c-zan)" }
  ];

  const CATEGORY_MAP = {
    all:            { label: t.catAll,        class: "general",  bannerTitle: "ZHASTAR Temirtau",      bannerSubtitle: "Координационный портал молодёжных экологических и социальных акций в г. Темиртау" },
    shanyraq:       { label: t.catShanyraq,   class: "shanyraq", bannerTitle: "Шаңырақ орталығы",      bannerSubtitle: "Социальные проекты, забота о животных и гуманитарные инициативы" },
    taza_qazaqstan: { label: t.catTaza,       class: "taza",     bannerTitle: "Таза Қазақстан",        bannerSubtitle: "Субботники, уборка берегов и экологический патруль" },
    jasyl_el:       { label: t.catJasyl,      class: "jasylel",  bannerTitle: "Жасыл Ел Темиртау",     bannerSubtitle: "Озеленение парков, посадка деревьев и благоустройство города" },
    zan_men_tartip: { label: t.catZan,        class: "zan",      bannerTitle: "Заң мен Тәртіп",        bannerSubtitle: "Правовой лекторий, антинаркотические рейды и гражданская ответственность" },
  };

  const CATEGORY_COLORS = {
    jasyl_el:       { bg: "linear-gradient(135deg, #10B981 0%, #059669 100%)", label: t.catJasyl,       emoji: "🌲" },
    taza_qazaqstan: { bg: "linear-gradient(135deg, #34D399 0%, #10B981 100%)", label: t.catTaza, emoji: "🧹" },
    shanyraq:       { bg: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)", label: t.catShanyraq,        emoji: "🤝" },
    zan_men_tartip: { bg: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)", label: t.catZan, emoji: "🛡️" },
    general:        { bg: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)", label: t.catAll,           emoji: "📢" },
  };

  function catColor(cat) {
    return CATEGORY_COLORS[cat] || CATEGORY_COLORS.general;
  }

  // Debug/Emulator Accounts
  const EMULATE_ACCOUNTS = [
    { id: 0, first_name: "Гость (Guest)", role: "community_user" },
    { id: 999999, username: "admin", first_name: "HQ Main Admin", role: "super_admin", points: 0 },
    { id: 888888, username: "shanyraq_admin", first_name: "Shanyraq Lead", role: "project_admin", project_id: 2, points: 0 },
    { id: 777777, username: "jasylel_admin", first_name: "Jasyl El Lead", role: "project_admin", project_id: 3, points: 0 },
    { id: 666666, username: "taza_admin", first_name: "Tazart Lead", role: "project_admin", project_id: 4, points: 0 },
    { id: 555555, username: "zan_admin", first_name: "Zan Lead", role: "project_admin", project_id: 5, points: 0 },
    
    // Project 1 (Zhastar Ortalygy) Non-Admins
    { id: 111112, username: "zhastar_volunteer", first_name: "Алихан (Волонтер Zhastar)", role: "volunteer", project_id: 1, points: 30 },
    { id: 444442, username: "zhastar_coordinator", first_name: "Координатор Zhastar", role: "coordinator", project_id: 1, points: 0 },
    
    // Project 2 (Shanyraq) Non-Admins
    { id: 111113, username: "shanyraq_volunteer", first_name: "Мария (Волонтер Shanyraq)", role: "volunteer", project_id: 2, points: 25 },
    { id: 333333, username: "shanyraq_coordinator", first_name: "Координатор Shanyraq", role: "coordinator", project_id: 2, points: 0 },
    
    // Project 3 (Jasyl El) Non-Admins
    { id: 111111, username: "aibek_volunteer", first_name: "Айбек (Волонтер Jasyl)", role: "volunteer", project_id: 3, points: 45 },
    { id: 444444, username: "jasylel_coordinator", first_name: "Координатор Jasyl El", role: "coordinator", project_id: 3, points: 0 },
    
    // Project 4 (Taza Qazaqstan) Non-Admins
    { id: 111114, username: "taza_volunteer", first_name: "Данияр (Волонтер Taza)", role: "volunteer", project_id: 4, points: 50 },
    { id: 444445, username: "taza_coordinator", first_name: "Координатор Taza", role: "coordinator", project_id: 4, points: 0 },
    
    // Project 5 (Zan men Tartip) Non-Admins
    { id: 111115, username: "zan_volunteer", first_name: "Елена (Волонтер Zan)", role: "volunteer", project_id: 5, points: 15 },
    { id: 444446, username: "zan_coordinator", first_name: "Координатор Zan", role: "coordinator", project_id: 5, points: 0 }
  ];

  // Core Routing State
  const [isAdminRoute, setIsAdminRoute] = useState(
    window.location.pathname.startsWith("/admin") || 
    window.location.hash.startsWith("#/admin") || 
    window.location.hash.startsWith("#admin")
  );

  const [isLeaderRoute, setIsLeaderRoute] = useState(
    window.location.pathname.startsWith("/leader") || 
    window.location.hash.startsWith("#/leader") || 
    window.location.hash.startsWith("#leader")
  );

  const [isCoordinatorRoute, setIsCoordinatorRoute] = useState(
    window.location.pathname.startsWith("/coordinator") || 
    window.location.hash.startsWith("#/coordinator") || 
    window.location.hash.startsWith("#coordinator")
  );
  
  const [activeTab, setActiveTab] = useState("landing");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [dbUser, setDbUser] = useState(getLoggedInUser());
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Services & Bookings State
  const [rooms, setRooms] = useState([]);
  const [calendarItems, setCalendarItems] = useState([]);
  const [activeServiceTab, setActiveServiceTab] = useState("booking"); // booking or letter
  
  // Booking Form State
  const [bookingData, setBookingData] = useState({
    room_id: "", date: "", time_start: "", time_end: "",
    guest_name: "", guest_phone: "", guest_age: ""
  });
  
  // Letter/Request Form State
  const [requestData, setRequestData] = useState({
    target_project_id: "", type: "help", subject: "", description: "",
    guest_name: "", guest_phone: "", guest_age: ""
  });

  // News State
  const [newsList, setNewsList] = useState([]);
  const [newsForm, setNewsForm] = useState({ title: "", body: "", project_id: "" });

  // Admin Dashboard State
  const [activeAdminTab, setActiveAdminTab] = useState("requests"); // requests, bookings, volunteers, create_admin, news, events, coordinators
  const [adminRequests, setAdminRequests] = useState([]);
  const [adminBookings, setAdminBookings] = useState([]);
  const [adminVolunteers, setAdminVolunteers] = useState([]);
  const [adminLeaders, setAdminLeaders] = useState([]);
  const [adminCoordinators, setAdminCoordinators] = useState([]);
  const [adminEvents, setAdminEvents] = useState([]);
  const [adminReplyTexts, setAdminReplyTexts] = useState({}); // request_id -> string
  
  // Project Admin creation form
  const [adminForm, setAdminForm] = useState({ username: "", first_name: "", project_id: "2" });
  // Coordinator creation form
  const [coordForm, setCoordForm] = useState({ username: "", first_name: "" });
  // Volunteer creation form
  const [volForm, setVolForm] = useState({ username: "", first_name: "", phone: "", age: "", project_id: "", skills: "", coordinator_id: "" });

  // Community User Personal lists
  const [myBookings, setMyBookings] = useState([]);
  const [myRequests, setMyRequests] = useState([]);

  // Login Form State
  const [loginUsername, setLoginUsername] = useState("");

  // Event Proposal Form State
  const [proposalData, setProposalData] = useState({
    title: "", description: "", address: "",
    category: "jasyl_el", latitude: 50.0633, longitude: 72.9644,
    event_date: "", points_reward: 15, project_id: "3", room_id: "",
    guest_name: "", guest_phone: "", guest_age: ""
  });

  // Coordinator specific state
  const [selectedCoordEvent, setSelectedCoordEvent] = useState(null);
  const [coordEventVolunteers, setCoordEventVolunteers] = useState([]);

  // Calendar View State
  const [calendarFilterDate, setCalendarFilterDate] = useState("");

  // Router Check
  useEffect(() => {
    const handleRouteCheck = () => {
      const isAdm = window.location.pathname.startsWith("/admin") || 
                    window.location.hash.startsWith("#/admin") || 
                    window.location.hash.startsWith("#admin");
      const isLdr = window.location.pathname.startsWith("/leader") || 
                    window.location.hash.startsWith("#/leader") || 
                    window.location.hash.startsWith("#leader");
      const isCrd = window.location.pathname.startsWith("/coordinator") || 
                    window.location.hash.startsWith("#/coordinator") || 
                    window.location.hash.startsWith("#coordinator");
      setIsAdminRoute(isAdm);
      setIsLeaderRoute(isLdr);
      setIsCoordinatorRoute(isCrd);
      setSelectedEvent(null);
      setSelectedCoordEvent(null);
    };
    window.addEventListener("hashchange", handleRouteCheck);
    window.addEventListener("popstate", handleRouteCheck);
    return () => {
      window.removeEventListener("hashchange", handleRouteCheck);
      window.removeEventListener("popstate", handleRouteCheck);
    };
  }, []);

  // Hook trigger loaders
  useEffect(() => { 
    loadEvents(); 
    loadNews();
    if (dbUser) refreshUserProfile(); 
  }, [selectedCategory, dbUser?.id]);

  useEffect(() => { 
    if (activeTab === "calendar" || isAdminRoute || isLeaderRoute || isCoordinatorRoute) loadCalendar();
    if (activeTab === "services" || isAdminRoute || isLeaderRoute || isCoordinatorRoute) { loadRooms(); }
    if (activeTab === "volunteer" || isAdminRoute || isLeaderRoute || isCoordinatorRoute) {
      loadLeaderboard();
      if (dbUser) {
        if (dbUser.role === "super_admin" || dbUser.role === "project_admin" || dbUser.role === "coordinator") {
          loadAdminData();
        } else if (dbUser.role === "community_user") {
          loadMyData();
        }
      }
    }
  }, [activeTab, dbUser?.id, isAdminRoute, isLeaderRoute, isCoordinatorRoute]);

  const refreshUserProfile = async () => {
    if (!isLoggedIn()) return;
    try {
      const res = await fetch("http://localhost:8000/api/auth/me", { headers: getAuthHeader() });
      if (res.ok) { 
        const d = await res.json(); 
        setDbUser(d); 
        setLoggedInUser(d); 
      }
    } catch {}
  };

  // Switch emulation login directly
  const handleEmulateChange = (accountId) => {
    const acc = EMULATE_ACCOUNTS.find(a => a.id === parseInt(accountId, 10));
    if (acc) {
      if (acc.id === 0) {
        setDbUser(null);
        logout();
      } else {
        setLoggedInUser(acc);
        setDbUser(acc);
        
        // Auto routing helper when changing roles in emulator
        if (acc.role === "super_admin") {
          window.location.hash = "#/admin";
        } else if (acc.role === "project_admin") {
          window.location.hash = "#/leader";
        } else if (acc.role === "coordinator") {
          window.location.hash = "#/coordinator";
        } else {
          window.location.hash = "#";
        }
      }
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginUsername.trim()) return alert("Введите никнейм");
    try {
      const res = await fetch("http://localhost:8000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername.trim() }),
      });
      if (res.ok) {
        const d = await res.json();
        setDbUser(d); setLoggedInUser(d);
        setIsLoginModalOpen(false); setLoginUsername("");
        
        // Route suggestion helper
        if (d.role === "super_admin" && !isAdminRoute) {
          if (confirm("Вы вошли как Главный Администратор. Перейти в Панель управления?")) {
            window.location.hash = "#/admin";
          }
        } else if (d.role === "project_admin" && !isLeaderRoute) {
          if (confirm("Вы вошли как Руководитель проекта. Перейти в Панель Лидера?")) {
            window.location.hash = "#/leader";
          }
        } else if (d.role === "coordinator" && !isCoordinatorRoute) {
          if (confirm("Вы вошли как Координатор. Перейти в Панель Координатора?")) {
            window.location.hash = "#/coordinator";
          }
        }
      } else {
        const err = await res.json();
        alert(`Ошибка: ${err.detail || "пользователь не найден"}`);
      }
    } catch { alert("Не удалось подключиться к серверу."); }
  };

  const handleLogoutClick = () => {
    if (window.confirm("Выйти из системы?")) { 
      setDbUser(null); 
      logout(); 
      window.location.hash = "#";
    }
  };

  // --- DATA FETCHERS ---
  const loadEvents = async () => {
    try {
      const q = selectedCategory !== "all" ? `&category=${selectedCategory}` : "";
      const res = await fetch(`http://localhost:8000/api/events?status_filter=active${q}`);
      if (res.ok) setEvents(await res.json());
    } catch {}
  };

  const loadNews = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/news");
      if (res.ok) setNewsList(await res.json());
    } catch {}
  };

  const loadRooms = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/bookings/rooms");
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
        if (data.length > 0) {
          setBookingData(prev => ({ ...prev, room_id: data[0].id }));
        }
      }
    } catch {}
  };

  const loadCalendar = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/calendar");
      if (res.ok) setCalendarItems(await res.json());
    } catch {}
  };

  const loadLeaderboard = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/auth/leaderboard?limit=10");
      if (res.ok) setLeaderboard(await res.json());
    } catch {}
  };

  const loadEventDetails = async (id) => {
    try {
      const [evRes, volRes] = await Promise.all([
        fetch(`http://localhost:8000/api/events/${id}`),
        fetch(`http://localhost:8000/api/events/${id}/volunteers`),
      ]);
      if (evRes.ok) setSelectedEvent(await evRes.json());
      if (volRes.ok) {
        const vols = await volRes.json();
        setVolunteers(vols);
        setIsRegistered(vols.some(v => v.user_id === dbUser?.id));
      }
    } catch {}
  };

  const loadCoordEventDetails = async (id) => {
    try {
      const volRes = await fetch(`http://localhost:8000/api/events/${id}/volunteers`);
      if (volRes.ok) {
        setCoordEventVolunteers(await volRes.json());
      }
    } catch {}
  };

  // Load My submissions (for community_user)
  const loadMyData = async () => {
    try {
      const [bRes, rRes] = await Promise.all([
        fetch("http://localhost:8000/api/bookings/my", { headers: getAuthHeader() }),
        fetch("http://localhost:8000/api/requests/my", { headers: getAuthHeader() }),
      ]);
      if (bRes.ok) setMyBookings(await bRes.json());
      if (rRes.ok) setMyRequests(await rRes.json());
    } catch {}
  };

  // Load Admin Lists
  const loadAdminData = async () => {
    try {
      const [reqsRes, bksRes, volsRes, evsRes] = await Promise.all([
        fetch("http://localhost:8000/api/admin/requests", { headers: getAuthHeader() }),
        fetch("http://localhost:8000/api/admin/bookings", { headers: getAuthHeader() }),
        fetch("http://localhost:8000/api/admin/volunteers", { headers: getAuthHeader() }),
        fetch("http://localhost:8000/api/admin/events", { headers: getAuthHeader() }),
      ]);
      if (reqsRes.ok) setAdminRequests(await reqsRes.json());
      if (bksRes.ok) setAdminBookings(await bksRes.json());
      if (volsRes.ok) setAdminVolunteers(await volsRes.json());
      if (evsRes.ok) setAdminEvents(await evsRes.json());

      if (dbUser && (dbUser.role === "super_admin" || dbUser.role === "project_admin")) {
        const crdRes = await fetch("http://localhost:8000/api/admin/coordinators", { headers: getAuthHeader() });
        if (crdRes.ok) setAdminCoordinators(await crdRes.json());
      }

      if (dbUser && dbUser.role === "super_admin") {
        const ldrRes = await fetch("http://localhost:8000/api/admin/project-admins", { headers: getAuthHeader() });
        if (ldrRes.ok) setAdminLeaders(await ldrRes.json());
      }
    } catch {}
  };

  // --- ACTIONS ---
  const handleRegister = async () => {
    if (!selectedEvent || !isLoggedIn()) return;
    const res = await fetch(`http://localhost:8000/api/events/${selectedEvent.id}/register`, { method: "POST", headers: getAuthHeader() });
    if (res.ok) { loadEventDetails(selectedEvent.id); refreshUserProfile(); }
    else { const e = await res.json(); alert(e.detail); }
  };

  const handleCancelRegistration = async () => {
    if (!selectedEvent || !isLoggedIn()) return;
    const res = await fetch(`http://localhost:8000/api/events/${selectedEvent.id}/register`, { method: "DELETE", headers: getAuthHeader() });
    if (res.ok) loadEventDetails(selectedEvent.id);
  };

  const handleCompleteVolunteer = async (volUserId) => {
    const evId = selectedEvent ? selectedEvent.id : (selectedCoordEvent ? selectedCoordEvent.id : null);
    if (!evId) return;
    const res = await fetch(`http://localhost:8000/api/events/${evId}/complete/${volUserId}`, { method: "POST", headers: getAuthHeader() });
    if (res.ok) {
      alert("Присутствие подтверждено!");
      if (selectedEvent) loadEventDetails(evId);
      if (selectedCoordEvent) loadCoordEventDetails(evId);
    }
    else { const e = await res.json(); alert(e.detail); }
  };

  // Create news
  const handleCreateNews = async (e) => {
    e.preventDefault();
    if (!newsForm.title || !newsForm.body) return alert("Заполните заголовок и текст новости.");
    
    // Project leaders can only publish news associated with their scoped project
    const targetProjId = dbUser.role === "project_admin" ? dbUser.project_id : (newsForm.project_id ? parseInt(newsForm.project_id, 10) : null);

    try {
      const res = await fetch("http://localhost:8000/api/news", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({
          title: newsForm.title,
          body: newsForm.body,
          project_id: targetProjId
        })
      });
      if (res.ok) {
        alert("Новость успешно опубликована!");
        setNewsForm({ title: "", body: "", project_id: "" });
        loadNews();
      } else {
        const err = await res.json();
        alert(err.detail || "Ошибка публикации.");
      }
    } catch { alert("Ошибка соединения."); }
  };

  // Room Booking Request Submit
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!bookingData.room_id || !bookingData.date || !bookingData.time_start || !bookingData.time_end) {
      return alert("Заполните все обязательные поля.");
    }
    const isAuth = isLoggedIn();
    if (!isAuth && (!bookingData.guest_name || !bookingData.guest_phone)) {
      return alert("Пожалуйста, введите ваше имя и телефон для обратной связи.");
    }

    try {
      const res = await fetch("http://localhost:8000/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({
          room_id: parseInt(bookingData.room_id, 10),
          date: bookingData.date,
          time_start: bookingData.time_start,
          time_end: bookingData.time_end,
          guest_name: bookingData.guest_name || null,
          guest_phone: bookingData.guest_phone || null,
          guest_age: bookingData.guest_age ? parseInt(bookingData.guest_age, 10) : null
        })
      });
      if (res.ok) {
        const data = await res.json();
        alert("Ваша заявка на бронирование принята на рассмотрение!");
        
        // Auto-login community_user silently under the hood
        if (!isAuth && data.user) {
          setLoggedInUser(data.user);
          setDbUser(data.user);
        }

        setBookingData({
          room_id: rooms.length > 0 ? rooms[0].id : "", date: "", time_start: "", time_end: "",
          guest_name: "", guest_phone: "", guest_age: ""
        });
        setActiveTab("volunteer");
      } else {
        const err = await res.json();
        alert(err.detail || "Ошибка при бронировании.");
      }
    } catch { alert("Ошибка соединения."); }
  };

  // Letter/Help Request Submit
  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    if (!requestData.subject || !requestData.description) {
      return alert("Заполните тему и текст обращения.");
    }
    const isAuth = isLoggedIn();
    if (!isAuth && (!requestData.guest_name || !requestData.guest_phone)) {
      return alert("Пожалуйста, введите ваше имя и телефон для обратной связи.");
    }

    try {
      const res = await fetch("http://localhost:8000/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({
          target_project_id: requestData.target_project_id ? parseInt(requestData.target_project_id, 10) : null,
          type: requestData.type,
          subject: requestData.subject,
          description: requestData.description,
          guest_name: requestData.guest_name || null,
          guest_phone: requestData.guest_phone || null,
          guest_age: requestData.guest_age ? parseInt(requestData.guest_age, 10) : null
        })
      });
      if (res.ok) {
        const data = await res.json();
        alert("Обращение успешно отправлено в штаб!");
        
        // Auto-login community_user silently under the hood
        if (!isAuth && data.requester) {
          setLoggedInUser(data.requester);
          setDbUser(data.requester);
        }

        setRequestData({
          target_project_id: "", type: "help", subject: "", description: "",
          guest_name: "", guest_phone: "", guest_age: ""
        });
        setActiveTab("volunteer");
      } else {
        const err = await res.json();
        alert(err.detail || "Ошибка отправки.");
      }
    } catch { alert("Ошибка соединения."); }
  };

  // Proposal submit
  const handleProposalSubmit = async (e) => {
    e.preventDefault();
    if (!proposalData.title || !proposalData.description || !proposalData.address || !proposalData.event_date)
      return alert("Заполните все обязательные поля.");
    
    if (!isLoggedIn()) {
      if (!proposalData.guest_name || !proposalData.guest_phone) {
        return alert("Укажите ваше имя и контактный телефон, чтобы оставить заявку.");
      }
    }

    try {
      const payload = {
        title: proposalData.title,
        description: proposalData.description,
        address: proposalData.address,
        latitude: parseFloat(proposalData.latitude),
        longitude: parseFloat(proposalData.longitude),
        event_date: new Date(proposalData.event_date).toISOString(),
        points_reward: parseInt(proposalData.points_reward, 10),
        category: proposalData.category,
        project_id: proposalData.project_id ? parseInt(proposalData.project_id, 10) : null,
        room_id: proposalData.room_id ? parseInt(proposalData.room_id, 10) : null
      };

      if (!isLoggedIn()) {
        payload.guest_name = proposalData.guest_name;
        payload.guest_phone = proposalData.guest_phone;
        payload.guest_age = proposalData.guest_age ? parseInt(proposalData.guest_age, 10) : null;
      }

      const res = await fetch("http://localhost:8000/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        alert("Заявка успешно отправлена на портал ZHASTAR!");
        setProposalData({
          title: "", description: "", address: "",
          category: "jasyl_el", latitude: 50.0633, longitude: 72.9644,
          event_date: "", points_reward: 15, project_id: "3", room_id: "",
          guest_name: "", guest_phone: "", guest_age: ""
        });
        
        if (isLeaderRoute) {
          loadAdminData();
        } else {
          setActiveTab("home"); 
          loadEvents();
        }
      } else { const e = await res.json(); alert(e.detail); }
    } catch { alert("Ошибка соединения."); }
  };

  // --- ADMIN ACTIONS ---
  const handleCreateAdminSubmit = async (e) => {
    e.preventDefault();
    if (!adminForm.username || !adminForm.first_name || !adminForm.project_id) return alert("Заполните все поля");
    try {
      const res = await fetch("http://localhost:8000/api/admin/project-admins", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({
          username: adminForm.username,
          first_name: adminForm.first_name,
          project_id: parseInt(adminForm.project_id, 10)
        })
      });
      if (res.ok) {
        alert("Администратор проекта успешно создан!");
        setAdminForm({ username: "", first_name: "", project_id: "2" });
        loadAdminData();
      } else {
        const err = await res.json();
        alert(err.detail || "Ошибка создания администратора.");
      }
    } catch { alert("Ошибка соединения."); }
  };

  const handleCreateCoordinatorSubmit = async (e) => {
    e.preventDefault();
    if (!coordForm.username || !coordForm.first_name) return alert("Никнейм и имя обязательны.");
    try {
      const res = await fetch("http://localhost:8000/api/admin/coordinators", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({
          username: coordForm.username,
          first_name: coordForm.first_name,
          project_id: dbUser.project_id
        })
      });
      if (res.ok) {
        alert("Координатор проекта успешно зарегистрирован!");
        setCoordForm({ username: "", first_name: "" });
        loadAdminData();
      } else {
        const err = await res.json();
        alert(err.detail || "Ошибка создания координатора.");
      }
    } catch { alert("Ошибка соединения."); }
  };

  const handleCreateVolunteerSubmit = async (e) => {
    e.preventDefault();
    if (!volForm.username || !volForm.first_name) return alert("Никнейм и имя обязательны.");
    
    const targetProjId = (dbUser.role === "project_admin" || dbUser.role === "coordinator") ? dbUser.project_id : volForm.project_id;
    if (!targetProjId) return alert("Выберите направление проекта.");

    try {
      const payload = {
        username: volForm.username,
        first_name: volForm.first_name,
        phone: volForm.phone || null,
        age: volForm.age ? parseInt(volForm.age, 10) : null,
        project_id: parseInt(targetProjId, 10),
        skills: volForm.skills || null
      };
      if (dbUser.role !== "coordinator" && volForm.coordinator_id) {
        payload.coordinator_id = parseInt(volForm.coordinator_id, 10);
      }

      const res = await fetch("http://localhost:8000/api/admin/volunteers", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert("Волонтёр успешно добавлен!");
        setVolForm({ username: "", first_name: "", phone: "", age: "", project_id: "", skills: "", coordinator_id: "" });
        loadAdminData();
      } else {
        const err = await res.json();
        alert(err.detail || "Ошибка регистрации волонтера.");
      }
    } catch { alert("Ошибка соединения."); }
  };

  const handleUpdateBookingStatus = async (bookingId, newStatus) => {
    try {
      const res = await fetch(`http://localhost:8000/api/admin/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        alert(t.admSuccess);
        loadAdminData();
        loadCalendar();
      } else {
        const err = await res.json();
        alert(err.detail || "Недостаточно прав.");
      }
    } catch { alert("Ошибка."); }
  };

  const handleUpdateRequestStatus = async (requestId, newStatus) => {
    const responseText = adminReplyTexts[requestId] || "";
    try {
      const res = await fetch(`http://localhost:8000/api/admin/requests/${requestId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ status: newStatus, response: responseText })
      });
      if (res.ok) {
        alert(t.admSuccess);
        setAdminReplyTexts(prev => ({ ...prev, [requestId]: "" }));
        loadAdminData();
      } else {
        const err = await res.json();
        alert(err.detail || "Ошибка обновления.");
      }
    } catch { alert("Ошибка."); }
  };

  const activeCat = CATEGORY_MAP[selectedCategory] || CATEGORY_MAP.all;
  const landingStats = [t.stat1, t.stat2, t.stat3, t.stat4];
  const programCards = [
    { key: "shanyraq", className: "lpc-blue", index: "01", title: t.prog1Title, desc: t.prog1Desc },
    { key: "jasyl_el", className: "lpc-green", index: "02", title: t.prog2Title, desc: t.prog2Desc },
    { key: "taza_qazaqstan", className: "lpc-yellow", index: "03", title: t.prog3Title, desc: t.prog3Desc },
    { key: "zan_men_tartip", className: "lpc-red", index: "04", title: t.prog4Title, desc: t.prog4Desc },
  ];
  const landingPillars = [
    { title: t.focusEventsTitle, desc: t.focusEventsDesc, action: t.btnExplore, target: "home" },
    { title: t.focusJoinTitle, desc: t.focusJoinDesc, action: t.btnBecomeVol, target: "volunteer" },
    { title: t.focusVibeTitle, desc: t.focusVibeDesc, action: t.srvTitle, target: "services" },
  ];

  function nav(tab) { 
    setActiveTab(tab); 
    setSelectedEvent(null); 
  }

  const getStatusBadge = (statusStr) => {
    switch (statusStr) {
      case "approved": return <span className="badge-modern badge-green">{lang === "ru" ? "Одобрено" : "Мақұлданды"}</span>;
      case "rejected": return <span className="badge-modern badge-red">{lang === "ru" ? "Отклонено" : "Қабылданбады"}</span>;
      case "resolved": return <span className="badge-modern badge-green">{lang === "ru" ? "Решено" : "Шешілді"}</span>;
      case "pending": return <span className="badge-modern badge-yellow">{lang === "ru" ? "На рассмотрении" : "Қаралуда"}</span>;
      default: return <span className="badge-modern">{statusStr}</span>;
    }
  };

  // ──────────────────────────────────────────────────────────
  // ─── RENDERING: SUPER ADMIN WORKSPACE ROUTE (/admin) ───
  // ──────────────────────────────────────────────────────────
  if (isAdminRoute) {
    if (!dbUser || dbUser.role !== "super_admin") {
      return (
        <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.5rem", fontFamily: "Inter, sans-serif" }}>
          <div className="card-item" style={{ maxWidth: "450px", width: "100%", padding: "2.5rem", border: "2px solid #38bdf8", boxShadow: "0 0 25px rgba(56, 189, 248, 0.15)", background: "#0f172a", color: "#f8fafc" }}>
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <div style={{ display: "inline-flex", background: "#1e293b", border: "2px solid #38bdf8", borderRadius: "50%", width: "70px", height: "70px", alignItems: "center", justifyContent: "center", fontSize: "1.75rem", color: "#38bdf8", marginBottom: "1rem" }}>
                🔒
              </div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0, textTransform: "uppercase", letterSpacing: "1px" }}>ZHASTAR HQ</h1>
              <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Панель Управления Главного Администратора</span>
            </div>
            {dbUser ? (
              <div style={{ marginBottom: "2rem", textAlign: "center" }}>
                <p style={{ color: "#f87171", fontWeight: 700, fontSize: "0.95rem" }}>
                  Доступ запрещен. Эта панель только для Главного Администратора.
                </p>
                <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
                  <button className="btn-modern btn-modern-secondary" style={{ flex: 1, padding: "0.6rem" }} onClick={handleLogoutClick}>Выйти</button>
                  <button className="btn-modern btn-modern-primary" style={{ flex: 1, padding: "0.6rem" }} onClick={() => { window.location.hash = "#"; }}>На главную</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleLoginSubmit}>
                <div className="input-group-modern" style={{ marginBottom: "1.5rem" }}>
                  <label className="label-modern" style={{ color: "#94a3b8" }}>Имя пользователя (Супер Администратор)</label>
                  <input type="text" className="input-modern" style={{ background: "#1e293b", color: "white", border: "1px solid #475569" }} placeholder="Введите admin..." value={loginUsername} onChange={e => setLoginUsername(e.target.value)} required />
                </div>
                <button type="submit" className="btn-modern btn-modern-primary" style={{ width: "100%", padding: "0.85rem", fontSize: "1rem", background: "#38bdf8", border: "none", color: "#0f172a", fontWeight: 800 }}>Войти в панель управления</button>
                <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
                  <button type="button" style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "0.85rem", cursor: "pointer", textDecoration: "underline" }} onClick={() => { window.location.hash = "#"; }}>На главную</button>
                </div>
              </form>
            )}
          </div>
        </div>
      );
    }

    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", fontFamily: "Inter, sans-serif" }}>
        {/* Sidebar */}
        <aside style={{ width: "280px", background: "#0f172a", color: "#f8fafc", display: "flex", flexDirection: "column", borderRight: "2px solid #111827", padding: "1.5rem 1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2rem" }}>
            <div style={{ background: "#38bdf8", color: "#0f172a", fontWeight: 900, borderRadius: "8px", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>Z</div>
            <div>
              <strong style={{ display: "block", fontSize: "1.1rem" }}>ZHASTAR HQ</strong>
              <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Супер Администратор</span>
            </div>
          </div>
          <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
            <button className={`new-nav-link ${activeAdminTab === "requests" ? "active" : ""}`} style={{ width: "100%", textAlign: "left", padding: "0.75rem 1rem", background: activeAdminTab === "requests" ? "#1e293b" : "transparent", border: "none", borderRadius: "8px", color: "white", cursor: "pointer", fontWeight: 700 }} onClick={() => setActiveAdminTab("requests")}>✉️ Обращения ({adminRequests.length})</button>
            <button className={`new-nav-link ${activeAdminTab === "bookings" ? "active" : ""}`} style={{ width: "100%", textAlign: "left", padding: "0.75rem 1rem", background: activeAdminTab === "bookings" ? "#1e293b" : "transparent", border: "none", borderRadius: "8px", color: "white", cursor: "pointer", fontWeight: 700 }} onClick={() => setActiveAdminTab("bookings")}>🏢 Бронирования ({adminBookings.length})</button>
            <button className={`new-nav-link ${activeAdminTab === "volunteers" ? "active" : ""}`} style={{ width: "100%", textAlign: "left", padding: "0.75rem 1rem", background: activeAdminTab === "volunteers" ? "#1e293b" : "transparent", border: "none", borderRadius: "8px", color: "white", cursor: "pointer", fontWeight: 700 }} onClick={() => setActiveAdminTab("volunteers")}>👥 Все волонтёры ({adminVolunteers.length})</button>
            <button className={`new-nav-link ${activeAdminTab === "create_admin" ? "active" : ""}`} style={{ width: "100%", textAlign: "left", padding: "0.75rem 1rem", background: activeAdminTab === "create_admin" ? "#1e293b" : "transparent", border: "none", borderRadius: "8px", color: "white", cursor: "pointer", fontWeight: 700 }} onClick={() => setActiveAdminTab("create_admin")}>👑 Руководители ({adminLeaders.length})</button>
            <button className={`new-nav-link ${activeAdminTab === "events" ? "active" : ""}`} style={{ width: "100%", textAlign: "left", padding: "0.75rem 1rem", background: activeAdminTab === "events" ? "#1e293b" : "transparent", border: "none", borderRadius: "8px", color: "white", cursor: "pointer", fontWeight: 700 }} onClick={() => setActiveAdminTab("events")}>🗓️ Мероприятия ({adminEvents.length})</button>
            <button className={`new-nav-link ${activeAdminTab === "news" ? "active" : ""}`} style={{ width: "100%", textAlign: "left", padding: "0.75rem 1rem", background: activeAdminTab === "news" ? "#1e293b" : "transparent", border: "none", borderRadius: "8px", color: "white", cursor: "pointer", fontWeight: 700 }} onClick={() => setActiveAdminTab("news")}>📢 Новости центра</button>
          </nav>
          <div style={{ borderTop: "1px solid #334155", paddingTop: "1rem" }}>
            <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: "0.5rem" }}>Вошли как: {dbUser.first_name}</div>
            <button className="btn-modern btn-modern-secondary" style={{ width: "100%", padding: "0.5rem" }} onClick={handleLogoutClick}>Выйти</button>
            <button className="btn-modern btn-modern-primary" style={{ width: "100%", padding: "0.5rem", marginTop: "0.5rem", background: "transparent", border: "1px solid #38bdf8", color: "#38bdf8" }} onClick={() => { window.location.hash = "#"; }}>← На сайт</button>
          </div>
        </aside>
        <main style={{ flex: 1, padding: "2.5rem 3rem", overflowY: "auto" }}>
          {/* Stats metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "1rem", marginBottom: "2.5rem" }}>
            <div className="card-item" style={{ padding: "0.95rem" }}><div style={{ fontSize: "1.45rem", fontWeight: 900 }}>{adminRequests.length}</div><div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Всего обращений</div></div>
            <div className="card-item" style={{ padding: "0.95rem" }}><div style={{ fontSize: "1.45rem", fontWeight: 900 }}>{adminBookings.length}</div><div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Заявок комнат</div></div>
            <div className="card-item" style={{ padding: "0.95rem" }}><div style={{ fontSize: "1.45rem", fontWeight: 900 }}>{adminVolunteers.length}</div><div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Всего волонтёров</div></div>
            <div className="card-item" style={{ padding: "0.95rem" }}><div style={{ fontSize: "1.45rem", fontWeight: 900 }}>{adminLeaders.length}</div><div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Руководителей</div></div>
            <div className="card-item" style={{ padding: "0.95rem" }}><div style={{ fontSize: "1.45rem", fontWeight: 900 }}>{adminEvents.length}</div><div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Мероприятий</div></div>
            <div className="card-item" style={{ padding: "0.95rem" }}><div style={{ fontSize: "1.45rem", fontWeight: 900 }}>{PROJECTS.length}</div><div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Всего проектов</div></div>
          </div>
          {activeAdminTab === "requests" && (
            <div className="card-item" style={{ padding: "0" }}>
              <div className="table-responsive" style={{ border: "none", marginTop: 0 }}>
                <table className="table-modern">
                  <thead><tr><th style={{ paddingLeft: "1.5rem" }}>ID</th><th>Отправитель</th><th>Направление</th><th>Тип / Тема</th><th>Описание</th><th>Статус</th><th style={{ paddingRight: "1.5rem" }}>Ответ</th></tr></thead>
                  <tbody>
                    {adminRequests.length === 0 ? (
                      <tr><td colSpan="7" style={{ textAlign: "center", padding: "3rem" }}>Нет обращений.</td></tr>
                    ) : adminRequests.map(req => (
                      <tr key={req.id}>
                        <td style={{ paddingLeft: "1.5rem" }}>#{req.id}</td>
                        <td><strong>{req.requester?.first_name}</strong><span style={{ display: "block", fontSize: "0.8rem" }}>{req.requester?.phone}</span></td>
                        <td><span style={{ fontWeight: 700, color: "var(--accent)" }}>{req.target_project?.name || "Бас кеңсе"}</span></td>
                        <td><strong>{req.type}</strong><br/>{req.subject}</td>
                        <td style={{ maxWidth: "250px", fontSize: "0.9rem" }}>{req.description}</td>
                        <td>{getStatusBadge(req.status)}</td>
                        <td style={{ paddingRight: "1.5rem", minWidth: "200px" }}>
                          {req.status === "pending" ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                              <input type="text" className="input-modern" placeholder="Ответ..." value={adminReplyTexts[req.id] || ""} onChange={e => setAdminReplyTexts({ ...adminReplyTexts, [req.id]: e.target.value })} style={{ padding: "0.4rem" }} />
                              <div style={{ display: "flex", gap: "0.4rem" }}>
                                <button className="btn-modern btn-modern-accent" onClick={() => handleUpdateRequestStatus(req.id, "resolved")} style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}>Решить</button>
                                <button className="btn-modern btn-modern-secondary" onClick={() => handleUpdateRequestStatus(req.id, "rejected")} style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}>Отклонить</button>
                              </div>
                            </div>
                          ) : <span>{req.response}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {activeAdminTab === "bookings" && (
            <div className="card-item" style={{ padding: "0" }}>
              <div className="table-responsive" style={{ border: "none", marginTop: 0 }}>
                <table className="table-modern">
                  <thead><tr><th style={{ paddingLeft: "1.5rem" }}>ID</th><th>Заявитель</th><th>Помещение</th><th>Дата и время</th><th>Статус</th><th style={{ paddingRight: "1.5rem" }}>Решение</th></tr></thead>
                  <tbody>
                    {adminBookings.map(bk => (
                      <tr key={bk.id}>
                        <td style={{ paddingLeft: "1.5rem" }}>#{bk.id}</td>
                        <td><strong>{bk.user?.first_name}</strong><br/>{bk.user?.phone}</td>
                        <td>{bk.room?.name}</td>
                        <td>{bk.date}<br/>{bk.time_start} - {bk.time_end}</td>
                        <td>{getStatusBadge(bk.status)}</td>
                        <td style={{ paddingRight: "1.5rem" }}>
                          {bk.status === "pending" ? (
                            <div style={{ display: "flex", gap: "0.4rem" }}>
                              <button className="btn-modern btn-modern-accent" onClick={() => handleUpdateBookingStatus(bk.id, "approved")} style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}>Одобрить</button>
                              <button className="btn-modern btn-modern-secondary" onClick={() => handleUpdateBookingStatus(bk.id, "rejected")} style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}>Отклонить</button>
                            </div>
                          ) : <span>Обработано</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {activeAdminTab === "volunteers" && (
            <div className="card-item" style={{ padding: "0" }}>
              <div className="table-responsive" style={{ border: "none", marginTop: 0 }}>
                <table className="table-modern">
                  <thead>
                    <tr>
                      <th style={{ paddingLeft: "1.5rem" }}>Имя</th>
                      <th>Направление</th>
                      <th>Куратор (Координатор)</th>
                      <th>Контакты / Возраст</th>
                      <th>Навыки</th>
                      <th style={{ paddingRight: "1.5rem" }}>Часы</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminVolunteers.map(v => (
                      <tr key={v.id}>
                        <td style={{ paddingLeft: "1.5rem" }}><strong>{v.user?.first_name}</strong><br/>@{v.user?.username}</td>
                        <td><span className="card-category-badge" style={{ background: PROJECTS.find(p => p.id === v.project_id)?.color, color: "white" }}>{v.project?.name}</span></td>
                        <td>
                          {v.coordinator ? (
                            <div>
                              <strong>{v.coordinator.first_name}</strong>
                              <span style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)" }}>@{v.coordinator.username}</span>
                            </div>
                          ) : <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>—</span>}
                        </td>
                        <td>{v.user?.phone || "—"} / {v.user?.age ? `${v.user.age} лет` : "—"}</td>
                        <td>{v.skills || "—"}</td>
                        <td style={{ paddingRight: "1.5rem", fontWeight: 700 }}>⏱️ {v.hours_logged} ч.</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {activeAdminTab === "create_admin" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "2rem" }}>
              <div className="card-item" style={{ padding: "1.5rem" }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "1rem" }}>Создать руководителя</h3>
                <form onSubmit={handleCreateAdminSubmit}>
                  <div className="input-group-modern"><label className="label-modern">Никнейм руководителя *</label><input type="text" className="input-modern" placeholder="shanyraq_leader" value={adminForm.username} onChange={e => setAdminForm({ ...adminForm, username: e.target.value })} required /></div>
                  <div className="input-group-modern"><label className="label-modern">Имя руководителя *</label><input type="text" className="input-modern" placeholder="Марат" value={adminForm.first_name} onChange={e => setAdminForm({ ...adminForm, first_name: e.target.value })} required /></div>
                  <div className="input-group-modern">
                    <label className="label-modern">Направление проекта</label>
                    <select className="input-modern" value={adminForm.project_id} onChange={e => setAdminForm({ ...adminForm, project_id: e.target.value })} required>
                      {PROJECTS.filter(p => p.id !== 1).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <button type="submit" className="btn-modern btn-modern-primary" style={{ width: "100%", marginTop: "1rem" }}>Создать руководителя</button>
                </form>
              </div>

              <div className="card-item" style={{ padding: "0" }}>
                <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--border)", background: "#F8FAFC" }}>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0 }}>Реестр Руководителей Проектов</h3>
                </div>
                <div className="table-responsive" style={{ border: "none", marginTop: 0 }}>
                  <table className="table-modern">
                    <thead>
                      <tr>
                        <th style={{ paddingLeft: "1.5rem" }}>Имя</th>
                        <th>Никнейм</th>
                        <th>Направление проекта</th>
                        <th style={{ paddingRight: "1.5rem" }}>ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminLeaders.length === 0 ? (
                        <tr><td colSpan="4" style={{ textAlign: "center", padding: "3rem" }}>Руководители еще не созданы.</td></tr>
                      ) : adminLeaders.map(leader => (
                        <tr key={leader.id}>
                          <td style={{ paddingLeft: "1.5rem" }}><strong>{leader.first_name}</strong></td>
                          <td><span style={{ color: "var(--accent)", fontWeight: 600 }}>@{leader.username}</span></td>
                          <td>
                            <span className="card-category-badge" style={{ background: PROJECTS.find(p => p.id === leader.project_id)?.color || "var(--accent)", color: "white", margin: 0 }}>
                              {PROJECTS.find(p => p.id === leader.project_id)?.name || "HQ / Center"}
                            </span>
                          </td>
                          <td style={{ paddingRight: "1.5rem", fontFamily: "monospace", color: "var(--text-secondary)" }}>#{leader.id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {activeAdminTab === "events" && (
            <div className="card-item" style={{ padding: "0" }}>
              <div className="table-responsive" style={{ border: "none", marginTop: 0 }}>
                <table className="table-modern">
                  <thead>
                    <tr>
                      <th style={{ paddingLeft: "1.5rem" }}>ID</th>
                      <th>Мероприятие (Что)</th>
                      <th>Дата и Время (Когда)</th>
                      <th>Место проведения (Где)</th>
                      <th style={{ paddingRight: "1.5rem" }}>Кто проводит (Организатор)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminEvents.length === 0 ? (
                      <tr><td colSpan="5" style={{ textAlign: "center", padding: "3rem" }}>Мероприятия еще не созданы.</td></tr>
                    ) : adminEvents.map(ev => {
                      const proj = PROJECTS.find(p => p.id === ev.project_id);
                      const roomObj = rooms.find(r => r.id === ev.room_id);
                      return (
                        <tr key={ev.id}>
                          <td style={{ paddingLeft: "1.5rem", fontFamily: "monospace" }}>#{ev.id}</td>
                          <td style={{ maxWidth: "300px" }}>
                            <strong style={{ fontSize: "1rem", color: "var(--text)" }}>{ev.title}</strong>
                            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: "0.25rem 0 0", lineHeight: 1.4 }}>{ev.description}</p>
                          </td>
                          <td style={{ minWidth: "160px" }}>
                            <strong>{new Date(ev.event_date).toLocaleDateString(lang === "ru" ? "ru-RU" : "kk-KZ", { day: "numeric", month: "long" })}</strong>
                            <span style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                              {new Date(ev.event_date).toLocaleTimeString(lang === "ru" ? "ru-RU" : "kk-KZ", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </td>
                          <td>
                            <strong>{roomObj ? roomObj.name : "Вне помещений"}</strong>
                            <span style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)" }}>{ev.address}</span>
                          </td>
                          <td style={{ paddingRight: "1.5rem" }}>
                            <span className="card-category-badge" style={{ background: proj ? proj.color : "var(--c-general)", color: "white", display: "inline-block", margin: "0 0 0.25rem 0" }}>
                              {proj ? proj.name : "Center HQ"}
                            </span>
                            <span style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                              отв: {ev.organizer?.first_name || "Администрация"} (@{ev.organizer?.username || "admin"})
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {activeAdminTab === "news" && (
            <div className="card-item" style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
              <form onSubmit={handleCreateNews}>
                <div className="input-group-modern"><label className="label-modern">Заголовок новости</label><input type="text" className="input-modern" placeholder="Срочная новость..." value={newsForm.title} onChange={e => setNewsForm({ ...newsForm, title: e.target.value })} required /></div>
                <div className="input-group-modern"><label className="label-modern">Содержание новости</label><textarea className="input-modern" rows="5" placeholder="Текст..." value={newsForm.body} onChange={e => setNewsForm({ ...newsForm, body: e.target.value })} required /></div>
                <div className="input-group-modern">
                  <label className="label-modern">Проект</label>
                  <select className="input-modern" value={newsForm.project_id} onChange={e => setNewsForm({ ...newsForm, project_id: e.target.value })}>
                    <option value="">HQ / Общие новости</option>
                    {PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <button type="submit" className="btn-modern btn-modern-primary" style={{ width: "100%", marginTop: "1rem" }}>Опубликовать</button>
              </form>
            </div>
          )}
        </main>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────
  // ─── RENDERING: PROJECT LEADER WORKSPACE ROUTE (/leader) ───
  // ──────────────────────────────────────────────────────────
  if (isLeaderRoute) {
    if (!dbUser || dbUser.role !== "project_admin") {
      return (
        <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.5rem", fontFamily: "Inter, sans-serif" }}>
          <div className="card-item" style={{ maxWidth: "450px", width: "100%", padding: "2.5rem", border: "2px solid #a78bfa", boxShadow: "0 0 25px rgba(167, 139, 250, 0.15)", background: "#0f172a", color: "#f8fafc" }}>
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <div style={{ display: "inline-flex", background: "#1e1b4b", border: "2px solid #a78bfa", borderRadius: "50%", width: "70px", height: "70px", alignItems: "center", justifyContent: "center", fontSize: "1.75rem", color: "#a78bfa", marginBottom: "1rem" }}>
                👑
              </div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0, textTransform: "uppercase", letterSpacing: "1px" }}>ZHASTAR LEADERS</h1>
              <span style={{ fontSize: "0.85rem", color: "#c084fc" }}>Панель Лидера Молодежных Проектов</span>
            </div>
            {dbUser ? (
              <div style={{ marginBottom: "2rem", textAlign: "center" }}>
                <p style={{ color: "#f87171", fontWeight: 700, fontSize: "0.95rem" }}>
                  Доступ запрещен. Учетная запись @{dbUser.username} не имеет роли Руководителя Проекта.
                </p>
                <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
                  <button className="btn-modern btn-modern-secondary" style={{ flex: 1, padding: "0.6rem" }} onClick={handleLogoutClick}>Выйти</button>
                  <button className="btn-modern btn-modern-primary" style={{ flex: 1, padding: "0.6rem" }} onClick={() => { window.location.hash = "#"; }}>На главную</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleLoginSubmit}>
                <div className="input-group-modern" style={{ marginBottom: "1.5rem" }}>
                  <label className="label-modern" style={{ color: "#c084fc" }}>Никнейм руководителя проекта</label>
                  <input type="text" className="input-modern" style={{ background: "#1e1b4b", color: "white", border: "1px solid #475569" }} placeholder="shanyraq_admin..." value={loginUsername} onChange={e => setLoginUsername(e.target.value)} required />
                </div>
                <button type="submit" className="btn-modern btn-modern-primary" style={{ width: "100%", padding: "0.85rem", fontSize: "1rem", background: "#a78bfa", border: "none", color: "#0f172a", fontWeight: 800 }}>Войти в панель лидера</button>
                <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
                  <button type="button" style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "0.85rem", cursor: "pointer", textDecoration: "underline" }} onClick={() => { window.location.hash = "#"; }}>На главную</button>
                </div>
              </form>
            )}
          </div>
        </div>
      );
    }

    const currentProject = PROJECTS.find(p => p.id === dbUser.project_id) || { name: "Проект" };

    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", fontFamily: "Inter, sans-serif" }}>
        {/* Leader Sidebar */}
        <aside style={{ width: "280px", background: "#1e1b4b", color: "#f8fafc", display: "flex", flexDirection: "column", borderRight: "2px solid #111827", padding: "1.5rem 1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2rem" }}>
            <div style={{ background: "#a78bfa", color: "#1e1b4b", fontWeight: 900, borderRadius: "8px", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>👑</div>
            <div>
              <strong style={{ display: "block", fontSize: "1.1rem" }}>{currentProject.name}</strong>
              <span style={{ fontSize: "0.75rem", color: "#c084fc" }}>Кабинет Руководителя</span>
            </div>
          </div>
          <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
            <button className={`new-nav-link ${activeAdminTab === "requests" ? "active" : ""}`} style={{ width: "100%", textAlign: "left", padding: "0.75rem 1rem", background: activeAdminTab === "requests" ? "#312e81" : "transparent", border: "none", borderRadius: "8px", color: "white", cursor: "pointer", fontWeight: 700 }} onClick={() => setActiveAdminTab("requests")}>✉️ Обращения ({adminRequests.length})</button>
            <button className={`new-nav-link ${activeAdminTab === "coordinators" ? "active" : ""}`} style={{ width: "100%", textAlign: "left", padding: "0.75rem 1rem", background: activeAdminTab === "coordinators" ? "#312e81" : "transparent", border: "none", borderRadius: "8px", color: "white", cursor: "pointer", fontWeight: 700 }} onClick={() => setActiveAdminTab("coordinators")}>👥 Координаторы ({adminCoordinators.length})</button>
            <button className={`new-nav-link ${activeAdminTab === "volunteers" ? "active" : ""}`} style={{ width: "100%", textAlign: "left", padding: "0.75rem 1rem", background: activeAdminTab === "volunteers" ? "#312e81" : "transparent", border: "none", borderRadius: "8px", color: "white", cursor: "pointer", fontWeight: 700 }} onClick={() => setActiveAdminTab("volunteers")}>👥 Волонтёры проекта ({adminVolunteers.length})</button>
            <button className={`new-nav-link ${activeAdminTab === "news" ? "active" : ""}`} style={{ width: "100%", textAlign: "left", padding: "0.75rem 1rem", background: activeAdminTab === "news" ? "#312e81" : "transparent", border: "none", borderRadius: "8px", color: "white", cursor: "pointer", fontWeight: 700 }} onClick={() => setActiveAdminTab("news")}>📢 Новости проекта</button>
            <button className={`new-nav-link ${activeAdminTab === "events" ? "active" : ""}`} style={{ width: "100%", textAlign: "left", padding: "0.75rem 1rem", background: activeAdminTab === "events" ? "#312e81" : "transparent", border: "none", borderRadius: "8px", color: "white", cursor: "pointer", fontWeight: 700 }} onClick={() => setActiveAdminTab("events")}>🗓️ Мероприятия</button>
          </nav>
          <div style={{ borderTop: "1px solid #4338ca", paddingTop: "1rem" }}>
            <div style={{ fontSize: "0.8rem", color: "#c084fc", marginBottom: "0.5rem" }}>Лидер: {dbUser.first_name}</div>
            <button className="btn-modern btn-modern-secondary" style={{ width: "100%", padding: "0.5rem" }} onClick={handleLogoutClick}>Выйти</button>
            <button className="btn-modern btn-modern-primary" style={{ width: "100%", padding: "0.5rem", marginTop: "0.5rem", background: "transparent", border: "1px solid #a78bfa", color: "#a78bfa" }} onClick={() => { window.location.hash = "#"; }}>← На сайт</button>
          </div>
        </aside>
        <main style={{ flex: 1, padding: "2.5rem 3rem", overflowY: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.5rem", marginBottom: "2.5rem" }}>
            <div className="card-item" style={{ padding: "1.25rem" }}><div style={{ fontSize: "1.75rem", fontWeight: 900 }}>{adminRequests.length}</div><div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Ваши обращения</div></div>
            <div className="card-item" style={{ padding: "1.25rem" }}><div style={{ fontSize: "1.75rem", fontWeight: 900 }}>{adminCoordinators.length}</div><div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Координаторов</div></div>
            <div className="card-item" style={{ padding: "1.25rem" }}><div style={{ fontSize: "1.75rem", fontWeight: 900 }}>{adminVolunteers.length}</div><div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Ваши волонтёры</div></div>
            <div className="card-item" style={{ padding: "1.25rem" }}><div style={{ fontSize: "1.75rem", fontWeight: 900 }}>{currentProject.name}</div><div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Направление</div></div>
          </div>
          {activeAdminTab === "requests" && (
            <div className="card-item" style={{ padding: "0" }}>
              <div className="table-responsive" style={{ border: "none", marginTop: 0 }}>
                <table className="table-modern">
                  <thead><tr><th style={{ paddingLeft: "1.5rem" }}>ID</th><th>Отправитель</th><th>Тип / Тема</th><th>Описание</th><th>Статус</th><th style={{ paddingRight: "1.5rem" }}>Действие</th></tr></thead>
                  <tbody>
                    {adminRequests.length === 0 ? (
                      <tr><td colSpan="6" style={{ textAlign: "center", padding: "3rem" }}>У вас нет новых обращений.</td></tr>
                    ) : adminRequests.map(req => (
                      <tr key={req.id}>
                        <td style={{ paddingLeft: "1.5rem" }}>#{req.id}</td>
                        <td><strong>{req.requester?.first_name}</strong><br/>{req.requester?.phone}</td>
                        <td><strong>{req.type}</strong><br/>{req.subject}</td>
                        <td style={{ maxWidth: "250px", fontSize: "0.9rem" }}>{req.description}</td>
                        <td>{getStatusBadge(req.status)}</td>
                        <td style={{ paddingRight: "1.5rem", minWidth: "200px" }}>
                          {req.status === "pending" ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                              <input type="text" className="input-modern" placeholder="Текст ответа..." value={adminReplyTexts[req.id] || ""} onChange={e => setAdminReplyTexts({ ...adminReplyTexts, [req.id]: e.target.value })} style={{ padding: "0.4rem" }} />
                              <div style={{ display: "flex", gap: "0.4rem" }}>
                                <button className="btn-modern btn-modern-accent" onClick={() => handleUpdateRequestStatus(req.id, "resolved")} style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}>Решить</button>
                                <button className="btn-modern btn-modern-secondary" onClick={() => handleUpdateRequestStatus(req.id, "rejected")} style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}>Отклонить</button>
                              </div>
                            </div>
                          ) : <span>{req.response}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {activeAdminTab === "coordinators" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "2rem" }}>
              <div className="card-item" style={{ padding: "1.5rem" }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "1rem" }}>Добавить Координатора</h3>
                <form onSubmit={handleCreateCoordinatorSubmit}>
                  <div className="input-group-modern"><label className="label-modern">Никнейм *</label><input type="text" className="input-modern" placeholder="jasyl_coord_nik" value={coordForm.username} onChange={e => setCoordForm({ ...coordForm, username: e.target.value })} required /></div>
                  <div className="input-group-modern"><label className="label-modern">Имя координатора *</label><input type="text" className="input-modern" placeholder="Дамир" value={coordForm.first_name} onChange={e => setCoordForm({ ...coordForm, first_name: e.target.value })} required /></div>
                  <button type="submit" className="btn-modern btn-modern-primary" style={{ width: "100%", marginTop: "1rem" }}>Зарегистрировать</button>
                </form>
              </div>
              <div className="card-item" style={{ padding: "0" }}>
                <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--border)", background: "#F8FAFC" }}>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0 }}>Координаторы направления {currentProject.name}</h3>
                </div>
                <div className="table-responsive" style={{ border: "none", marginTop: 0 }}>
                  <table className="table-modern">
                    <thead><tr><th style={{ paddingLeft: "1.5rem" }}>Имя</th><th>Никнейм</th><th style={{ paddingRight: "1.5rem" }}>ID Координатора</th></tr></thead>
                    <tbody>
                      {adminCoordinators.length === 0 ? (
                        <tr><td colSpan="3" style={{ textAlign: "center", padding: "3rem" }}>Координаторы еще не добавлены.</td></tr>
                      ) : adminCoordinators.map(c => (
                        <tr key={c.id}>
                          <td style={{ paddingLeft: "1.5rem" }}><strong>{c.first_name}</strong></td>
                          <td><span style={{ color: "var(--accent)", fontWeight: 600 }}>@{c.username}</span></td>
                          <td style={{ paddingRight: "1.5rem", fontFamily: "monospace", color: "var(--text-secondary)" }}>#{c.id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {activeAdminTab === "volunteers" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "2rem" }}>
              <div className="card-item" style={{ padding: "1.5rem" }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "1rem" }}>{t.admAddVol}</h3>
                <form onSubmit={handleCreateVolunteerSubmit}>
                  <div className="input-group-modern"><label className="label-modern">Никнейм *</label><input type="text" className="input-modern" placeholder="vol_username" value={volForm.username} onChange={e => setVolForm({ ...volForm, username: e.target.value })} required /></div>
                  <div className="input-group-modern"><label className="label-modern">Имя *</label><input type="text" className="input-modern" placeholder="Иван" value={volForm.first_name} onChange={e => setVolForm({ ...volForm, first_name: e.target.value })} required /></div>
                  <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "0.5rem" }}>
                    <div className="input-group-modern"><label className="label-modern">Телефон</label><input type="tel" className="input-modern" placeholder="+7..." value={volForm.phone} onChange={e => setVolForm({ ...volForm, phone: e.target.value })} /></div>
                    <div className="input-group-modern"><label className="label-modern">Возраст</label><input type="number" className="input-modern" placeholder="18" value={volForm.age} onChange={e => setVolForm({ ...volForm, age: e.target.value })} /></div>
                  </div>
                  <div className="input-group-modern">
                    <label className="label-modern">Куратор (Координатор)</label>
                    <select 
                      className="input-modern" 
                      value={volForm.coordinator_id} 
                      onChange={e => setVolForm({ ...volForm, coordinator_id: e.target.value })}
                    >
                      <option value="">Без куратора</option>
                      {adminCoordinators.map(c => (
                        <option key={c.id} value={c.id}>{c.first_name} (@{c.username})</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group-modern"><label className="label-modern">Навыки</label><input type="text" className="input-modern" placeholder="Экология..." value={volForm.skills} onChange={e => setVolForm({ ...volForm, skills: e.target.value })} /></div>
                  <button type="submit" className="btn-modern btn-modern-primary" style={{ width: "100%", marginTop: "1rem" }}>Добавить волонтера</button>
                </form>
              </div>
              <div className="card-item" style={{ padding: "0" }}>
                <div className="table-responsive" style={{ border: "none", marginTop: 0 }}>
                  <table className="table-modern">
                    <thead>
                      <tr>
                        <th style={{ paddingLeft: "1.5rem" }}>Имя</th>
                        <th>Куратор (Координатор)</th>
                        <th>Контакты / Возраст</th>
                        <th>Навыки</th>
                        <th style={{ paddingRight: "1.5rem" }}>Часы</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminVolunteers.length === 0 ? (
                        <tr><td colSpan="5" style={{ textAlign: "center", padding: "3rem" }}>Волонтеры еще не добавлены.</td></tr>
                      ) : adminVolunteers.map(vp => (
                        <tr key={vp.id}>
                          <td style={{ paddingLeft: "1.5rem" }}><strong>{vp.user?.first_name}</strong><br/>@{vp.user?.username}</td>
                          <td>
                            {vp.coordinator ? (
                              <div>
                                <strong>{vp.coordinator.first_name}</strong>
                                <span style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)" }}>@{vp.coordinator.username}</span>
                              </div>
                            ) : <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>—</span>}
                          </td>
                          <td><span>{vp.user?.age ? `${vp.user.age} лет` : "—"}</span><br/>{vp.user?.phone}</td>
                          <td>{vp.skills || "—"}</td>
                          <td style={{ paddingRight: "1.5rem", fontWeight: 700, color: "var(--accent)" }}>⏱️ {vp.hours_logged} ч.</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {activeAdminTab === "news" && (
            <div className="card-item" style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
              <form onSubmit={handleCreateNews}>
                <div className="input-group-modern"><label className="label-modern">Заголовок новости</label><input type="text" className="input-modern" placeholder="События проекта..." value={newsForm.title} onChange={e => setNewsForm({ ...newsForm, title: e.target.value })} required /></div>
                <div className="input-group-modern"><label className="label-modern">Текст новости</label><textarea className="input-modern" rows="5" placeholder="Содержание..." value={newsForm.body} onChange={e => setNewsForm({ ...newsForm, body: e.target.value })} required /></div>
                <button type="submit" className="btn-modern btn-modern-primary" style={{ width: "100%", marginTop: "1rem" }}>Опубликовать новость проекта</button>
              </form>
            </div>
          )}
          {activeAdminTab === "events" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "2rem" }}>
              <div className="card-item" style={{ padding: "1.5rem" }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "1rem" }}>Создать акцию</h3>
                <form onSubmit={handleProposalSubmit}>
                  <div className="input-group-modern"><label className="label-modern">Название акции</label><input type="text" className="input-modern" value={proposalData.title} onChange={e => setProposalData({ ...proposalData, title: e.target.value })} required /></div>
                  <div className="input-group-modern"><label className="label-modern">Описание акции</label><textarea className="input-modern" rows="3" value={proposalData.description} onChange={e => setProposalData({ ...proposalData, description: e.target.value })} required /></div>
                  <div className="input-group-modern"><label className="label-modern">Место сбора</label><input type="text" className="input-modern" value={proposalData.address} onChange={e => setProposalData({ ...proposalData, address: e.target.value })} required /></div>
                  <div className="input-group-modern"><label className="label-modern">Дата и время начала</label><input type="datetime-local" className="input-modern" value={proposalData.event_date} onChange={e => setProposalData({ ...proposalData, event_date: e.target.value })} required /></div>
                  <button type="submit" className="btn-modern btn-modern-primary" style={{ width: "100%", marginTop: "1rem" }}>Опубликовать</button>
                </form>
              </div>
              <div className="card-item" style={{ padding: "0" }}>
                <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--border)", background: "#F8FAFC" }}>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0 }}>Предстоящие акции направления {currentProject.name}</h3>
                </div>
                <div className="table-responsive" style={{ border: "none", marginTop: 0 }}>
                  <table className="table-modern">
                    <thead><tr><th style={{ paddingLeft: "1.5rem" }}>Что</th><th>Когда / Где</th><th style={{ paddingRight: "1.5rem" }}>Баллы</th></tr></thead>
                    <tbody>
                      {adminEvents.filter(ev => ev.project_id === dbUser.project_id).length === 0 ? (
                        <tr><td colSpan="3" style={{ textAlign: "center", padding: "3rem" }}>Нет запланированных акций.</td></tr>
                      ) : adminEvents.filter(ev => ev.project_id === dbUser.project_id).map(ev => (
                        <tr key={ev.id}>
                          <td style={{ paddingLeft: "1.5rem" }}><strong>{ev.title}</strong><br/><span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{ev.description}</span></td>
                          <td><strong>{new Date(ev.event_date).toLocaleDateString()}</strong><br/>{ev.address}</td>
                          <td style={{ paddingRight: "1.5rem", fontWeight: 800, color: "var(--accent)" }}>+{ev.points_reward} PTS</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────
  // ─── RENDERING: WORKER-COORDINATOR WORKSPACE ROUTE (/coordinator) ───
  // ──────────────────────────────────────────────────────────
  if (isCoordinatorRoute) {
    if (!dbUser || dbUser.role !== "coordinator") {
      return (
        <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #022c22 0%, #064e3b 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.5rem", fontFamily: "Inter, sans-serif" }}>
          <div className="card-item" style={{ maxWidth: "450px", width: "100%", padding: "2.5rem", border: "2px solid #34d399", boxShadow: "0 0 25px rgba(52, 211, 153, 0.15)", background: "#022c22", color: "#f8fafc" }}>
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <div style={{ display: "inline-flex", background: "#064e3b", border: "2px solid #34d399", borderRadius: "50%", width: "70px", height: "70px", alignItems: "center", justifyContent: "center", fontSize: "1.75rem", color: "#34d399", marginBottom: "1rem" }}>
                💼
              </div>
              <h1 style={{ fontSize: "1.45rem", fontWeight: 800, margin: 0, textTransform: "uppercase", letterSpacing: "1px" }}>ZHASTAR WORKERS</h1>
              <span style={{ fontSize: "0.85rem", color: "#a7f3d0" }}>Панель Координатора / Работника направления</span>
            </div>
            {dbUser ? (
              <div style={{ marginBottom: "2rem", textAlign: "center" }}>
                <p style={{ color: "#f87171", fontWeight: 700, fontSize: "0.95rem" }}>
                  Доступ запрещен. Учетная запись @{dbUser.username} не имеет роли Координатора.
                </p>
                <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
                  <button className="btn-modern btn-modern-secondary" style={{ flex: 1, padding: "0.6rem" }} onClick={handleLogoutClick}>Выйти</button>
                  <button className="btn-modern btn-modern-primary" style={{ flex: 1, padding: "0.6rem" }} onClick={() => { window.location.hash = "#"; }}>На главную</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleLoginSubmit}>
                <div className="input-group-modern" style={{ marginBottom: "1.5rem" }}>
                  <label className="label-modern" style={{ color: "#34d399" }}>Никнейм координатора / работника</label>
                  <input type="text" className="input-modern" style={{ background: "#064e3b", color: "white", border: "1px solid #047857" }} placeholder="jasylel_coordinator..." value={loginUsername} onChange={e => setLoginUsername(e.target.value)} required />
                </div>
                <button type="submit" className="btn-modern btn-modern-primary" style={{ width: "100%", padding: "0.85rem", fontSize: "1rem", background: "#34d399", border: "none", color: "#022c22", fontWeight: 800 }}>Войти в кабинет работника</button>
                <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
                  <button type="button" style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "0.85rem", cursor: "pointer", textDecoration: "underline" }} onClick={() => { window.location.hash = "#"; }}>На главную</button>
                </div>
              </form>
            )}
          </div>
        </div>
      );
    }

    const currentProject = PROJECTS.find(p => p.id === dbUser.project_id) || { name: "Проект" };
    const myProjectEvents = adminEvents.filter(ev => ev.project_id === dbUser.project_id);

    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", fontFamily: "Inter, sans-serif" }}>
        {/* Coordinator Sidebar */}
        <aside style={{ width: "280px", background: "#064e3b", color: "#f8fafc", display: "flex", flexDirection: "column", borderRight: "2px solid #111827", padding: "1.5rem 1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2rem" }}>
            <div style={{ background: "#34d399", color: "#064e3b", fontWeight: 900, borderRadius: "8px", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>👷</div>
            <div>
              <strong style={{ display: "block", fontSize: "1.1rem" }}>{currentProject.name}</strong>
              <span style={{ fontSize: "0.75rem", color: "#a7f3d0" }}>Координатор проекта</span>
            </div>
          </div>
          <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
            <button className={`new-nav-link ${activeAdminTab === "volunteers" ? "active" : ""}`} style={{ width: "100%", textAlign: "left", padding: "0.75rem 1rem", background: activeAdminTab === "volunteers" ? "#047857" : "transparent", border: "none", borderRadius: "8px", color: "white", cursor: "pointer", fontWeight: 700 }} onClick={() => setActiveAdminTab("volunteers")}>👥 База волонтёров ({adminVolunteers.length})</button>
            <button className={`new-nav-link ${activeAdminTab === "events" ? "active" : ""}`} style={{ width: "100%", textAlign: "left", padding: "0.75rem 1rem", background: activeAdminTab === "events" ? "#047857" : "transparent", border: "none", borderRadius: "8px", color: "white", cursor: "pointer", fontWeight: 700 }} onClick={() => setActiveAdminTab("events")}>🗓️ Отметки участия ({myProjectEvents.length})</button>
          </nav>
          <div style={{ borderTop: "1px solid #047857", paddingTop: "1rem" }}>
            <div style={{ fontSize: "0.8rem", color: "#a7f3d0", marginBottom: "0.5rem" }}>Работник: {dbUser.first_name}</div>
            <button className="btn-modern btn-modern-secondary" style={{ width: "100%", padding: "0.5rem" }} onClick={handleLogoutClick}>Выйти</button>
            <button className="btn-modern btn-modern-primary" style={{ width: "100%", padding: "0.5rem", marginTop: "0.5rem", background: "transparent", border: "1px solid #34d399", color: "#34d399" }} onClick={() => { window.location.hash = "#"; }}>← На сайт</button>
          </div>
        </aside>
        <main style={{ flex: 1, padding: "2.5rem 3rem", overflowY: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem", marginBottom: "2.5rem" }}>
            <div className="card-item" style={{ padding: "1.25rem" }}><div style={{ fontSize: "1.75rem", fontWeight: 900 }}>{adminVolunteers.length}</div><div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Ваши волонтеры</div></div>
            <div className="card-item" style={{ padding: "1.25rem" }}><div style={{ fontSize: "1.75rem", fontWeight: 900 }}>{myProjectEvents.length}</div><div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Акций направления</div></div>
            <div className="card-item" style={{ padding: "1.25rem" }}><div style={{ fontSize: "1.75rem", fontWeight: 900 }}>{currentProject.name}</div><div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>направление координации</div></div>
          </div>
          {activeAdminTab === "volunteers" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "2rem" }}>
              <div className="card-item" style={{ padding: "1.5rem" }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "1rem" }}>Записать волонтера</h3>
                <form onSubmit={handleCreateVolunteerSubmit}>
                  <div className="input-group-modern"><label className="label-modern">Никнейм *</label><input type="text" className="input-modern" placeholder="vol_username" value={volForm.username} onChange={e => setVolForm({ ...volForm, username: e.target.value })} required /></div>
                  <div className="input-group-modern"><label className="label-modern">Имя *</label><input type="text" className="input-modern" placeholder="Имя" value={volForm.first_name} onChange={e => setVolForm({ ...volForm, first_name: e.target.value })} required /></div>
                  <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "0.5rem" }}>
                    <div className="input-group-modern"><label className="label-modern">Телефон</label><input type="tel" className="input-modern" placeholder="+7..." value={volForm.phone} onChange={e => setVolForm({ ...volForm, phone: e.target.value })} /></div>
                    <div className="input-group-modern"><label className="label-modern">Возраст</label><input type="number" className="input-modern" placeholder="18" value={volForm.age} onChange={e => setVolForm({ ...volForm, age: e.target.value })} /></div>
                  </div>
                  <div className="input-group-modern"><label className="label-modern">Навыки</label><input type="text" className="input-modern" placeholder="Уборка..." value={volForm.skills} onChange={e => setVolForm({ ...volForm, skills: e.target.value })} /></div>
                  <button type="submit" className="btn-modern btn-modern-primary" style={{ width: "100%", marginTop: "1rem" }}>Записать в пул</button>
                </form>
              </div>
              <div className="card-item" style={{ padding: "0" }}>
                <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--border)", background: "#F8FAFC" }}>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0 }}>Волонтёры проекта {currentProject.name}</h3>
                </div>
                <div className="table-responsive" style={{ border: "none", marginTop: 0 }}>
                  <table className="table-modern">
                    <thead><tr><th style={{ paddingLeft: "1.5rem" }}>Имя / Ник</th><th>Контакты / Возраст</th><th>Навыки</th><th style={{ paddingRight: "1.5rem" }}>Часы</th></tr></thead>
                    <tbody>
                      {adminVolunteers.length === 0 ? (
                        <tr><td colSpan="4" style={{ textAlign: "center", padding: "3rem" }}>Волонтеры еще не добавлены.</td></tr>
                      ) : adminVolunteers.map(vp => (
                        <tr key={vp.id}>
                          <td style={{ paddingLeft: "1.5rem" }}><strong>{vp.user?.first_name}</strong><br/><span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>@{vp.user?.username}</span></td>
                          <td>{vp.user?.phone || "—"} / {vp.user?.age ? `${vp.user.age} лет` : "—"}</td>
                          <td>{vp.skills || "—"}</td>
                          <td style={{ paddingRight: "1.5rem", fontWeight: 700 }}>⏱️ {vp.hours_logged} ч.</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {activeAdminTab === "events" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
              <div className="card-item" style={{ padding: "2rem" }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "1rem" }}>Выберите мероприятие</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {myProjectEvents.length === 0 ? (
                    <div style={{ color: "var(--text-secondary)" }}>Нет акций.</div>
                  ) : myProjectEvents.map(ev => (
                    <div 
                      key={ev.id} 
                      onClick={() => { setSelectedCoordEvent(ev); loadCoordEventDetails(ev.id); }} 
                      style={{ background: selectedCoordEvent?.id === ev.id ? "#ecfdf5" : "#f8fafc", border: selectedCoordEvent?.id === ev.id ? "2px solid #34d399" : "1px solid var(--border)", borderRadius: "8px", padding: "1rem", cursor: "pointer" }}
                    >
                      <strong>{ev.title}</strong>
                      <span style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                        📅 {new Date(ev.event_date).toLocaleDateString()} в {new Date(ev.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card-item" style={{ padding: "2rem" }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "1rem" }}>
                  Регистрации на акцию: {selectedCoordEvent ? selectedCoordEvent.title : "—"}
                </h3>
                {!selectedCoordEvent ? (
                  <div style={{ color: "var(--text-secondary)", textAlign: "center", padding: "3rem" }}>Выберите акцию слева для отметки участников.</div>
                ) : (
                  <div>
                    {coordEventVolunteers.length === 0 ? (
                      <div style={{ color: "var(--text-secondary)" }}>На акцию никто не зарегистрировался.</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {coordEventVolunteers.map(v => (
                          <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
                            <div>
                              <strong>{v.user?.first_name}</strong>
                              <span style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)" }}>@{v.user?.username}</span>
                            </div>
                            {v.status === "completed" ? (
                              <span style={{ fontSize: "0.8rem", background: "#d1fae5", color: "#065f46", padding: "0.25rem 0.6rem", borderRadius: "99px", fontWeight: 800 }}>Присутствовал</span>
                            ) : (
                              <button className="btn-modern btn-modern-accent" onClick={() => handleCompleteVolunteer(v.user_id)} style={{ padding: "0.3rem 0.75rem", fontSize: "0.8rem" }}>
                                Подтвердить
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────
  // ─── RENDERING: PUBLIC PORTAL ROUTE (Normal site views) ───
  // ──────────────────────────────────────────────────────────
  return (
    <div className="portal-container">

      {/* --- Top header --- */}
      <header className="new-landing-header">
        <button type="button" className="new-logo-container" onClick={() => nav("landing")}>
          <div className="brand-mark">Z</div>
          <div className="new-logo-text">
            <strong>{t.logoTitle}</strong>
            <span>{t.logoSub}</span>
          </div>
        </button>
        <nav className="new-main-nav">
          <button className={`new-nav-link ${activeTab === "landing" ? "active" : ""}`} onClick={() => nav("landing")}>{t.navHome}</button>
          <button className={`new-nav-link ${activeTab === "home" ? "active" : ""}`} onClick={() => nav("home")}>{t.tabEvents}</button>
          <button className={`new-nav-link ${activeTab === "calendar" ? "active" : ""}`} onClick={() => nav("calendar")}>{lang === "ru" ? "Календарь" : "Күнтізбе"}</button>
          <button className={`new-nav-link ${activeTab === "services" ? "active" : ""}`} onClick={() => nav("services")}>{t.srvTitle}</button>
          <button className={`new-nav-link ${activeTab === "propose" ? "active" : ""}`} onClick={() => nav("propose")}>{t.tabPropose}</button>
          <button className={`new-nav-link ${activeTab === "volunteer" ? "active" : ""}`} onClick={() => nav("volunteer")}>{t.tabCabinet}</button>
        </nav>
        <div className="new-header-right">
          {dbUser ? (
             <button className="new-btn-green" onClick={() => {
               if (dbUser.role === "super_admin") window.location.hash = "#/admin";
               else if (dbUser.role === "project_admin") window.location.hash = "#/leader";
               else if (dbUser.role === "coordinator") window.location.hash = "#/coordinator";
               else nav("volunteer");
             }}>
                {dbUser.first_name}
             </button>
          ) : (
             <button className="new-btn-green" onClick={() => setIsLoginModalOpen(true)}>{t.navVolunteerNow}</button>
          )}
          <button type="button" className="new-lang-switch" onClick={() => setLang(lang === "ru" ? "kz" : "ru")}>
            <span className={lang === "ru" ? "active" : ""}>RU</span>
            <span className={lang === "kz" ? "active" : ""}>KZ</span>
          </button>
        </div>
      </header>

      {/* --- Emulator Floating Panel --- */}
      <div className="emulator-glass-panel">
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span style={{ fontSize: "1.1rem" }}>{t.admEmulateTitle}</span>
          <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>(Тестирование ролей)</span>
        </div>
        <select 
          className="input-modern" 
          style={{ width: "220px", padding: "0.3rem 0.5rem", fontSize: "0.85rem", margin: "0.3rem 0 0" }}
          value={dbUser ? dbUser.id : 0} 
          onChange={(e) => handleEmulateChange(e.target.value)}
        >
          {EMULATE_ACCOUNTS.map(acc => (
            <option key={acc.id} value={acc.id}>
              {acc.first_name} [{acc.role.toUpperCase()}]
            </option>
          ))}
        </select>
      </div>

      {/* --- VIEW: LANDING --- */}
      {activeTab === "landing" && (
        <div className="landing-page">
          <section className="landing-hero">
            <div className="landing-hero-content">
              <p className="landing-hero-kicker">{t.heroKicker}</p>
              <h1 className="landing-hero-title">{t.heroTitle}</h1>
              <p className="landing-hero-subtitle">{t.heroSubtitle}</p>
              <div className="landing-hero-buttons">
                <button className="new-btn-green" onClick={() => nav("home")}>{t.btnExplore}</button>
                <button className="new-btn-outline" onClick={() => nav("services")}>{t.srvTitle}</button>
              </div>
              <div className="landing-hero-metrics">
                {landingStats.slice(0, 3).map((stat) => (
                  <span key={stat}>{stat}</span>
                ))}
              </div>
            </div>
            <div className="landing-hero-logos">
              <div className="brand-mark-large">Z</div>
            </div>
          </section>

          <section className="landing-focus-section">
            <div className="landing-focus-grid">
              {landingPillars.map((item) => (
                <article className="landing-focus-card" key={item.title}>
                  <h2>{item.title}</h2>
                  <p>{item.desc}</p>
                  <button type="button" onClick={() => nav(item.target)}>
                    {item.action}
                  </button>
                </article>
              ))}
            </div>
          </section>

          {/* Combined News list */}
          <section className="landing-programs-section">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
              <div className="landing-section-heading">
                <span>{lang === "ru" ? "Информационный хаб" : "Ақпараттық хаб"}</span>
                <h2 className="landing-section-title">{lang === "ru" ? "Новости и События Темиртау" : "Теміртау жаңалықтары мен оқиғалары"}</h2>
              </div>
            </div>

            <div className="grid-layout" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.5rem", marginBottom: "3rem" }}>
              {newsList.map(news => {
                const proj = PROJECTS.find(p => p.id === news.project_id);
                return (
                  <div key={news.id} className="card-item" style={{ padding: "1.5rem", borderTop: `4px solid ${proj ? proj.color : "var(--accent)"}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                      <span className="card-category-badge" style={{ background: proj ? proj.color : "var(--accent)", color: "white", margin: 0 }}>
                        {proj ? proj.name : "Temirtau General"}
                      </span>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        {new Date(news.published_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0.5rem 0" }}>{news.title}</h3>
                    <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>{news.body}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="landing-programs-section" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="landing-section-heading">
              <span>{t.navPrograms}</span>
              <h2 className="landing-section-title">{t.progTitle}</h2>
            </div>
            <div className="landing-programs-grid">
              {programCards.map((program) => (
                <article className={`landing-program-card ${program.className}`} key={program.key}>
                  <div className="lpc-icon">{program.index}</div>
                  <div className="lpc-title">{program.title}</div>
                  <div className="lpc-desc">{program.desc}</div>
                  <button className="lpc-link" type="button" onClick={() => { setSelectedCategory(program.key); nav("home"); }}>{t.learnMore}</button>
                </article>
              ))}
            </div>
          </section>

          <section className="landing-cta-section">
            <h2 className="landing-cta-title">{t.ctaTitle}</h2>
            <div className="landing-cta-buttons">
              <button className="new-btn-green" onClick={() => nav("home")}>{t.btnExplore}</button>
              <button className="new-btn-outline" onClick={() => nav("services")}>{t.srvTitle}</button>
            </div>
            <div className="landing-cta-footer">{t.ctaFollow}</div>
          </section>
        </div>
      )}

      {/* --- VIEW: EVENTS (HOME) --- */}
      {activeTab === "home" && !selectedEvent && (
        <div style={{ padding: "0 2rem 4rem" }}>
          <section className={`hero-banner ${activeCat.class}`} style={{ marginBottom: "2rem" }}>
            <h1 className="hero-title">{activeCat.bannerTitle}</h1>
            <p className="hero-subtitle">{activeCat.bannerSubtitle}</p>
          </section>

          <div className="content-area">
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "2rem" }}>
              <span className="label-modern" style={{ textTransform: "uppercase", color: "var(--text-secondary)" }}>{t.filterLabel}</span>
              <div className="tabs-scroll-container">
                {Object.keys(CATEGORY_MAP).map(key => (
                  <button
                    key={key}
                    className={`tab-pill ${selectedCategory === key ? "active" : ""}`}
                    onClick={() => setSelectedCategory(key)}
                  >
                    {CATEGORY_MAP[key].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="map-card-container" style={{ marginBottom: "2.5rem" }}>
              <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", background: "#F8FAFC", fontWeight: 700, fontSize: "0.95rem" }}>
                {t.mapTitle}
              </div>
              <MapWidget readOnly={true} markers={events} />
            </div>

            <div>
              <p className="section-title" style={{ marginBottom: "1.25rem" }}>
                {t.eventsTitle} <span style={{ fontWeight: 600, color: "var(--accent)", fontSize: "1rem", marginLeft: "0.5rem", background: "#EFF6FF", padding: "0.1rem 0.6rem", borderRadius: "99px" }}>{events.length}</span>
              </p>
              {events.length === 0 ? (
                <div className="info-box" style={{ textAlign: "center", padding: "4rem 1rem", border: "1px dashed var(--border)" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🍃</div>
                  <div style={{ fontWeight: 600, color: "var(--text)", fontSize: "1.1rem" }}>{t.noEvents}</div>
                  {t.noEventsDesc}
                </div>
              ) : (
                <div className="grid-layout">
                  {events.map(ev => {
                    const c = catColor(ev.category);
                    return (
                      <div
                        key={ev.id}
                        className={`card-item border-${ev.category}`}
                        onClick={() => setSelectedEvent(ev)}
                        style={{ cursor: "pointer" }}
                      >
                        <div className="card-content">
                          <span className="card-category-badge" style={{ background: c.bg, color: "#FFFFFF" }}>
                            <span style={{ marginRight: "0.4rem" }}>{c.emoji}</span>
                            {c.label}
                          </span>
                          
                          <div className="card-heading" style={{ marginTop: "0.75rem", fontSize: "1.2rem" }}>{ev.title}</div>
                          
                          <div className="card-details-row" style={{ marginTop: "0.5rem", paddingBottom: "0.75rem", borderBottom: "1px solid var(--border)" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)" }}>
                              📅 {new Date(ev.event_date).toLocaleDateString("ru-RU", { month: "short", day: "numeric" })}
                            </span>
                            <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)" }}>
                              📍 {ev.address}
                            </span>
                          </div>
                          
                          <p className="card-description" style={{ marginTop: "0.75rem" }}>{ev.description}</p>
                          
                          <div style={{ display: "flex", justify: "space-between", alignItems: "center", marginTop: "auto", paddingTop: "1rem" }}>
                            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--accent)", background: "#EFF6FF", padding: "0.3rem 0.75rem", borderRadius: "6px" }}>
                              +{ev.points_reward} PTS
                            </span>
                            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)" }}>{t.learnMore}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- VIEW: CALENDAR --- */}
      {activeTab === "calendar" && (
        <div style={{ padding: "0 2rem 4rem", maxWidth: "1000px", margin: "0 auto" }}>
          <div className="landing-section-heading" style={{ margin: "2rem 0" }}>
            <span>{t.logoTitle}</span>
            <h2 className="landing-section-title">{t.calTitle}</h2>
            <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem" }}>{t.calSub}</p>
          </div>

          <div style={{ display: "flex", gap: "1.5rem", margin: "1.5rem 0", flexWrap: "wrap", background: "#f8fafc", padding: "1rem", borderRadius: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem" }}>
              <span style={{ display: "inline-block", width: "16px", height: "16px", borderRadius: "4px", background: "linear-gradient(135deg, #10B981, #059669)" }}></span>
              <strong>{t.calLegendEvent}</strong>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem" }}>
              <span style={{ display: "inline-block", width: "16px", height: "16px", borderRadius: "4px", background: "linear-gradient(135deg, #8B5CF6, #7C3AED)" }}></span>
              <strong>{t.calLegendBooking}</strong>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginLeft: "auto" }}>
              <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>{lang === "ru" ? "Фильтр по дате:" : "Күн бойынша сүзгі:"}</span>
              <input 
                type="date" 
                className="input-modern" 
                style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem" }} 
                value={calendarFilterDate} 
                onChange={(e) => setCalendarFilterDate(e.target.value)}
              />
              {calendarFilterDate && <button style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "0.85rem" }} onClick={() => setCalendarFilterDate("")}>✕</button>}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {calendarItems.filter(item => !calendarFilterDate || item.date === calendarFilterDate).length === 0 ? (
              <div className="info-box" style={{ textAlign: "center", padding: "3rem" }}>
                🍃 {t.calEmpty}
              </div>
            ) : (
              calendarItems.filter(item => !calendarFilterDate || item.date === calendarFilterDate).map(item => {
                const isEv = item.type === "event";
                return (
                  <div 
                    key={`${item.type}-${item.id}`} 
                    className="card-item" 
                    style={{ 
                      display: "grid", 
                      gridTemplateColumns: "150px 1fr 200px", 
                      alignItems: "center", 
                      padding: "1.25rem 1.5rem", 
                      gap: "1.5rem",
                      borderLeft: isEv ? "5px solid #10B981" : "5px solid #8B5CF6"
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: "1.1rem", color: "var(--text)" }}>{item.time_start} - {item.time_end}</strong>
                      <span style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                        {new Date(item.date).toLocaleDateString(lang === "ru" ? "ru-RU" : "kk-KZ", { day: "numeric", month: "long" })}
                      </span>
                    </div>
                    <div>
                      <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>{item.title}</h3>
                      <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", margin: "0.25rem 0 0" }}>{item.description}</p>
                    </div>
                    <div style={{ fontSize: "0.85rem", borderLeft: "1px solid var(--border)", paddingLeft: "1rem" }}>
                      <div>🏠 <strong>{t.calRoomsHeader}:</strong> {item.room_name}</div>
                      <div style={{ marginTop: "0.25rem" }}>🌿 <strong>{t.calProjectHeader}:</strong> {item.project_name}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* --- VIEW: SERVICES --- */}
      {activeTab === "services" && (
        <div style={{ padding: "0 2rem 4rem", maxWidth: "800px", margin: "0 auto" }}>
          <div className="landing-section-heading" style={{ margin: "2rem 0", textAlign: "center" }}>
            <span>{t.logoTitle}</span>
            <h2 className="landing-section-title">{t.srvTitle}</h2>
          </div>

          <div style={{ display: "flex", background: "#f1f5f9", borderRadius: "12px", padding: "0.4rem", marginBottom: "2rem" }}>
            <button 
              className={`new-nav-link`} 
              style={{ flex: 1, padding: "0.75rem", borderRadius: "8px", border: "none", cursor: "pointer", background: activeServiceTab === "booking" ? "white" : "transparent", fontWeight: 700, boxShadow: activeServiceTab === "booking" ? "0 2px 4px rgba(0,0,0,0.05)" : "none" }}
              onClick={() => setActiveServiceTab("booking")}
            >
              🏢 {t.srvRoomBooking}
            </button>
            <button 
              className={`new-nav-link`} 
              style={{ flex: 1, padding: "0.75rem", borderRadius: "8px", border: "none", cursor: "pointer", background: activeServiceTab === "letter" ? "white" : "transparent", fontWeight: 700, boxShadow: activeServiceTab === "letter" ? "0 2px 4px rgba(0,0,0,0.05)" : "none" }}
              onClick={() => setActiveServiceTab("letter")}
            >
              ✉️ {t.srvRequestHelp}
            </button>
          </div>

          {/* Form: Room Booking */}
          {activeServiceTab === "booking" && (
            <div className="card-item" style={{ padding: "2.5rem", borderTop: "4px solid var(--c-general)" }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "1.5rem" }}>{t.srvRoomBooking}</h2>
              <form onSubmit={handleBookingSubmit}>
                
                <div className="input-group-modern">
                  <label className="label-modern">{t.srvSelectRoom}</label>
                  <select 
                    className="input-modern" 
                    value={bookingData.room_id} 
                    onChange={e => setBookingData({ ...bookingData, room_id: e.target.value })}
                  >
                    {rooms.map(room => (
                      <option key={room.id} value={room.id}>{room.name} ({lang === "ru" ? `мест: ${room.capacity}` : `орын: ${room.capacity}`})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                  <div className="input-group-modern">
                    <label className="label-modern">{t.srvSelectDate}</label>
                    <input type="date" className="input-modern" value={bookingData.date} onChange={e => setBookingData({ ...bookingData, date: e.target.value })} required />
                  </div>
                  <div className="input-group-modern">
                    <label className="label-modern">{t.srvTimeStart}</label>
                    <input type="time" className="input-modern" value={bookingData.time_start} onChange={e => setBookingData({ ...bookingData, time_start: e.target.value })} required />
                  </div>
                  <div className="input-group-modern">
                    <label className="label-modern">{t.srvTimeEnd}</label>
                    <input type="time" className="input-modern" value={bookingData.time_end} onChange={e => setBookingData({ ...bookingData, time_end: e.target.value })} required />
                  </div>
                </div>

                {/* Guest Account Info */}
                {!dbUser && (
                  <div style={{ borderTop: "1px solid var(--border)", marginTop: "2rem", paddingTop: "1.5rem" }}>
                    <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem", color: "var(--accent)" }}>
                      📋 {lang === "ru" ? "Контактная информация заявителя" : "Өтініш берушінің байланыс ақпараты"}
                    </h3>
                    <div className="input-group-modern">
                      <label className="label-modern">{t.srvRequesterName}</label>
                      <input type="text" className="input-modern" placeholder="Иван Иванов" value={bookingData.guest_name} onChange={e => setBookingData({ ...bookingData, guest_name: e.target.value })} required />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div className="input-group-modern">
                        <label className="label-modern">{t.srvRequesterPhone}</label>
                        <input type="tel" className="input-modern" placeholder="+7 707 123 4567" value={bookingData.guest_phone} onChange={e => setBookingData({ ...bookingData, guest_phone: e.target.value })} required />
                      </div>
                      <div className="input-group-modern">
                        <label className="label-modern">{t.srvRequesterAge}</label>
                        <input type="number" className="input-modern" placeholder="20" min="14" max="35" value={bookingData.guest_age} onChange={e => setBookingData({ ...bookingData, guest_age: e.target.value })} required />
                      </div>
                    </div>
                  </div>
                )}

                <button type="submit" className="btn-modern btn-modern-primary" style={{ width: "100%", marginTop: "2rem", padding: "1rem" }}>
                  🚀 {t.srvSubmitBooking}
                </button>
              </form>
            </div>
          )}

          {/* Form: Letter Submission */}
          {activeServiceTab === "letter" && (
            <div className="card-item" style={{ padding: "2.5rem", borderTop: "4px solid var(--c-general)" }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "1.5rem" }}>{t.srvRequestHelp}</h2>
              <form onSubmit={handleRequestSubmit}>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="input-group-modern">
                    <label className="label-modern">{t.srvTargetProject}</label>
                    <select 
                      className="input-modern" 
                      value={requestData.target_project_id} 
                      onChange={e => setRequestData({ ...requestData, target_project_id: e.target.value })}
                    >
                      <option value="">Zhastar Ortalygy HQ (Бас кеңсе)</option>
                      {PROJECTS.filter(p => p.id !== 1).map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="input-group-modern">
                    <label className="label-modern">{t.srvRequestType}</label>
                    <select 
                      className="input-modern" 
                      value={requestData.type} 
                      onChange={e => setRequestData({ ...requestData, type: e.target.value })}
                    >
                      <option value="help">🤝 {t.srvTypeHelp}</option>
                      <option value="official_letter">✉️ {t.srvTypeLetter}</option>
                      <option value="event_host">🏫 {t.srvTypeHost}</option>
                      <option value="other">📌 {t.srvTypeOther}</option>
                    </select>
                  </div>
                </div>

                <div className="input-group-modern">
                  <label className="label-modern">{t.srvSubject}</label>
                  <input type="text" className="input-modern" placeholder="Прошу выдать официальное письмо для..." value={requestData.subject} onChange={e => setRequestData({ ...requestData, subject: e.target.value })} required />
                </div>

                <div className="input-group-modern">
                  <label className="label-modern">{t.srvDescription}</label>
                  <textarea className="input-modern" rows="4" placeholder="Опишите детали обращения..." value={requestData.description} onChange={e => setRequestData({ ...requestData, description: e.target.value })} style={{ resize: "vertical" }} required />
                </div>

                {/* Guest Account Info */}
                {!dbUser && (
                  <div style={{ borderTop: "1px solid var(--border)", marginTop: "2rem", paddingTop: "1.5rem" }}>
                    <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem", color: "var(--accent)" }}>
                      📋 {lang === "ru" ? "Контактная информация заявителя" : "Өтініш берушінің байланыс ақпараты"}
                    </h3>
                    <div className="input-group-modern">
                      <label className="label-modern">{t.srvRequesterName}</label>
                      <input type="text" className="input-modern" placeholder="Иван Иванов" value={requestData.guest_name} onChange={e => setRequestData({ ...requestData, guest_name: e.target.value })} required />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div className="input-group-modern">
                        <label className="label-modern">{t.srvRequesterPhone}</label>
                        <input type="tel" className="input-modern" placeholder="+7 707 123 4567" value={requestData.guest_phone} onChange={e => setRequestData({ ...requestData, guest_phone: e.target.value })} required />
                      </div>
                      <div className="input-group-modern">
                        <label className="label-modern">{t.srvRequesterAge}</label>
                        <input type="number" className="input-modern" placeholder="20" min="14" max="35" value={requestData.guest_age} onChange={e => setRequestData({ ...requestData, guest_age: e.target.value })} required />
                      </div>
                    </div>
                  </div>
                )}

                <button type="submit" className="btn-modern btn-modern-primary" style={{ width: "100%", marginTop: "2rem", padding: "1rem" }}>
                  🚀 {t.srvSubmitRequest}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* --- VIEW: VOLUNTEER CABINET (PUBLIC SITE) --- */}
      {activeTab === "volunteer" && (
        <div style={{ padding: "0 2rem 4rem" }}>
          {!dbUser ? (
            <div className="card-item" style={{ padding: "5rem 2rem", textAlign: "center", maxWidth: "500px", margin: "2rem auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}>
              <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", fontSize: "2rem" }}>
                👤
              </div>
              <div>
                <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text)", marginBottom: "0.5rem" }}>{t.cabLoginReq}</h2>
                <p style={{ fontSize: "1rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>{t.cabLoginDesc}</p>
              </div>
              <button className="btn-modern btn-modern-primary" style={{ padding: "0.75rem 2rem", fontSize: "1.05rem" }} onClick={() => setIsLoginModalOpen(true)}>{t.login}</button>
            </div>
          ) : (
            <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: "2rem", borderBottom: "1px solid var(--border)", paddingBottom: "1.5rem" }}>
                <div>
                  <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: 0 }}>{t.cabWelcome}, {dbUser.first_name} ! 👋</h1>
                  <span style={{ fontSize: "1rem", color: "var(--text-secondary)" }}>
                    Роль в системе: <strong>{
                      dbUser.role === "super_admin" ? t.admRoleSuper :
                      dbUser.role === "project_admin" ? `${t.admRoleProj} (${PROJECTS.find(p => p.id === dbUser.project_id)?.name})` :
                      dbUser.role === "coordinator" ? `Координатор (${PROJECTS.find(p => p.id === dbUser.project_id)?.name})` :
                      dbUser.role === "community_user" ? "Гость (Житель)" : "Волонтер"
                    }</strong>
                  </span>
                </div>
                <button className="btn-modern btn-modern-secondary" style={{ padding: "0.5rem 1.5rem" }} onClick={handleLogoutClick}>{t.logout}</button>
              </div>

              {/* Redirect banner for Super Admin on public page */}
              {dbUser.role === "super_admin" && (
                <div className="card-item" style={{ padding: "2rem", border: "2px solid #38bdf8", background: "#f0f9ff", marginBottom: "2rem" }}>
                  <h2 style={{ fontSize: "1.25rem", color: "#0369a1", fontWeight: 800, margin: "0 0 0.5rem" }}>🔒 Кабинет Главного Администратора</h2>
                  <p style={{ fontSize: "0.95rem", color: "#0c4a6e", marginBottom: "1.25rem" }}>
                    Вы авторизованы как Главный Администратор (HQ). Управление проектами и бронированием вынесено в панель HQ.
                  </p>
                  <button className="btn-modern btn-modern-primary" style={{ background: "#38bdf8", color: "#0f172a", border: "none", fontWeight: 800 }} onClick={() => { window.location.hash = "#/admin"; }}>
                    Войти в Панель Управления HQ
                  </button>
                </div>
              )}

              {/* Redirect banner for Project Admin on public page */}
              {dbUser.role === "project_admin" && (
                <div className="card-item" style={{ padding: "2rem", border: "2px solid var(--c-general)", background: "#faf5ff", marginBottom: "2rem" }}>
                  <h2 style={{ fontSize: "1.25rem", color: "#6b21a8", fontWeight: 800, margin: "0 0 0.5rem" }}>🔑 Кабинет Руководителя Проекта</h2>
                  <p style={{ fontSize: "0.95rem", color: "#581c87", marginBottom: "1.25rem" }}>
                    Вы авторизованы как Руководитель проекта ({PROJECTS.find(p => p.id === dbUser.project_id)?.name}). Панель управления лидера перенесена на отдельный URL.
                  </p>
                  <button className="btn-modern btn-modern-primary" style={{ background: "var(--c-general)", border: "none", fontWeight: 800 }} onClick={() => { window.location.hash = "#/leader"; }}>
                    Войти в Панель Лидера
                  </button>
                </div>
              )}

              {/* Redirect banner for Coordinator on public page */}
              {dbUser.role === "coordinator" && (
                <div className="card-item" style={{ padding: "2rem", border: "2px solid #34d399", background: "#f0fdf4", marginBottom: "2rem" }}>
                  <h2 style={{ fontSize: "1.25rem", color: "#047857", fontWeight: 800, margin: "0 0 0.5rem" }}>👷 Кабинет Координатора / Работника</h2>
                  <p style={{ fontSize: "0.95rem", color: "#065f46", marginBottom: "1.25rem" }}>
                    Вы авторизованы как Координатор ({PROJECTS.find(p => p.id === dbUser.project_id)?.name}). Панель отметки волонтеров и управления пулом перенесена на выделенный URL.
                  </p>
                  <button className="btn-modern btn-modern-primary" style={{ background: "#34d399", color: "#022c22", border: "none", fontWeight: 800 }} onClick={() => { window.location.hash = "#/coordinator"; }}>
                    Войти в Кабинет Координатора
                  </button>
                </div>
              )}

              {/* Guest / Community User Cabinet */}
              {dbUser.role === "community_user" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
                  <div className="card-item" style={{ padding: "2rem" }}>
                    <h2 style={{ fontSize: "1.35rem", fontWeight: 800, marginBottom: "1.5rem" }}>🏢 {t.srvRoomBooking} ({myBookings.length})</h2>
                    {myBookings.length === 0 ? (
                      <div className="info-box" style={{ textAlign: "center" }}>Вы еще не бронировали помещения.</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {myBookings.map(bk => (
                          <div key={bk.id} style={{ background: "#F8FAFC", border: "1px solid var(--border)", borderRadius: "8px", padding: "1rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                              <strong>{bk.room?.name}</strong>
                              {getStatusBadge(bk.status)}
                            </div>
                            <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                              📅 {bk.date} ({bk.time_start} - {bk.time_end})
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="card-item" style={{ padding: "2rem" }}>
                    <h2 style={{ fontSize: "1.35rem", fontWeight: 800, marginBottom: "1.5rem" }}>✉️ {t.srvRequestHelp} ({myRequests.length})</h2>
                    {myRequests.length === 0 ? (
                      <div className="info-box" style={{ textAlign: "center" }}>Вы еще не отправляли официальных обращений.</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {myRequests.map(req => (
                          <div key={req.id} style={{ background: "#F8FAFC", border: "1px solid var(--border)", borderRadius: "8px", padding: "1rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                              <strong>{req.subject}</strong>
                              {getStatusBadge(req.status)}
                            </div>
                            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", margin: "0.25rem 0" }}>{req.description}</p>
                            <div style={{ fontSize: "0.8rem", color: "var(--accent)", marginTop: "0.5rem" }}>
                              📍 <strong>Направление:</strong> {req.target_project?.name || "HQ (Zhastar Ortalygy)"}
                            </div>
                            {req.response && (
                              <div style={{ borderTop: "1px solid var(--border)", marginTop: "0.75rem", paddingTop: "0.5rem", fontSize: "0.85rem", color: "#0F766E", background: "#F0FDFA", padding: "0.5rem", borderRadius: "4px" }}>
                                💬 <strong>Ответ штаба:</strong> {req.response}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Standard Volunteer Cabinet */}
              {dbUser.role === "volunteer" && (
                <div className="grid-container">
                  <div className="card-item" style={{ padding: "2.5rem" }}>
                    <div className="volunteer-stats-container">
                      <div className="stat-box-modern">
                        <div className="stat-num">{dbUser.points}</div>
                        <div className="stat-label-text">{t.cabPts}</div>
                      </div>
                      <div className="stat-box-modern">
                        <div className="stat-num" style={{ background: "var(--c-shanyraq)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                          Волонтёр
                        </div>
                        <div className="stat-label-text">{t.cabRole}</div>
                      </div>
                      <div className="stat-box-modern">
                        <div className="stat-num" style={{ background: "var(--c-zan)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                          #{leaderboard.findIndex(u => u.id === dbUser.id) + 1 || "—"}
                        </div>
                        <div className="stat-label-text">{t.cabRank}</div>
                      </div>
                    </div>

                    <hr className="divider" />
                    
                    <div style={{ background: "#F8FAFC", padding: "1.5rem", borderRadius: "12px", border: "1px solid var(--border)" }}>
                      <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "1rem", textTransform: "uppercase", color: "var(--text-secondary)" }}>{t.cabProfile}</h3>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "0.95rem" }}>
                        <div><span style={{ color: "var(--text-secondary)", display: "block", fontSize: "0.8rem" }}>{t.cabName}</span> <strong>{dbUser.first_name}</strong></div>
                        <div><span style={{ color: "var(--text-secondary)", display: "block", fontSize: "0.8rem" }}>{t.cabNick}</span> <strong>@{dbUser.username}</strong></div>
                        {dbUser.phone && <div><span style={{ color: "var(--text-secondary)", display: "block", fontSize: "0.8rem" }}>{t.srvRequesterPhone}</span> <strong>{dbUser.phone}</strong></div>}
                        {dbUser.age && <div><span style={{ color: "var(--text-secondary)", display: "block", fontSize: "0.8rem" }}>Возраст</span> <strong>{dbUser.age}</strong></div>}
                      </div>
                    </div>
                  </div>

                  <div className="card-item" style={{ padding: "0" }}>
                    <div style={{ padding: "2rem", borderBottom: "1px solid var(--border)", background: "#F8FAFC" }}>
                      <h3 style={{ fontSize: "1.35rem", fontWeight: 800, margin: 0 }}>{t.topVols}</h3>
                    </div>
                    <div className="table-responsive" style={{ border: "none", borderRadius: "0 0 16px 16px", boxShadow: "none" }}>
                      <table className="table-modern">
                        <thead>
                          <tr>
                            <th style={{ width: 80, paddingLeft: "2rem" }}>{t.topPlace}</th>
                            <th>{t.topUser}</th>
                            <th style={{ textAlign: "right", paddingRight: "2rem" }}>{t.topPts}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leaderboard.length === 0 ? (
                            <tr><td colSpan="3" style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>{t.loading}</td></tr>
                          ) : leaderboard.map((user, idx) => (
                            <tr key={user.id} style={{ background: user.id === dbUser?.id ? "#EFF6FF" : "transparent" }}>
                              <td style={{ fontWeight: 700, color: "var(--text-secondary)", paddingLeft: "2rem" }}>#{idx + 1}</td>
                              <td style={{ fontWeight: 600 }}>
                                {user.first_name}
                                {user.username && <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginLeft: "0.75rem", fontWeight: 500 }}>@{user.username}</span>}
                              </td>
                              <td style={{ textAlign: "right", fontWeight: 800, color: "var(--accent)", paddingRight: "2rem" }}>{user.points}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- VIEW: EVENT DETAIL --- */}
      {selectedEvent && (
        <div style={{ padding: "0 2rem 4rem" }}>
          <div className="card-item" style={{ padding: "2.5rem", maxWidth: "900px", margin: "0 auto" }}>
            <button className="btn-modern btn-modern-secondary" style={{ marginBottom: "2rem", alignSelf: "flex-start", fontSize: "0.85rem", borderRadius: "99px" }} onClick={() => setSelectedEvent(null)}>
              {t.evBack}
            </button>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
              <span className="card-category-badge" style={{ margin: 0, background: catColor(selectedEvent.category).bg, padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
                <span style={{ marginRight: "0.5rem" }}>{catColor(selectedEvent.category).emoji}</span>
                {CATEGORY_MAP[selectedEvent.category]?.label || t.catAll}
              </span>
              <span style={{ fontSize: "1rem", fontWeight: 800, color: "var(--accent)", background: "#EFF6FF", padding: "0.4rem 1rem", borderRadius: "8px" }}>
                +{selectedEvent.points_reward} PTS
              </span>
            </div>

            <h2 style={{ fontSize: "2rem", fontWeight: 800, margin: "0 0 1.5rem", lineWeight: 1.2 }}>{selectedEvent.title}</h2>

            <div style={{ background: "#F8FAFC", padding: "1.5rem", borderRadius: "12px", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.95rem", fontWeight: 600, color: "var(--text)" }}>
                📅 {new Date(selectedEvent.event_date).toLocaleString(lang === "ru" ? "ru-RU" : "kk-KZ", { dateStyle: "long", timeStyle: "short" })}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.95rem", fontWeight: 600, color: "var(--text)" }}>
                📍 {selectedEvent.address}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.95rem", fontWeight: 600, color: "var(--text)" }}>
                👤 {t.evOrg} {selectedEvent.organizer?.first_name || "Объединённый штаб"}
              </div>
            </div>

            <div style={{ fontSize: "1.05rem", color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "2.5rem", whiteSpace: "pre-wrap" }}>
              {selectedEvent.description}
            </div>

            <div className="map-card-container" style={{ marginBottom: "2.5rem" }}>
              <MapWidget latitude={selectedEvent.latitude} longitude={selectedEvent.longitude} readOnly={true} />
            </div>

            {dbUser ? (
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "2rem" }}>
                {isRegistered ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#ECFDF5", border: "1px solid #A7F3D0", padding: "1.5rem", borderRadius: "12px" }}>
                    <p style={{ color: "#059669", fontWeight: 700, fontSize: "1.05rem", margin: 0, display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      ✓ {t.evRegSuccess}
                    </p>
                    <button className="btn-modern btn-modern-secondary" style={{ color: "var(--text-secondary)" }} onClick={handleCancelRegistration}>{t.evCancel}</button>
                  </div>
                ) : (
                  <button className="btn-modern btn-modern-primary" style={{ width: "100%", padding: "1rem", fontSize: "1.1rem" }} onClick={handleRegister}>
                    {t.evRegBtn}{selectedEvent.points_reward} PTS
                  </button>
                )}
              </div>
            ) : (
              <div className="info-box" style={{ textAlign: "center", fontSize: "1.05rem" }}>
                {t.evNeedLogin1} <strong style={{ cursor: "pointer", color: "var(--accent)" }} onClick={() => setIsLoginModalOpen(true)}>{t.evNeedLogin2}</strong>.
              </div>
            )}
          </div>

          {dbUser && isRegistered && (
            <div style={{ maxWidth: "900px", margin: "2rem auto 0" }}>
              <ChatWindow eventId={selectedEvent.id} eventTitle={selectedEvent.title} />
            </div>
          )}

          {dbUser && (selectedEvent.organizer_id === dbUser.id || (dbUser.role === "coordinator" && selectedEvent.project_id === dbUser.project_id)) && (
            <div className="card-item" style={{ padding: "2.5rem", borderTop: "4px solid #F59E0B", background: "#FFFBEB", maxWidth: "900px", margin: "2rem auto 0" }}>
              <h3 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#D97706", marginBottom: "0.5rem" }}>
                {t.orgPanel} ({volunteers.length})
              </h3>
              <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", marginBottom: "2rem" }}>
                Отметьте присутствие участников для начисления волонтерских баллов.
              </p>
              {volunteers.length === 0 ? (
                <div style={{ padding: "2rem", background: "rgba(255,255,255,0.5)", borderRadius: "8px", textAlign: "center", color: "var(--text-secondary)" }}>
                  {t.orgNoVols}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {volunteers.map(v => (
                    <div key={v.id} style={{ background: "#FFFFFF", borderRadius: "8px", padding: "1rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <strong style={{ color: "var(--text)" }}>{v.user?.first_name}</strong>
                        <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>@{v.user?.username}</span>
                      </div>
                      {v.status === "completed" ? (
                        <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#059669", background: "#D1FAE5", padding: "0.4rem 0.8rem", borderRadius: "99px" }}>{t.orgDone}</span>
                      ) : (
                        <button className="btn-modern btn-modern-accent" onClick={() => handleCompleteVolunteer(v.user_id)}>
                          {t.orgConfirm}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- VIEW: PROPOSE --- */}
      {activeTab === "propose" && (
        <div style={{ padding: "0 2rem 4rem" }}>
          <div className="card-item" style={{ padding: "2.5rem", maxWidth: "700px", margin: "2rem auto", borderTop: "4px solid var(--accent)" }}>
            <h2 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.5rem" }}>{t.propTitle}</h2>
            <p style={{ fontSize: "1rem", color: "var(--text-secondary)", marginBottom: "2.5rem" }}>{t.propDesc}</p>
            
            <form onSubmit={handleProposalSubmit}>
              <div className="input-group-modern">
                <label className="label-modern">{t.propCat}</label>
                <select className="input-modern" value={proposalData.category} onChange={e => {
                  const val = e.target.value;
                  let projId = "3";
                  if (val === "shanyraq") projId = "2";
                  if (val === "taza_qazaqstan") projId = "4";
                  if (val === "zan_men_tartip") projId = "5";
                  setProposalData({ ...proposalData, category: val, project_id: projId });
                }}>
                  <option value="jasyl_el">🌲 {t.catJasyl}</option>
                  <option value="taza_qazaqstan">🧹 {t.catTaza}</option>
                  <option value="shanyraq">🤝 {t.catShanyraq}</option>
                  <option value="zan_men_tartip">🛡️ {t.catZan}</option>
                </select>
              </div>

              <div className="input-group-modern">
                <label className="label-modern">{t.propName}</label>
                <input type="text" className="input-modern" value={proposalData.title} onChange={e => setProposalData({ ...proposalData, title: e.target.value })} required />
              </div>

              <div className="input-group-modern">
                <label className="label-modern">{t.propDetails}</label>
                <textarea className="input-modern" rows="4" value={proposalData.description} onChange={e => setProposalData({ ...proposalData, description: e.target.value })} style={{ resize: "vertical" }} required />
              </div>

              <div className="input-group-modern">
                <label className="label-modern">{t.propAddress}</label>
                <input type="text" className="input-modern" value={proposalData.address} onChange={e => setProposalData({ ...proposalData, address: e.target.value })} required />
              </div>

              <div className="input-group-modern">
                <label className="label-modern">{t.propMap}</label>
                <div className="map-card-container">
                  <MapWidget latitude={proposalData.latitude} longitude={proposalData.longitude} onCoordinateSelect={(lat, lng) => setProposalData({ ...proposalData, latitude: lat, longitude: lng })} />
                </div>
              </div>

              <div className="input-group-modern">
                <label className="label-modern">{t.propDate}</label>
                <input type="datetime-local" className="input-modern" value={proposalData.event_date} onChange={e => setProposalData({ ...proposalData, event_date: e.target.value })} required />
              </div>

              {!isLoggedIn() && (
                <>
                  <div className="input-group-modern">
                    <label className="label-modern">{t.srvRequesterName}</label>
                    <input type="text" className="input-modern" placeholder="Имя" value={proposalData.guest_name} onChange={e => setProposalData({ ...proposalData, guest_name: e.target.value })} required />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "0.5rem" }}>
                    <div className="input-group-modern">
                      <label className="label-modern">{t.srvRequesterPhone}</label>
                      <input type="tel" className="input-modern" placeholder="+7..." value={proposalData.guest_phone} onChange={e => setProposalData({ ...proposalData, guest_phone: e.target.value })} required />
                    </div>
                    <div className="input-group-modern">
                      <label className="label-modern">{t.srvRequesterAge}</label>
                      <input type="number" className="input-modern" placeholder="18" value={proposalData.guest_age} onChange={e => setProposalData({ ...proposalData, guest_age: e.target.value })} />
                    </div>
                  </div>
                </>
              )}

              <button type="submit" className="btn-modern btn-modern-primary" style={{ width: "100%", marginTop: "1.5rem", padding: "1rem", fontSize: "1.05rem" }}>
                {t.propSubmit}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: LOGIN --- */}
      {isLoginModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsLoginModalOpen(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsLoginModalOpen(false)} style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "#F1F5F9", border: "none", width: "32px", height: "32px", borderRadius: "50%", cursor: "pointer" }}>✕</button>

            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem", color: "var(--text)" }}>{t.modLogin}</h2>
            <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", marginBottom: "2rem" }}>
              {lang === "ru" ? "Войдите по никнейму, назначенному администратором." : "Әкімші тағайындаған лақап ат арқылы кіріңіз."}
            </p>

            <form onSubmit={handleLoginSubmit}>
              <div className="input-group-modern">
                <label className="label-modern">{t.modNick}</label>
                <input type="text" className="input-modern" placeholder="aibek_volunteer" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} required />
              </div>
              <button type="submit" className="btn-modern btn-modern-primary" style={{ width: "100%", marginTop: "1rem", padding: "0.85rem", fontSize: "1.05rem" }}>
                {t.modSubmitLogin}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- Mobile bottom nav --- */}
      <nav className="portal-footer-nav">
        <button className={`footer-nav-btn ${activeTab === "landing" ? "active" : ""}`} onClick={() => nav("landing")}>
          🏠 {t.navHome}
        </button>
        <button className={`footer-nav-btn ${activeTab === "home" ? "active" : ""}`} onClick={() => nav("home")}>
          🌲 {t.tabEvents}
        </button>
        <button className={`footer-nav-btn ${activeTab === "calendar" ? "active" : ""}`} onClick={() => nav("calendar")}>
          📅 {lang === "ru" ? "Календарь" : "Күнтізбе"}
        </button>
        <button className={`footer-nav-btn ${activeTab === "services" ? "active" : ""}`} onClick={() => nav("services")}>
          💼 {t.srvTitle}
        </button>
        <button className={`footer-nav-btn ${activeTab === "volunteer" ? "active" : ""}`} onClick={() => nav("volunteer")}>
          👤 {t.tabCabinet}
        </button>
      </nav>
    </div>
  );
}
