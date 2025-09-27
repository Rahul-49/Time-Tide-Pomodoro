const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const User = require('../models/User');

// Auth middleware
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
};

// Helpers
const computeProgress = async (userId) => {
  const sessions = await Session.find({ userId, completed: true }).lean();
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  const pomodoros = Math.floor(totalMinutes / 25);

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  startOfWeek.setHours(0,0,0,0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const weekPomodoros = sessions
    .filter(s => new Date(s.startTime) >= startOfWeek)
    .reduce((acc, s) => acc + Math.floor((s.duration || 0)/25), 0);
  const monthPomodoros = sessions
    .filter(s => new Date(s.startTime) >= startOfMonth)
    .reduce((acc, s) => acc + Math.floor((s.duration || 0)/25), 0);

  // Achievements
  const workCount = sessions.filter(s => (s.type || 'work') === 'work').length;
  const breakCount = sessions.filter(s => (s.type || '') === 'break').length;
  const zenMaster = workCount >= 25 && breakCount >= 20;

  const sorted = [...sessions].sort((a,b) => new Date(a.startTime) - new Date(b.startTime));
  let lightning = false;
  for (let i = 0; i < sorted.length - 2; i++) {
    const a = new Date(sorted[i].startTime);
    const c = new Date(sorted[i+2].startTime);
    if ((c - a) / (1000*60*60) <= 2) { lightning = true; break; }
  }

  const milestones = [5,25,50,100];
  const collectorBadges = milestones.filter(m => pomodoros >= m).map(m => `Collector x${m}`);

  // Early Bird / Night Owl (5 sessions in time windows)
  const earlyBird = sessions.filter(s => {
    const h = new Date(s.startTime).getHours();
    return h >= 5 && h < 7 && (s.type||'work')==='work';
  }).length >= 5;
  const nightOwl = sessions.filter(s => {
    const h = new Date(s.startTime).getHours();
    return (h >= 23 || h < 2) && (s.type||'work')==='work';
  }).length >= 5;

  // Streak Champion: at least one completed session on 7 consecutive days
  const byDay = new Set(sessions.map(s => { const d=new Date(s.startTime); d.setHours(0,0,0,0); return d.getTime(); }));
  let streakChampion = false;
  if (byDay.size>0) {
    const days = Array.from(byDay).sort();
    let streak=1;
    for (let i=1;i<days.length;i++) {
      if (days[i]-days[i-1] === 24*60*60*1000) { streak++; if (streak>=7) { streakChampion=true; break; } }
      else { streak=1; }
    }
  }

  const achievements = [
    { id: 'zen-master', name: 'Zen Master', unlocked: zenMaster, xpReward: 100 },
    { id: 'lightning-focus', name: 'Lightning Focus', unlocked: lightning, xpReward: 75 },
    { id: 'early-bird', name: 'Early Bird', unlocked: earlyBird, xpReward: 50 },
    { id: 'night-owl', name: 'Night Owl', unlocked: nightOwl, xpReward: 50 },
    { id: 'streak-champion', name: 'Streak Champion', unlocked: streakChampion, xpReward: 150 },
    ...collectorBadges.map(b => ({ id: b.toLowerCase().replace(/\s+/g,'-'), name: b, unlocked: true, xpReward: ({'Collector x5':25,'Collector x25':100,'Collector x50':250,'Collector x100':500}[b]||0) }))
  ];

  // Challenges
  const challenges = [
    { id: 'weekly-streak', title: 'Weekly Streak', desc: 'Complete 25 Pomodoros this week', target: 25, current: weekPomodoros, xpReward: 50 },
    { id: 'monthly-marathon', title: 'Monthly Marathon', desc: 'Complete 50 Pomodoros this month', target: 50, current: monthPomodoros, xpReward: 150 },
    { id: 'daily-sprint', title: 'Daily Sprint', desc: 'Complete 10 Pomodoros in a day', target: 10, current: (()=>{ const today=new Date(); today.setHours(0,0,0,0); const next=new Date(today); next.setDate(today.getDate()+1); return sessions.filter(s=> s.completed && new Date(s.startTime)>=today && new Date(s.startTime)<next).reduce((a,s)=>a+Math.floor((s.duration||0)/25),0); })(), xpReward: 60 },
    { id: 'focus-enthusiast', title: 'Focus Enthusiast', desc: 'Reach 200 total Pomodoros', target: 200, current: pomodoros, xpReward: 400 },
  ];

  return { totalMinutes, pomodoros, weekPomodoros, monthPomodoros, achievements, challenges };
};

// GET /api/progress -> compute and return (does not mutate)
router.get('/', requireAuth, async (req, res) => {
  try {
    const data = await computeProgress(req.session.userId);
    const user = await User.findById(req.session.userId).lean();
    const badges = user?.badges || [];
    // Mark unlocked if present in user.badges
    const withPersisted = data.achievements.map(a => ({
      ...a,
      unlocked: a.unlocked || badges.includes(a.name),
    }));
    res.json({ ...data, achievements: withPersisted, badges });
  } catch (e) {
    console.error('Progress error:', e);
    res.status(500).json({ message: 'Error computing progress' });
  }
});

// POST /api/progress/sync -> persist newly unlocked achievements to user.badges
router.post('/sync', requireAuth, async (req, res) => {
  try {
    const data = await computeProgress(req.session.userId);
    const user = await User.findById(req.session.userId);
    const have = new Set(user.badges || []);
    const toAdd = [];
    let xpGain = 0;

    // Base achievements
    if (data.achievements) {
      data.achievements.forEach(a => {
        if (a.unlocked && !have.has(a.name)) {
          have.add(a.name);
          toAdd.push(a.name);
          xpGain += a.xpReward || 0;
        }
      });
    }

    // Challenges as badges when completed
    data.challenges.forEach(c => {
      const badgeName = c.title; // e.g., 'Weekly Streak'
      if (c.current >= c.target && !have.has(badgeName)) {
        have.add(badgeName);
        toAdd.push(badgeName);
        xpGain += c.xpReward || 0;
      }
    });

    if (toAdd.length > 0) {
      user.badges = Array.from(have);
      // Apply XP to points and handle level up (every 100 points -> +1 level)
      user.points = (user.points || 0) + xpGain;
      const newLevel = Math.floor(user.points / 100) + 1;
      if (newLevel > (user.level || 1)) user.level = newLevel;
      await user.save();
    }

    res.json({ updated: toAdd, badges: user.badges, xpGain, points: user.points, level: user.level });
  } catch (e) {
    console.error('Progress sync error:', e);
    res.status(500).json({ message: 'Error syncing progress' });
  }
});

module.exports = router;
