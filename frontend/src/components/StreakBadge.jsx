import React, { useEffect, useState } from 'react';
import { getSessions } from '../services/api';

// Navbar streak badge that fetches current streak from API and shows a realistic flame
function StreakBadge() {
  const [streak, setStreak] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Local fallback: compute consecutive-day streak from sessions
  const computeLocalStreak = (sessions) => {
    try {
      if (!Array.isArray(sessions) || sessions.length === 0) return 0;
      const daySet = new Set();
      sessions.forEach(s => {
        const t = s.startTime ? new Date(s.startTime) : null;
        if (!t || isNaN(t)) return;
        const d = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()));
        daySet.add(d.toISOString().slice(0, 10));
      });
      let count = 0;
      let cur = new Date();
      const keyOf = (dt) => {
        const du = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
        return du.toISOString().slice(0, 10);
      };
      // Count consecutive days back from today
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
  };

  const fetchStreak = async () => {
    try {
      setLoading(true);
      setError(null);
      const sessions = await getSessions();
      const local = computeLocalStreak(sessions);
      setStreak(local);
    } catch (e) {
      setStreak(0);
      setError('fallback-0');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStreak();
    const id = setInterval(fetchStreak, 60 * 1000); // refresh every minute
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="d-flex align-items-center gap-2" title="Current streak of active days" aria-label="Current streak">
      <style>{`
        /* More realistic flame dance: subtle jitter, scale and hue/glow variance */
        @keyframes flameDance {
          0%   { transform: translateY(0px) rotate(0deg) scale(1); filter: drop-shadow(0 0 4px rgba(255, 170, 0, 0.75)); opacity: 0.95; }
          10%  { transform: translateY(-0.5px) rotate(-1deg) scale(1.02); filter: drop-shadow(0 0 7px rgba(255, 180, 0, 0.9)); }
          20%  { transform: translateY(-1px) rotate(0.8deg) scale(1.04); filter: drop-shadow(0 0 6px rgba(255, 140, 0, 0.85)); }
          30%  { transform: translateY(-0.3px) rotate(-0.6deg) scale(1.01); filter: drop-shadow(0 0 5px rgba(255, 200, 0, 0.95)); }
          40%  { transform: translateY(-1.2px) rotate(0.4deg) scale(1.05); filter: drop-shadow(0 0 8px rgba(255, 120, 0, 1)); }
          50%  { transform: translateY(-0.6px) rotate(-0.2deg) scale(1.03); filter: drop-shadow(0 0 7px rgba(255, 160, 0, 0.95)); }
          60%  { transform: translateY(-1px) rotate(0.6deg) scale(1.04); filter: drop-shadow(0 0 6px rgba(255, 130, 0, 0.9)); }
          70%  { transform: translateY(-0.2px) rotate(-0.8deg) scale(1.02); filter: drop-shadow(0 0 5px rgba(255, 190, 0, 0.9)); }
          80%  { transform: translateY(-1.1px) rotate(0.3deg) scale(1.05); filter: drop-shadow(0 0 8px rgba(255, 110, 0, 1)); }
          90%  { transform: translateY(-0.4px) rotate(-0.4deg) scale(1.02); filter: drop-shadow(0 0 6px rgba(255, 170, 0, 0.95)); }
          100% { transform: translateY(0px) rotate(0deg) scale(1); filter: drop-shadow(0 0 4px rgba(255, 170, 0, 0.75)); opacity: 0.95; }
        }
        @keyframes haloWaver {
          0%   { transform: scale(0.95); opacity: 0.75; }
          50%  { transform: scale(1.02); opacity: 0.95; }
          100% { transform: scale(0.95); opacity: 0.75; }
        }
        .streak-badge-inline {
          font-size: 1.1rem;
          padding: 0.35rem 0.6rem;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
        }
        .streak-fire {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .streak-fire::before {
          content: '';
          position: absolute;
          width: 1.6rem;
          height: 1.6rem;
          border-radius: 999px;
          background: radial-gradient(closest-side, rgba(255,210,0,0.95), rgba(255,150,0,0.55), rgba(255,80,0,0.22) 70%, transparent 80%);
          filter: blur(2px);
          animation: haloWaver 1.6s ease-in-out infinite;
          z-index: 0;
        }
        .streak-emoji {
          font-size: 1.4rem;
          line-height: 1;
          animation: flameDance 1.3s ease-in-out infinite;
          text-shadow: 0 0 5px rgba(255, 200, 0, 1), 0 0 11px rgba(255, 120, 0, 0.95), 0 0 18px rgba(255, 80, 0, 0.85);
          filter: drop-shadow(0 0 4px rgba(255, 160, 0, 0.9));
          z-index: 1;
        }
        /* Theme-specific adjustments for legibility */
        [data-theme="light"] .streak-badge-inline { background: rgba(0,0,0,.06); color: #111; }
        [data-theme="dark"] .streak-badge-inline { background: rgba(255,255,255,.08); color: #fff; }
      `}</style>
      <span className="badge streak-badge-inline">
        {loading ? '…' : `${typeof streak === 'number' ? streak : 0}d`}
        <span className="streak-fire">
          <span className="streak-emoji" role="img" aria-label="fire">🔥</span>
        </span>
      </span>
    </div>
  );
}

export default StreakBadge;
