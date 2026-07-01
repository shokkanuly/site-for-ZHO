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

  // Category config - Colorful Light Mode Variants
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

  const [activeTab, setActiveTab] = useState("landing");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [dbUser, setDbUser] = useState(getLoggedInUser());
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Login form
  const [loginUsername, setLoginUsername] = useState("");
  const [loginFirstName, setLoginFirstName] = useState("");
  const [isNewAccount, setIsNewAccount] = useState(false);

  // Proposal form
  const [proposalData, setProposalData] = useState({
    title: "", description: "", address: "",
    category: "jasyl_el", latitude: 50.0633, longitude: 72.9644,
    event_date: "", points_reward: 15,
  });

  useEffect(() => { loadEvents(); if (dbUser) refreshUserProfile(); }, [selectedCategory]);
  useEffect(() => { if (activeTab === "volunteer") loadLeaderboard(); }, [activeTab]);
  useEffect(() => { if (selectedEvent) loadEventDetails(selectedEvent.id); }, [selectedEvent]);

  const refreshUserProfile = async () => {
    if (!isLoggedIn()) return;
    try {
      const res = await fetch("http://localhost:8000/api/auth/me", { headers: getAuthHeader() });
      if (res.ok) { const d = await res.json(); setDbUser(d); setLoggedInUser(d); }
    } catch {}
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginUsername.trim()) return alert("Введите имя пользователя");
    if (isNewAccount && !loginFirstName.trim()) return alert("Введите ваше имя");
    try {
      const res = await fetch("http://localhost:8000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername.trim(), first_name: isNewAccount ? loginFirstName.trim() : "Волонтер" }),
      });
      if (res.ok) {
        const d = await res.json();
        setDbUser(d); setLoggedInUser(d);
        setIsLoginModalOpen(false); setLoginUsername(""); setLoginFirstName("");
        setActiveTab("volunteer");
      } else {
        const err = await res.json();
        alert(`Ошибка: ${err.detail || "неверный никнейм"}`);
      }
    } catch { alert("Не удалось подключиться к серверу."); }
  };

  const handleLogoutClick = () => {
    if (window.confirm("Выйти из кабинета волонтёра?")) { setDbUser(null); logout(); }
  };

  const loadEvents = async () => {
    try {
      const q = selectedCategory !== "all" ? `&category=${selectedCategory}` : "";
      const res = await fetch(`http://localhost:8000/api/events?status_filter=active${q}`);
      if (res.ok) setEvents(await res.json());
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
    const res = await fetch(`http://localhost:8000/api/events/${selectedEvent.id}/complete/${volUserId}`, { method: "POST", headers: getAuthHeader() });
    if (res.ok) { alert("Присутствие подтверждено!"); loadEventDetails(selectedEvent.id); }
    else { const e = await res.json(); alert(e.detail); }
  };

  const handleProposalSubmit = async (e) => {
    e.preventDefault();
    if (!proposalData.title || !proposalData.description || !proposalData.address || !proposalData.event_date)
      return alert("Заполните все обязательные поля.");
    if (!isLoggedIn()) { setIsLoginModalOpen(true); return; }
    try {
      const res = await fetch("http://localhost:8000/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({
          ...proposalData,
          latitude: parseFloat(proposalData.latitude),
          longitude: parseFloat(proposalData.longitude),
          event_date: new Date(proposalData.event_date).toISOString(),
          points_reward: parseInt(proposalData.points_reward, 10),
        }),
      });
      if (res.ok) {
        alert("Акция опубликована на портале ZHASTAR!");
        setProposalData({ title: "", description: "", address: "", category: "jasyl_el", latitude: 50.0633, longitude: 72.9644, event_date: "", points_reward: 15 });
        setActiveTab("home"); loadEvents();
      } else { const e = await res.json(); alert(e.detail); }
    } catch { alert("Ошибка соединения."); }
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
    { title: t.focusVibeTitle, desc: t.focusVibeDesc, action: t.navGetInvolved, target: "propose" },
  ];

  function nav(tab) { setActiveTab(tab); setSelectedEvent(null); }

  /* ── Render ── */
  return (
    <div className="portal-container">

      {/* ── Top header ── */}
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
          <button className={`new-nav-link ${activeTab === "home" ? "active" : ""}`} onClick={() => nav("home")}>{t.navPrograms}</button>
          <button className={`new-nav-link ${activeTab === "propose" ? "active" : ""}`} onClick={() => nav("propose")}>{t.navGetInvolved}</button>
          <button className={`new-nav-link ${activeTab === "volunteer" ? "active" : ""}`} onClick={() => nav("volunteer")}>{t.tabCabinet}</button>
        </nav>
        <div className="new-header-right">
          {dbUser ? (
             <button className="new-btn-green" onClick={() => nav("volunteer")}>
                {dbUser.first_name}
             </button>
          ) : (
             <button className="new-btn-green" onClick={() => setIsLoginModalOpen(true)}>{t.navVolunteerNow}</button>
          )}
          <button type="button" className="new-lang-switch" onClick={() => setLang(lang === "ru" ? "kz" : "ru")} aria-label="Switch language">
            <span className={lang === "ru" ? "active" : ""}>RU</span>
            <span className={lang === "kz" ? "active" : ""}>KZ</span>
          </button>
        </div>
      </header>

      {/* ── LANDING PAGE VIEW ── */}
      {activeTab === "landing" && (
        <div className="landing-page">
          <section className="landing-hero">
            <div className="landing-hero-content">
              <p className="landing-hero-kicker">{t.heroKicker}</p>
              <h1 className="landing-hero-title">{t.heroTitle}</h1>
              <p className="landing-hero-subtitle">
                {t.heroSubtitle}
              </p>
              <div className="landing-hero-buttons">
                <button className="new-btn-green" onClick={() => nav("home")}>{t.btnExplore}</button>
                <button className="new-btn-outline" onClick={() => setIsLoginModalOpen(true)}>{t.btnBecomeVol}</button>
              </div>
              <div className="landing-hero-metrics">
                {landingStats.slice(0, 3).map((stat) => (
                  <span key={stat}>{stat}</span>
                ))}
              </div>
            </div>
            <div className="landing-hero-logos" aria-label="Zhastar programs">
              <img src="/logo1.png" alt="Logo Jastar" className="hero-logo-img" />
              <img src="/logo2.png" alt="Logo Shanyraq" className="hero-logo-img" />
              <img src="/logo3.png" alt="Logo Jasyl El" className="hero-logo-img" />
            </div>
          </section>

          <section className="landing-focus-section">
            <div className="landing-focus-grid">
              {landingPillars.map((item) => (
                <article className="landing-focus-card" key={item.title}>
                  <h2>{item.title}</h2>
                  <p>{item.desc}</p>
                  <button type="button" onClick={() => item.target === "volunteer" ? setIsLoginModalOpen(true) : nav(item.target)}>
                    {item.action}
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="landing-programs-section">
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
            
            <div className="landing-stats-banner">
              {landingStats.map((stat) => (
                <div className="landing-stat-item" key={stat}>{stat}</div>
              ))}
            </div>
          </section>

          <section className="landing-vibe-section">
            <div className="landing-vibe-image" aria-hidden="true" />
            <div className="landing-vibe-copy">
              <span>{t.vibeEyebrow}</span>
              <h2>{t.vibeTitle}</h2>
              <p>{t.vibeDesc}</p>
              <blockquote>{t.vibeQuote}</blockquote>
            </div>
          </section>

          <section className="landing-cta-section">
            <h2 className="landing-cta-title">{t.ctaTitle}</h2>
            <div className="landing-cta-buttons">
              <button className="new-btn-green" onClick={() => nav("home")}>{t.btnExplore}</button>
              <button className="new-btn-outline" onClick={() => setIsLoginModalOpen(true)}>{t.btnBecomeVol}</button>
            </div>
            <div className="landing-cta-footer">{t.ctaFollow}</div>
          </section>
        </div>
      )}

      {/* ── Hero strip (home, no event selected) ── */}
      {activeTab === "home" && !selectedEvent && (
        <section className={`hero-banner ${activeCat.class}`}>
          <h1 className="hero-title">{activeCat.bannerTitle}</h1>
          <p className="hero-subtitle">{activeCat.bannerSubtitle}</p>
        </section>
      )}

      {/* ── Main ── */}
      <main className="content-area">

        {/* VIEW: HOME — catalogue */}
        {activeTab === "home" && !selectedEvent && (
          <>
            {/* Category filter */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span className="label-modern" style={{ textTransform: "uppercase", letterSpacing: 0, color: "var(--text-secondary)" }}>{t.filterLabel}</span>
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

            {/* Map */}
            <div>
              <div className="map-card-container">
                <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", background: "#F8FAFC", fontWeight: 700, fontSize: "0.95rem" }}>
                  {t.mapTitle}
                </div>
                <MapWidget readOnly={true} markers={events} />
              </div>
            </div>

            {/* Events list */}
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
                        className={`card-item border-${ev.category === "taza_qazaqstan" ? "taza" : ev.category === "zan_men_tartip" ? "zan" : ev.category}`}
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
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                              {new Date(ev.event_date).toLocaleDateString("ru-RU", { month: "short", day: "numeric" })}
                            </span>
                            <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)" }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                              {ev.address}
                            </span>
                          </div>
                          
                          <p className="card-description" style={{ marginTop: "0.75rem" }}>{ev.description}</p>
                          
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: "1rem" }}>
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
          </>
        )}

        {/* VIEW: PROPOSE */}
        {activeTab === "propose" && (
          <div className="card-item" style={{ padding: "2.5rem", maxWidth: "700px", margin: "0 auto", borderTop: "4px solid var(--accent)" }}>
            <h2 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.5rem", letterSpacing: 0 }}>{t.propTitle}</h2>
            <p style={{ fontSize: "1rem", color: "var(--text-secondary)", marginBottom: "2.5rem" }}>
              {t.propDesc}
            </p>
            <form onSubmit={handleProposalSubmit}>
              <div className="input-group-modern">
                <label className="label-modern">{t.propCat}</label>
                <select className="input-modern" value={proposalData.category} onChange={e => setProposalData({ ...proposalData, category: e.target.value })}>
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
              <button type="submit" className="btn-modern btn-modern-primary" style={{ width: "100%", marginTop: "1rem", padding: "1rem", fontSize: "1.05rem" }}>
                {t.propSubmit}
              </button>
            </form>
          </div>
        )}

        {/* VIEW: VOLUNTEER CABINET */}
        {activeTab === "volunteer" && (
          <div className="grid-container">
            {!dbUser ? (
              <div className="card-item" style={{ padding: "5rem 2rem", textAlign: "center", maxWidth: "500px", margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}>
                <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
                <div>
                  <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text)", marginBottom: "0.5rem" }}>{t.cabLoginReq}</h2>
                  <p style={{ fontSize: "1rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    {t.cabLoginDesc}
                  </p>
                </div>
                <button className="btn-modern btn-modern-primary" style={{ padding: "0.75rem 2rem", fontSize: "1.05rem" }} onClick={() => setIsLoginModalOpen(true)}>{t.login}</button>
              </div>
            ) : (
              <>
                <div className="card-item" style={{ padding: "2.5rem" }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: "2rem" }}>
                    <h2 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>{t.cabWelcome}, {dbUser.first_name}! 👋</h2>
                    <button className="btn-modern btn-modern-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }} onClick={handleLogoutClick}>{t.logout}</button>
                  </div>
                  
                  <div className="volunteer-stats-container">
                    <div className="stat-box-modern">
                      <div className="stat-num">{dbUser.points}</div>
                      <div className="stat-label-text">{t.cabPts}</div>
                    </div>
                    <div className="stat-box-modern">
                      <div className="stat-num" style={{ background: "var(--c-shanyraq)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        {dbUser.role === "organizer" ? "Организатор" : "Волонтёр"}
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
                    <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "1rem", textTransform: "uppercase", letterSpacing: 0, color: "var(--text-secondary)" }}>{t.cabProfile}</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "0.95rem" }}>
                      <div><span style={{ color: "var(--text-secondary)", display: "block", fontSize: "0.8rem", marginBottom: "0.2rem" }}>{t.cabName}</span> <strong>{dbUser.first_name}</strong></div>
                      <div><span style={{ color: "var(--text-secondary)", display: "block", fontSize: "0.8rem", marginBottom: "0.2rem" }}>{t.cabNick}</span> <strong>@{dbUser.username}</strong></div>
                      <div style={{ gridColumn: "span 2" }}><span style={{ color: "var(--text-secondary)", display: "block", fontSize: "0.8rem", marginBottom: "0.2rem" }}>{t.cabId}</span> <code style={{ background: "#E2E8F0", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.85rem" }}>{dbUser.id}</code></div>
                    </div>
                  </div>
                </div>

                {/* Leaderboard inside cabinet */}
                <div className="card-item" style={{ padding: "0" }}>
                  <div style={{ padding: "2rem", borderBottom: "1px solid var(--border)", background: "#F8FAFC" }}>
                    <h3 style={{ fontSize: "1.35rem", fontWeight: 800, marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {t.topVols}
                    </h3>
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
                          <tr><td colSpan="3" style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)", fontWeight: 500 }}>{t.loading}</td></tr>
                        ) : leaderboard.map((user, idx) => (
                          <tr key={user.id} style={{ background: user.id === dbUser?.id ? "#EFF6FF" : "transparent" }}>
                            <td style={{ fontWeight: 700, color: "var(--text-secondary)", paddingLeft: "2rem" }}>#{idx + 1}</td>
                            <td style={{ fontWeight: 600 }}>
                              {user.first_name}
                              {user.username && <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginLeft: "0.75rem", fontWeight: 500 }}>@{user.username}</span>}
                              {user.role === "organizer" && <span style={{ marginLeft: "0.75rem", fontSize: "0.7rem", background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)", color: "white", borderRadius: 4, padding: "0.15rem 0.4rem", fontWeight: 800 }}>ОРГ</span>}
                            </td>
                            <td style={{ textAlign: "right", fontWeight: 800, color: "var(--accent)", paddingRight: "2rem" }}>{user.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* VIEW: EVENT DETAIL */}
        {selectedEvent && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div className="card-item" style={{ padding: "2.5rem" }}>
              <button className="btn-modern btn-modern-secondary" style={{ marginBottom: "2rem", alignSelf: "flex-start", fontSize: "0.85rem", borderRadius: "99px" }} onClick={() => setSelectedEvent(null)}>
                {t.evBack}
              </button>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
                <span className="card-category-badge" style={{ margin: 0, background: catColor(selectedEvent.category).bg, padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
                  <span style={{ marginRight: "0.5rem" }}>{catColor(selectedEvent.category).emoji}</span>
                  {CATEGORY_MAP[selectedEvent.category]?.label || t.catAll}
                </span>
                <span style={{ fontSize: "1rem", fontWeight: 800, color: "var(--accent)", background: "#EFF6FF", padding: "0.4rem 1rem", borderRadius: "8px", boxShadow: "0 2px 4px rgba(59, 130, 246, 0.1)" }}>
                  +{selectedEvent.points_reward} PTS
                </span>
              </div>

              <h2 style={{ fontSize: "2rem", fontWeight: 800, margin: "0 0 1.5rem", letterSpacing: 0, lineHeight: 1.2 }}>{selectedEvent.title}</h2>

              <div style={{ background: "#F8FAFC", padding: "1.5rem", borderRadius: "12px", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.95rem", fontWeight: 600, color: "var(--text)" }}>
                  <div style={{ background: "#FFFFFF", padding: "0.5rem", borderRadius: "8px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> 
                  </div>
                  {new Date(selectedEvent.event_date).toLocaleString(lang === "ru" ? "ru-RU" : "kk-KZ", { dateStyle: "long", timeStyle: "short" })}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.95rem", fontWeight: 600, color: "var(--text)" }}>
                  <div style={{ background: "#FFFFFF", padding: "0.5rem", borderRadius: "8px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> 
                  </div>
                  {selectedEvent.address}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.95rem", fontWeight: 600, color: "var(--text)" }}>
                  <div style={{ background: "#FFFFFF", padding: "0.5rem", borderRadius: "8px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> 
                  </div>
                  {t.evOrg} {selectedEvent.organizer?.first_name || "Объединённый штаб"}
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
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#ECFDF5", border: "1px solid #A7F3D0", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 4px 6px rgba(16, 185, 129, 0.1)" }}>
                      <p style={{ color: "#059669", fontWeight: 700, fontSize: "1.05rem", margin: 0, display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        {t.evRegSuccess}
                      </p>
                      <button className="btn-modern btn-modern-secondary" style={{ color: "var(--text-secondary)" }} onClick={handleCancelRegistration}>{t.evCancel}</button>
                    </div>
                  ) : (
                    <button className="btn-modern btn-modern-primary" style={{ width: "100%", padding: "1rem", fontSize: "1.1rem", borderRadius: "12px" }} onClick={handleRegister}>
                      {t.evRegBtn}{selectedEvent.points_reward} PTS
                    </button>
                  )}
                </div>
              ) : (
                <div className="info-box" style={{ textAlign: "center", fontSize: "1.05rem" }}>
                  {t.evNeedLogin1} <strong>{t.evNeedLogin2}</strong>.
                </div>
              )}
            </div>

            {/* Coordination chat */}
            {dbUser && isRegistered && (
              <ChatWindow eventId={selectedEvent.id} eventTitle={selectedEvent.title} />
            )}

            {/* Organizer panel */}
            {dbUser && selectedEvent.organizer_id === dbUser.id && (
              <div className="card-item" style={{ padding: "2.5rem", borderTop: "4px solid #F59E0B", background: "#FFFBEB" }}>
                <h3 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#D97706", marginBottom: "0.5rem" }}>
                  {t.orgPanel} ({volunteers.length})
                </h3>
                <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", marginBottom: "2rem" }}>
                  {t.orgPanelDesc}
                </p>
                {volunteers.length === 0 ? (
                  <div style={{ padding: "2rem", background: "rgba(255,255,255,0.5)", borderRadius: "8px", textAlign: "center", color: "var(--text-secondary)", fontWeight: 500 }}>
                    {t.orgNoVols}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {volunteers.map(v => (
                      <div key={v.id} style={{ background: "#FFFFFF", borderRadius: "8px", padding: "1rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.95rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                          <strong style={{ color: "var(--text)", fontSize: "1.05rem" }}>{v.user?.first_name}</strong>
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
      </main>

      {/* ── Login modal ── */}
      {isLoginModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsLoginModalOpen(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsLoginModalOpen(false)} style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "#F1F5F9", border: "none", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", cursor: "pointer", color: "var(--text-secondary)" }}>✕</button>

            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem", color: "var(--text)" }}>{t.modLogin}</h2>
            <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", marginBottom: "2rem" }}>
              {isNewAccount ? t.modRegDesc : t.modLoginDesc}
            </p>

            <form onSubmit={handleLoginSubmit}>
              <div className="input-group-modern">
                <label className="label-modern">{t.modNick}</label>
                <input type="text" className="input-modern" placeholder="aibek_volunteer" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} required />
              </div>
              {isNewAccount && (
                <div className="input-group-modern">
                  <label className="label-modern">{t.modName}</label>
                  <input type="text" className="input-modern" placeholder="Айбек" value={loginFirstName} onChange={e => setLoginFirstName(e.target.value)} required />
                </div>
              )}
              <button type="submit" className="btn-modern btn-modern-primary" style={{ width: "100%", marginTop: "1rem", padding: "0.85rem", fontSize: "1.05rem" }}>
                {isNewAccount ? t.modSubmitReg : t.modSubmitLogin}
              </button>
              <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
                <button type="button" style={{ background: "none", border: "none", fontSize: "0.9rem", fontWeight: 600, color: "var(--text-secondary)", cursor: "pointer", transition: "color 0.2s" }} onClick={() => { setIsNewAccount(!isNewAccount); setLoginUsername(""); setLoginFirstName(""); }}>
                  {isNewAccount ? t.modSwitchLog : t.modSwitchReg}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Mobile bottom nav ── */}
      <nav className="portal-footer-nav">
        <button className={`footer-nav-btn ${activeTab === "landing" ? "active" : ""}`} onClick={() => nav("landing")}>
          <svg className="footer-nav-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12L12 4l8 8"></path><path d="M6 10v10h12V10"></path></svg>
          {t.navHome}
        </button>
        <button className={`footer-nav-btn ${activeTab === "home" ? "active" : ""}`} onClick={() => nav("home")}>
          <svg className="footer-nav-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          {t.tabEvents}
        </button>
        <button className={`footer-nav-btn ${activeTab === "propose" ? "active" : ""}`} onClick={() => nav("propose")}>
          <svg className="footer-nav-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          {t.tabPropose}
        </button>
        <button className={`footer-nav-btn ${activeTab === "volunteer" ? "active" : ""}`} onClick={() => nav("volunteer")}>
          <svg className="footer-nav-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          {t.tabCabinet}
        </button>
      </nav>
    </div>
  );
}
