import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSessions, getLeaderboard } from '../services/api';

// Simple XP model: 25 XP per completed Pomodoro (25 minutes of work)
// We treat duration minutes / 25 as number of pomodoros.
const XP_PER_POMODORO = 25;
const levelForXp = (xp) => {
  // Quadratic-ish leveling curve
  // level n requires total_xp >= 100 * n * (n - 1) / 2
  let level = 1;
  let reqForNext = 0;
  while (xp >= (reqForNext = (100 * level * (level - 1)) / 2)) {
    level++;
    if (level > 1000) break;
  }
  const currentLevel = Math.max(1, level - 1);
  const currentReq = (100 * currentLevel * (currentLevel - 1)) / 2;
  const nextReq = (100 * level * (level - 1)) / 2;
  const progress = Math.min(1, (xp - currentReq) / Math.max(1, nextReq - currentReq));
  return { level: currentLevel, progress, currentReq, nextReq };
};

const computeStats = (sessions) => {
  const completed = (sessions || []).filter((s) => s.completed || typeof s.duration === 'number');
  const totalMinutes = completed.reduce((sum, s) => sum + (s.duration || 0), 0);
  const pomodoros = Math.floor(totalMinutes / 25);
  const xp = pomodoros * XP_PER_POMODORO;
  const { level, progress } = levelForXp(xp);

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday as start
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekPomodoros = completed
    .filter((s) => new Date(s.startTime) >= startOfWeek)
    .reduce((acc, s) => acc + Math.floor((s.duration || 0) / 25), 0);
  const monthPomodoros = completed
    .filter((s) => new Date(s.startTime) >= startOfMonth)
    .reduce((acc, s) => acc + Math.floor((s.duration || 0) / 25), 0);

  return { completed, totalMinutes, pomodoros, xp, level, progress, weekPomodoros, monthPomodoros };
};

const buildChallenges = ({ weekPomodoros, monthPomodoros }) => {
  return [
    {
      id: 'challenge-week-25',
      title: 'Weekly Streak',
      desc: 'Complete 25 Pomodoros this week',
      target: 25,
      current: weekPomodoros,
    },
    {
      id: 'challenge-month-50',
      title: 'Monthly Marathon',
      desc: 'Complete 50 Pomodoros this month',
      target: 50,
      current: monthPomodoros,
    },
  ];
};

const evaluateAchievements = (sessions) => {
  const completed = (sessions || []).filter((s) => s.completed || typeof s.duration === 'number');
  const totalPomodoros = Math.floor(completed.reduce((sum, s) => sum + (s.duration || 0), 0) / 25);

  // Zen Master: Completed 25 pomodoros without skipping breaks (approximation)
  // We approximate by checking there are at least 25 sessions with type 'work' and interleaved 'break' entries.
  const workSessions = completed.filter((s) => (s.type || 'work') === 'work');
  const breakSessions = completed.filter((s) => (s.type || '') === 'break');
  const zenMaster = workSessions.length >= 25 && breakSessions.length >= 20; // heuristic

  // Lightning Focus: 3 pomodoros within 2 hours (no delay)
  const sorted = [...completed].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  let lightning = false;
  for (let i = 0; i < sorted.length - 2; i++) {
    const a = new Date(sorted[i].startTime);
    const c = new Date(sorted[i + 2].startTime);
    const diffHours = (c - a) / (1000 * 60 * 60);
    if (diffHours <= 2) { lightning = true; break; }
  }

  // Collector: unlock badges for milestone counts
  const milestones = [5, 25, 50, 100, 200];
  const collectorBadges = milestones.filter((m) => totalPomodoros >= m).map((m) => `x${m}`);

  const achievements = [
    { id: 'zen-master', name: 'Zen Master', unlocked: zenMaster, desc: 'Completed 25 Pomodoros without skipping breaks.' },
    { id: 'lightning-focus', name: 'Lightning Focus', unlocked: lightning, desc: 'Finished 3 Pomodoros in under 2 hours with no delay.' },
    { id: 'collector', name: 'Collector', unlocked: collectorBadges.length > 0, desc: `Badges earned: ${collectorBadges.join(', ') || 'None'}` },
  ];

  return { achievements, collectorBadges, totalPomodoros };
};

const fakeLeaderboard = (user, xp) => {
  const selfName = user?.firstName || user?.username || (user?.email ? user.email.split('@')[0] : 'You');
  // Load or generate local leaderboard
  const stored = JSON.parse(localStorage.getItem('tt_leaderboard') || 'null');
  let board = stored;
  if (!board) {
    board = [
      { name: 'Astra', xp: 2300 },
      { name: 'Blaze', xp: 1800 },
      { name: 'Nova', xp: 1500 },
      { name: 'Echo', xp: 1200 },
    ];
  }
  // Update self entry
  const idx = board.findIndex((b) => b.name === selfName);
  if (idx >= 0) board[idx].xp = xp; else board.push({ name: selfName, xp });
  // Sort desc and persist
  board.sort((a, b) => b.xp - a.xp);
  localStorage.setItem('tt_leaderboard', JSON.stringify(board));
  return board.slice(0, 10);
};

function Progress({ user }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getSessions();
        setSessions(Array.isArray(data) ? data : []);
      } catch (e) {
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const stats = useMemo(() => computeStats(sessions), [sessions]);
  const challenges = useMemo(() => buildChallenges(stats), [stats]);
  const { achievements, collectorBadges } = useMemo(() => evaluateAchievements(sessions), [sessions]);
  const [leaderboardData, setLeaderboardData] = useState({ leaderboard: [], me: null });

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const data = await getLeaderboard();
        setLeaderboardData(data);
      } catch (e) {
        // Fallback to local if API fails
        setLeaderboardData({ leaderboard: fakeLeaderboard(user, stats.xp), me: null });
      }
    };
    loadLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, stats.xp]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-5">
        <h2 className="m-0 d-flex align-items-center gap-2"><i className="bi bi-trophy"></i> Progress & Achievements</h2>
        <Link to="/dashboard" className="btn btn-light">Back to Dashboard</Link>
      </div>

      {/* Level & XP */}
      <div className="row g-4 mb-5">
        <div className="col-lg-4">
          <div className="card h-100">
            <div className="card-body pt-4 pb-4">
              <h5 className="card-title">Level</h5>
              <div className="display-5 fw-bold">{stats.level}</div>
              <div className="text-muted">XP: {stats.xp}</div>
              <div className="progress mt-3" style={{ height: 10 }}>
                <div className="progress-bar" role="progressbar" style={{ width: `${Math.round(stats.progress * 100)}%` }} aria-valuenow={Math.round(stats.progress * 100)} aria-valuemin="0" aria-valuemax="100"></div>
              </div>
              <small className="text-muted">Progress to next level</small>
            </div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="card h-100">
            <div className="card-body pt-4 pb-4">
              <h5 className="card-title">Rewards</h5>
              <ul className="list-unstyled mb-0 d-flex flex-column gap-2">
                <li>• Unlock backgrounds at Level 5</li>
                <li>• Unlock themes at Level 10</li>
                <li>• Unlock focus sounds at Level 15</li>
                <li>• Unlock avatars at Level 20</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="card h-100">
            <div className="card-body pt-4 pb-4">
              <h5 className="card-title">Trophy Case</h5>
              {collectorBadges.length === 0 ? (
                <p className="text-muted mb-0">No badges yet. Keep focusing!</p>
              ) : (
                <div className="d-flex flex-wrap gap-2 mt-2">
                  {collectorBadges.map((b) => (
                    <span key={b} className="badge bg-primary">{b}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Challenges & Achievements */}
      <div className="row g-4 mb-5">
        <div className="col-lg-6">
          <div className="card h-100">
            <div className="card-header"><strong>Challenges</strong></div>
            <div className="card-body pt-4 pb-4">
              {challenges.map((ch) => (
                <div key={ch.id} className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <div>
                      <div className="fw-semibold">{ch.title}</div>
                      <small className="text-muted">{ch.desc}</small>
                    </div>
                    <div className="small text-muted">{Math.min(ch.current, ch.target)} / {ch.target}</div>
                  </div>
                  <div className="progress" style={{ height: 8 }}>
                    <div className="progress-bar" role="progressbar" style={{ width: `${Math.min(100, (ch.current / ch.target) * 100)}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card h-100">
            <div className="card-header"><strong>Achievements</strong></div>
            <div className="card-body pt-4 pb-4">
              {achievements.map((a) => (
                <div key={a.id} className="d-flex justify-content-between align-items-start mb-4">
                  <div>
                    <div className="fw-semibold d-flex align-items-center gap-2">
                      <i className={`bi ${a.unlocked ? 'bi-award' : 'bi-award'} ${a.unlocked ? 'text-primary' : 'text-muted'}`}></i>
                      {a.name}
                    </div>
                    <small className="text-muted">{a.desc}</small>
                  </div>
                  <span className={`badge ${a.unlocked ? 'bg-success' : 'bg-light text-dark'}`}>{a.unlocked ? 'Unlocked' : 'Locked'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="row g-4 mb-5">
        <div className="col-12">
          <div className="card" id="leaderboard">
            <div className="card-header d-flex justify-content-between align-items-center">
              <strong>Leaderboard</strong>
              {leaderboardData.me && (
                <small className="text-muted">My Rank: #{leaderboardData.me.rank} • {leaderboardData.me.xp} XP</small>
              )}
            </div>
            <div className="card-body pt-4 pb-4">
              <div className="list-group list-group-flush">
                {(leaderboardData.leaderboard || []).map((row, idx) => (
                  <div key={`${row.name}-${idx}`} className="list-group-item d-flex justify-content-between align-items-center py-3">
                    <div className="d-flex align-items-center gap-3">
                      <span className="badge bg-light text-dark">#{idx + 1}</span>
                      <span className="fw-semibold">{row.name}</span>
                    </div>
                    <span className="text-primary fw-semibold">{row.xp} XP</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Progress;
