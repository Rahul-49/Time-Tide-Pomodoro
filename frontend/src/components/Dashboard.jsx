import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Timer from './Timer';
import Analytics from './Analytics';
import WeeklyProgress from './WeeklyProgress';
import { logout, getSessions, getLeaderboard } from '../services/api';
import Weather from './Weather';
import ChatAssistant from './ChatAssistant';
import StreakBadge from './StreakBadge';

function Dashboard({ user, setUser, theme, toggleTheme }) {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeTab') || 'dashboard');
  const [sessions, setSessions] = useState([]);
  const [leaderboard, setLeaderboard] = useState({ leaderboard: [], me: null });
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const accountRef = useRef(null);
  const analyticsSectionRef = useRef(null);
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  // Persist active tab to avoid resets on theme toggle
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  // Close account dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setShowAccountMenu(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const loadSessions = async () => {
    try {
      const data = await getSessions();
      // Backend returns an array of sessions
      setSessions(Array.isArray(data) ? data : []);
      // Also refresh leaderboard once sessions are available
      try {
        const lb = await getLeaderboard();
        setLeaderboard(lb);
      } catch (e) {
        // Fallback to a minimal leaderboard with the current user only
        const selfName = user?.firstName || user?.username || (user?.email ? user.email.split('@')[0] : 'You');
        // Use computed XP from sessions once we have it; temporary 0 here, replaced after compute below
        setLeaderboard({ leaderboard: [{ name: selfName, xp: 0 }], me: { rank: 1, xp: 0 } });
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  // Weather now handled by <Weather />

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // duration is in minutes; format to HH:MM
  const formatMinutes = (minutesTotal) => {
    const hours = Math.floor((minutesTotal || 0) / 60);
    const minutes = (minutesTotal || 0) % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const todaySessions = sessions.filter(session => {
    const today = new Date().toDateString();
    const sessionDate = new Date(session.startTime).toDateString();
    return sessionDate === today;
  });

  const todayTotalTime = todaySessions.reduce((total, session) => {
    return total + (session.duration || 0);
  }, 0);

  const displayName = user?.firstName || user?.username || (user?.email ? user.email.split('@')[0] : 'Account');

  // Compute daily streak (consecutive days with >=1 session)
  const streak = useMemo(() => {
    try {
      if (!Array.isArray(sessions) || sessions.length === 0) return 0;
      const daySet = new Set();
      sessions.forEach(s => {
        const t = s.startTime ? new Date(s.startTime) : null;
        if (!t || isNaN(t)) return;
        const d = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()));
        daySet.add(d.toISOString().slice(0,10));
      });
      let count = 0;
      let cur = new Date();
      const keyOf = (dt) => {
        const du = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
        return du.toISOString().slice(0,10);
      };
      // Count back consecutive days from today
      while (true) {
        if (daySet.has(keyOf(cur))) {
          count += 1;
          cur = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth(), cur.getUTCDate() - 1));
        } else {
          break;
        }
      }
      return count;
    } catch { return 0; }
  }, [sessions]);

  // XP/Level helpers (match backend progressive curve)
  const XP_PER_POMODORO = 25;
  const STEP = 100; // base step must match backend
  const totalForLevel = (L) => STEP * ((L - 1) * L) / 2; // triangular progression
  const levelFromPoints = (points) => {
    const p = Math.max(0, points || 0);
    const L = Math.floor((Math.sqrt(1 + 8 * (p / STEP)) - 1) / 2) + 1;
    const currLevel = Math.max(1, L);
    const currBase = totalForLevel(currLevel);
    const nextBase = totalForLevel(currLevel + 1);
    const span = Math.max(1, nextBase - currBase);
    const progress = Math.max(0, Math.min(1, (p - currBase) / span));
    return { level: currLevel, progress };
  };
  const completed = sessions.filter((s) => s.completed || typeof s.duration === 'number');
  const totalMinutesAll = completed.reduce((sum, s) => sum + (s.duration || 0), 0);
  const pomodoros = Math.floor(totalMinutesAll / 25);
  const computedXp = pomodoros * XP_PER_POMODORO;
  // Prefer server points when available
  const points = (leaderboard?.me?.xp ?? user?.points ?? computedXp);
  const lvl = levelFromPoints(points);

  const goToAnalytics = () => {
    // Switch to analytics tab/section and scroll to it after render
    setActiveTab('analytics');
    // Slight delay to allow DOM to render the analytics section
    setTimeout(() => {
      try { analyticsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch {}
    }, 50);
  };

  // If we set fallback leaderboard earlier with 0 XP, update it now with computed points
  useEffect(() => {
    if (leaderboard && leaderboard.leaderboard && leaderboard.leaderboard.length === 1) {
      const only = leaderboard.leaderboard[0];
      if (only && only.name && (only.xp === 0 || typeof only.xp === 'undefined')) {
        setLeaderboard({ leaderboard: [{ name: only.name, xp: points }], me: { rank: 1, xp: points } });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);

  return (
    <div className="min-vh-100">
      {/* Header */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container">
          <Link className="navbar-brand text-decoration-none" to="/">
            <i className="bi bi-clock-history me-2"></i>
            TimeTide
          </Link>
          
          <div className="d-flex align-items-center gap-3">
            {/* Streak badge in navbar (API-driven) */}
            <StreakBadge />
            <Weather />
            
            <button
              type="button"
              className={`btn ${theme === 'dark' ? 'btn-light' : 'btn-dark'} btn-toggle-theme me-2`}
              onClick={toggleTheme}
              aria-label="Toggle theme"
              title="Toggle theme"
            >
              <i className={`bi ${theme === 'dark' ? 'bi-sun' : 'bi-moon'}`}></i>
            </button>

            <div className="dropdown text-end position-relative" ref={accountRef}>
              <button 
                className={`btn ${theme === 'dark' ? 'btn-light' : 'btn-dark'} dropdown-toggle`} 
                type="button"
                onClick={() => setShowAccountMenu((v) => !v)}
                aria-expanded={showAccountMenu}
              >
                <i className="bi bi-person-circle me-1"></i>
                {displayName}
              </button>
              <ul className={`dropdown-menu dropdown-menu-end ${theme === 'dark' ? 'dropdown-menu-dark' : ''} ${showAccountMenu ? 'show' : ''}`} style={{ right: 0, top: 'calc(100% + 8px)' }}>
                <li>
                  <button className="dropdown-item" onClick={handleLogout}>
                    <i className="bi bi-box-arrow-right me-2"></i>
                    Logout
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mt-4">
        {/* Top Row: Timer + Right-side summaries */}
        <div className="row g-4">
          <div className="col-lg-8">
            <Timer user={user} onSessionComplete={loadSessions} sessions={sessions} variant="single" />
          </div>
          <div className="col-lg-4">
            {/* Today's Focus */}
            <div className="card">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="m-0 d-flex align-items-center gap-2"><i className="bi bi-calendar-week"></i> Today's Focus</h5>
                  <button className="btn btn-sm btn-outline-light" onClick={goToAnalytics}>View analytics</button>
                </div>
                <div className="d-flex gap-4">
                  <div>
                    <div className="fs-3">{todaySessions.length}</div>
                    <div className="text-muted small">Sessions</div>
                  </div>
                  <div>
                    <div className="fs-3">{todayTotalTime}</div>
                    <div className="text-muted small">Minutes</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Compact Level/XP card */}
            <div className="card mt-4">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h5 className="m-0 d-flex align-items-center gap-2 position-relative">
                    <i className="bi bi-stars"></i> Level
                    <span
                      className="text-muted small ms-1"
                      aria-label="Points rules"
                      style={{ cursor: 'help' }}
                      onMouseEnter={() => setShowRules(true)}
                      onMouseLeave={() => setShowRules(false)}
                    >
                      <i className="bi bi-question-circle"></i>
                      {showRules && (
                        <div
                          className="card shadow-sm mt-2"
                          style={{ position: 'absolute', top: '100%', left: 0, zIndex: 1000, minWidth: '300px' }}
                          role="tooltip"
                        >
                          <div className="card-body p-3">
                            <div className="fw-semibold mb-2">Points Rules</div>
                            <ul className="m-0 ps-3 small">
                              <li>Work: minimum 5 minutes, 1 point per minute.</li>
                              <li>Break: minimum 3 minutes, 0.2 point per minute.</li>
                              <li>Long break: minimum 10 minutes, 0.5 point per minute.</li>
                              <li>Short start/stop (10–20s) earns 0 points.</li>
                            </ul>
                          </div>
                        </div>
                      )}
                    </span>
                  </h5>
                  <Link className="btn btn-sm btn-outline-light" to="/progress">View progress</Link>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div className="display-6 m-0">{lvl.level}</div>
                  <small className="text-muted">XP: {points}</small>
                </div>
                <div className="progress" style={{ height: 8 }}>
                  <div className="progress-bar" role="progressbar" style={{ width: `${Math.round(lvl.progress * 100)}%` }}></div>
                </div>
              </div>
            </div>

            {/* Compact Leaderboard card */}
            <div className="card mt-4">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h6 className="m-0 d-flex align-items-center gap-2"><i className="bi bi-trophy"></i> Leaderboard</h6>
                {leaderboard.me && <small className="text-muted">You: #{leaderboard.me.rank}</small>}
              </div>
              <div className="card-body">
                <div className="list-group list-group-flush">
                  {(() => {
                    const list = (leaderboard.leaderboard && leaderboard.leaderboard.length > 0)
                      ? leaderboard.leaderboard
                      : (leaderboard.me ? [{ name: displayName, xp: leaderboard.me.xp || points }] : [{ name: displayName, xp: points }]);
                    return list.slice(0,3).map((row, idx) => (
                    <div key={`${row.name}-${idx}`} className="list-group-item d-flex justify-content-between align-items-center px-0">
                      <div className="d-flex align-items-center gap-2">
                        <span className="badge bg-light text-dark">#{idx + 1}</span>
                        <span className="fw-semibold">{row.name}</span>
                      </div>
                      <span className="text-primary small fw-semibold">{row.xp} XP</span>
                    </div>
                    ));
                  })()}
                </div>
                <div className="mt-3 text-end">
                  <Link to="/progress#leaderboard" className="small">View full leaderboard</Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Progress full width */}
        <div className="row g-4 mt-1">
          <div className="col-12">
            <WeeklyProgress sessions={sessions} />
          </div>
        </div>

        {/* Recent Sessions full width */}
        <div className="row g-4 mt-1">
          <div className="col-12">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0 d-flex align-items-center gap-2"><i className="bi bi-clock-history"></i> Recent Sessions</h5>
                <Link className="small" to="#" onClick={(e) => { e.preventDefault(); goToAnalytics(); }}>View analytics</Link>
              </div>
              <div className="card-body">
                {sessions.length === 0 ? (
                  <p className="text-muted mb-0">No sessions yet. Start your first focus session!</p>
                ) : (
                  <div className="list-group list-group-flush">
                    {sessions.slice(0, 10).map((session, index) => (
                      <div key={session._id || index} className="list-group-item">
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="d-flex align-items-center gap-2">
                            <span className={`badge ${session.type === 'break' ? 'bg-success' : 'bg-primary'}`}>{(session.type || 'work').toUpperCase()}</span>
                            <div>
                              <div className="fw-semibold">{session.task || 'Session'}</div>
                              <small className="text-muted">{new Date(session.startTime).toLocaleString()}</small>
                            </div>
                          </div>
                          <div className="text-end">
                            <div className="small text-muted">
                              {(() => { const m = session.duration || 0; return `${m} min`; })()} • <span className="text-primary">+{Math.max(0, session.pointsEarned || 0)} pts</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Tab Content (full filters section) */}
        {activeTab === 'analytics' && (
          <>
            <div className="d-flex justify-content-between align-items-center mt-4 mb-2" ref={analyticsSectionRef} id="analytics-section">
              <h4 className="m-0 d-flex align-items-center gap-2">
                <i className="bi bi-bar-chart"></i> Analytics
              </h4>
              <small className="text-muted">Detailed filters and insights</small>
            </div>
            <div className="row">
              <div className="col-12">
                <Analytics sessions={sessions} />
              </div>
            </div>
          </>
        )}
      </div>
      {/* Floating Focus Assistant */}
      <ChatAssistant user={user} />
    </div>
  );
}

export default Dashboard;