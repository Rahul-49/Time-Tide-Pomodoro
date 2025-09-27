const express = require('express');
const Session = require('../models/Session');
const User = require('../models/User');
const router = express.Router();

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
};

// Create a new session
router.post('/', requireAuth, async (req, res) => {
  try {
    const { type, duration, task } = req.body;
    
    const session = new Session({
      userId: req.session.userId,
      type,
      duration,
      task,
      startTime: new Date()
    });

    await session.save();
    res.status(201).json(session);
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ message: 'Error creating session' });
  }
});

// Complete a session
router.put('/:id/complete', requireAuth, async (req, res) => {
  try {
    const session = await Session.findOne({ 
      _id: req.params.id, 
      userId: req.session.userId 
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    session.completed = true;
    session.endTime = new Date();
    // Update duration (seconds/minutes). Prefer seconds from client; fallback to minutes; else compute.
    const providedSeconds = Number(req.body?.durationSeconds);
    const providedMinutes = Number(req.body?.duration);
    if (!Number.isNaN(providedSeconds) && providedSeconds > 0) {
      session.durationSeconds = Math.floor(providedSeconds);
      session.duration = Math.max(1, Math.round(providedSeconds / 60));
    } else if (!Number.isNaN(providedMinutes) && providedMinutes > 0) {
      session.duration = providedMinutes;
      session.durationSeconds = providedMinutes * 60;
    } else if (session.startTime && session.endTime) {
      const ms = session.endTime - session.startTime;
      const secs = Math.floor(ms / 1000);
      session.durationSeconds = Math.max(1, secs);
      session.duration = Math.max(1, Math.round(secs / 60));
    }
    // Calculate points based on model rules (no daily cap)
    const rawPoints = session.calculatePoints();
    session.pointsEarned = rawPoints;

    await session.save();

    // Update user points and check for level up
    const user = await User.findById(req.session.userId);
    user.points += session.pointsEarned;
    
    // Level curve: progressive (triangular). Total points required to reach level L is STEP * (L-1)*L/2
    const STEP = 100; // base step
    const newLevel = Math.floor((Math.sqrt(1 + 8 * (user.points / STEP)) - 1) / 2) + 1;
    if (newLevel > user.level) {
      user.level = newLevel;
    }

    // Award badges
    const sessionCount = await Session.countDocuments({ 
      userId: req.session.userId, 
      completed: true 
    });

    if (sessionCount === 1 && !user.badges.includes('First Session')) {
      user.badges.push('First Session');
    }

    if (sessionCount >= 10 && !user.badges.includes('Focus Master')) {
      user.badges.push('Focus Master');
    }

    await user.save();

    res.json({ 
      session, 
      user: {
        level: user.level,
        points: user.points,
        badges: user.badges
      },
      meta: {
        rawPoints
      }
    });
  } catch (error) {
    console.error('Complete session error:', error);
    res.status(500).json({ message: 'Error completing session' });
  }
});

// Get user sessions
router.get('/', requireAuth, async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.session.userId })
      .sort({ createdAt: -1 });
    res.json(sessions);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ message: 'Error fetching sessions' });
  }
});

// Get analytics
router.get('/analytics', requireAuth, async (req, res) => {
  try {
    const sessions = await Session.find({ 
      userId: req.session.userId,
      completed: true 
    });

    const totalSessions = sessions.length;
    const totalMinutes = sessions.reduce((sum, session) => sum + session.duration, 0);
    const totalPoints = sessions.reduce((sum, session) => sum + session.pointsEarned, 0);

    // Sessions by type
    const sessionsByType = sessions.reduce((acc, session) => {
      acc[session.type] = (acc[session.type] || 0) + 1;
      return acc;
    }, {});

    // Daily sessions for the last 7 days
    const last7Days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const dailySessions = sessions.filter(session => {
        const sessionDate = new Date(session.startTime);
        return sessionDate >= date && sessionDate < nextDate;
      });

      last7Days.push({
        date: date.toISOString().split('T')[0],
        sessions: dailySessions.length,
        minutes: dailySessions.reduce((sum, s) => sum + s.duration, 0)
      });
    }

    res.json({
      totalSessions,
      totalMinutes,
      totalPoints,
      sessionsByType,
      last7Days,
      averageSessionLength: totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Error fetching analytics' });
  }
});

module.exports = router;